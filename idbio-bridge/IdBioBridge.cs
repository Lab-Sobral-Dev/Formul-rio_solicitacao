using System;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using ControliD;

namespace IdBioBridge
{
    internal static class Program
    {
        private static readonly object DeviceLock = new object();
        private static BridgeConfig Config;

        private static void Main()
        {
            Config = BridgeConfig.Load();

            var listener = new TcpListener(IPAddress.Loopback, Config.HttpPort);
            listener.Start();
            Console.WriteLine("iDBio bridge listening on http://127.0.0.1:" + Config.HttpPort);
            Console.WriteLine("iDBio serial port: " + Config.DevicePort);

            while (true)
            {
                var client = listener.AcceptTcpClient();
                ThreadPool.QueueUserWorkItem(_ => HandleClient(client));
            }
        }

        private static void HandleClient(TcpClient client)
        {
            try
            {
                using (client)
                using (var stream = client.GetStream())
                using (var reader = new StreamReader(stream, Encoding.ASCII))
                {
                    client.ReceiveTimeout = 1000;
                    var requestLine = reader.ReadLine();
                    if (string.IsNullOrWhiteSpace(requestLine))
                    {
                        return;
                    }

                    while (true)
                    {
                        try
                        {
                            if (string.IsNullOrEmpty(reader.ReadLine()))
                            {
                                break;
                            }
                        }
                        catch (IOException)
                        {
                            break;
                        }
                    }

                    var parts = requestLine.Split(' ');
                    var method = parts.Length > 0 ? parts[0] : "GET";
                    var path = parts.Length > 1 ? parts[1] : "/";

                    if (method == "OPTIONS")
                    {
                        WriteJson(stream, 200, "{\"ok\":true}");
                        return;
                    }

                    if (path.StartsWith("/health", StringComparison.OrdinalIgnoreCase))
                    {
                        WriteJson(stream, 200, "{\"ok\":true,\"device\":\"iDBio\",\"serialPort\":\"" + Escape(Config.DevicePort) + "\",\"httpPort\":" + Config.HttpPort + ",\"adminIds\":[" + Config.AdminIdsJson() + "]}");
                        return;
                    }

                    if (path.StartsWith("/register", StringComparison.OrdinalIgnoreCase))
                    {
                        var result = RegisterAdminFingerprint();
                        WriteResult(stream, result);
                        return;
                    }

                    if (path.StartsWith("/verify", StringComparison.OrdinalIgnoreCase))
                    {
                        var result = VerifyCoordinator();
                        WriteResult(stream, result);
                        return;
                    }

                    WriteJson(stream, 404, "{\"ok\":false,\"message\":\"Rota nao encontrada.\"}");
                }
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(DateTime.Now.ToString("s") + " client error: " + ex.Message);
            }
        }

        private static BridgeResult VerifyCoordinator()
        {
            lock (DeviceLock)
            {
                var init = StartDevice();
                if (!init.Success) return init;

                try
                {
                    long id;
                    int score;
                    int quality;
                    var ret = new CIDBio().CaptureAndIdentify(out id, out score, out quality);
                    if (ret < RetCode.SUCCESS)
                    {
                        return BridgeResult.Fail(CIDBio.GetErrorMessage(ret) + " Qualidade: " + quality + ".");
                    }

                    if (!Config.IsAdmin(id))
                    {
                        return BridgeResult.Fail("Digital identificada, mas nao esta cadastrada como admin.");
                    }

                    return BridgeResult.Ok("Digital validada.", ",\"id\":" + id + ",\"score\":" + score + ",\"quality\":" + quality);
                }
                finally
                {
                    CIDBio.Terminate();
                }
            }
        }

        private static BridgeResult RegisterAdminFingerprint()
        {
            return WithDevice(
                device => device.CaptureAndEnroll(Config.EnrollAdminId),
                "Digital admin cadastrada no leitor.",
                "Digital ja cadastrada no leitor. Use Liberar RH para validar o acesso."
            );
        }

        private static BridgeResult WithDevice(Func<CIDBio, RetCode> action, string successMessage, string duplicateMessage = "")
        {
            lock (DeviceLock)
            {
                var init = StartDevice();
                if (!init.Success) return init;

                try
                {
                    var ret = action(new CIDBio());
                    if (ret < RetCode.SUCCESS)
                    {
                        var message = CIDBio.GetErrorMessage(ret);
                        if (IsDuplicateTemplateMessage(message) && !string.IsNullOrEmpty(duplicateMessage))
                        {
                            return BridgeResult.Ok(duplicateMessage);
                        }

                        return BridgeResult.Fail(message);
                    }

                    return BridgeResult.Ok(successMessage);
                }
                finally
                {
                    CIDBio.Terminate();
                }
            }
        }

        private static bool IsDuplicateTemplateMessage(string message)
        {
            return !string.IsNullOrEmpty(message)
                && message.IndexOf("already", StringComparison.OrdinalIgnoreCase) >= 0
                && message.IndexOf("device database", StringComparison.OrdinalIgnoreCase) >= 0;
        }

        private static BridgeResult StartDevice()
        {
            var port = CIDBio.SetSerialCommPort(Config.DevicePort);
            if (port < RetCode.SUCCESS)
            {
                return BridgeResult.Fail("Erro ao selecionar " + Config.DevicePort + ": " + CIDBio.GetErrorMessage(port));
            }

            var init = CIDBio.Init();
            if (init < RetCode.SUCCESS)
            {
                return BridgeResult.Fail("Erro ao iniciar iDBio em " + Config.DevicePort + ": " + CIDBio.GetErrorMessage(init));
            }

            return BridgeResult.Ok("Leitor iniciado.");
        }

        private static void WriteResult(NetworkStream stream, BridgeResult result)
        {
            var status = result.Success ? 200 : 500;
            WriteJson(stream, status, result.ToJson());
        }

        private static void WriteJson(NetworkStream stream, int status, string body)
        {
            var statusText = status == 200 ? "OK" : status == 404 ? "Not Found" : "Error";
            var bytes = Encoding.UTF8.GetBytes(body);
            var headers =
                "HTTP/1.1 " + status + " " + statusText + "\r\n" +
                "Content-Type: application/json; charset=utf-8\r\n" +
                "Access-Control-Allow-Origin: *\r\n" +
                "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n" +
                "Access-Control-Allow-Headers: Content-Type\r\n" +
                "Content-Length: " + bytes.Length + "\r\n" +
                "Connection: close\r\n\r\n";
            var headerBytes = Encoding.ASCII.GetBytes(headers);
            stream.Write(headerBytes, 0, headerBytes.Length);
            stream.Write(bytes, 0, bytes.Length);
        }

        private static string Escape(string value)
        {
            return (value ?? "").Replace("\\", "\\\\").Replace("\"", "\\\"");
        }
    }

    internal sealed class BridgeConfig
    {
        public int HttpPort { get; private set; }
        public string DevicePort { get; private set; }
        public long EnrollAdminId { get; private set; }
        public long[] AdminIds { get; private set; }

        public static BridgeConfig Load()
        {
            var config = new BridgeConfig
            {
                HttpPort = 5055,
                DevicePort = "COM3",
                EnrollAdminId = 1,
                AdminIds = new long[] { 1 }
            };

            var path = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "config.json");
            if (!File.Exists(path))
            {
                return config;
            }

            var json = File.ReadAllText(path);
            config.DevicePort = ReadString(json, "devicePort", config.DevicePort);
            config.HttpPort = ReadInt(json, "httpPort", config.HttpPort);
            config.EnrollAdminId = ReadLong(json, "enrollAdminId", ReadLong(json, "coordinatorId", config.EnrollAdminId));
            config.AdminIds = ReadLongArray(json, "adminIds", config.AdminIds);
            return config;
        }

        public bool IsAdmin(long id)
        {
            foreach (var adminId in AdminIds)
            {
                if (adminId == id)
                {
                    return true;
                }
            }

            return false;
        }

        public string AdminIdsJson()
        {
            return string.Join(",", Array.ConvertAll(AdminIds, id => id.ToString()));
        }

        private static string ReadString(string json, string key, string fallback)
        {
            var match = Regex.Match(json, "\"" + key + "\"\\s*:\\s*\"([^\"]+)\"", RegexOptions.IgnoreCase);
            return match.Success ? match.Groups[1].Value : fallback;
        }

        private static int ReadInt(string json, string key, int fallback)
        {
            var match = Regex.Match(json, "\"" + key + "\"\\s*:\\s*(\\d+)", RegexOptions.IgnoreCase);
            int value;
            return match.Success && int.TryParse(match.Groups[1].Value, out value) ? value : fallback;
        }

        private static long ReadLong(string json, string key, long fallback)
        {
            var match = Regex.Match(json, "\"" + key + "\"\\s*:\\s*(\\d+)", RegexOptions.IgnoreCase);
            long value;
            return match.Success && long.TryParse(match.Groups[1].Value, out value) ? value : fallback;
        }

        private static long[] ReadLongArray(string json, string key, long[] fallback)
        {
            var match = Regex.Match(json, "\"" + key + "\"\\s*:\\s*\\[([^\\]]*)\\]", RegexOptions.IgnoreCase);
            if (!match.Success)
            {
                return fallback;
            }

            var matches = Regex.Matches(match.Groups[1].Value, "\\d+");
            if (matches.Count == 0)
            {
                return fallback;
            }

            var values = new long[matches.Count];
            for (var i = 0; i < matches.Count; i++)
            {
                long.TryParse(matches[i].Value, out values[i]);
            }

            return values;
        }
    }

    internal sealed class BridgeResult
    {
        public bool Success { get; private set; }
        public string Message { get; private set; }
        public string ExtraJson { get; private set; }

        public static BridgeResult Ok(string message, string extraJson = "")
        {
            return new BridgeResult { Success = true, Message = message, ExtraJson = extraJson };
        }

        public static BridgeResult Fail(string message)
        {
            return new BridgeResult { Success = false, Message = message, ExtraJson = "" };
        }

        public string ToJson()
        {
            return "{\"ok\":" + (Success ? "true" : "false") + ",\"message\":\"" + Escape(Message) + "\"" + ExtraJson + "}";
        }

        private static string Escape(string value)
        {
            return (value ?? "").Replace("\\", "\\\\").Replace("\"", "\\\"");
        }
    }
}
