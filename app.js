const RH_ACCESS_KEY = "rhCoordinatorFingerprint";
const API_TOKEN_KEY = "rhSobralApiToken";
const THEME_KEY = "rhSobralTheme";
const IDBIO_BRIDGE_URL = "http://127.0.0.1:5055";
const RH_EMAIL = "rh@empresa.com.br";

const loginForm = document.querySelector("#loginForm");
const loginError = document.querySelector("#loginError");
const loginUsername = document.querySelector("#loginUsername");
const loginPassword = document.querySelector("#loginPassword");
const loginSubmit = document.querySelector("#loginSubmit");
const loginBiometricButton = document.querySelector("#loginBiometricButton");
const loginBiometricStatus = document.querySelector("#loginBiometricStatus");
const passwordToggle = document.querySelector("#passwordToggle");
const capsLockWarning = document.querySelector("#capsLockWarning");
const userHintButton = document.querySelector("#userHintButton");
const userHintTooltip = document.querySelector("#userHintTooltip");
const tabTriggers = document.querySelectorAll("[data-tab-target]");
const tabPanels = document.querySelectorAll(".tab-panel");
const form = document.querySelector("#requestForm");
const recordsList = document.querySelector("#recordsList");
const template = document.querySelector("#recordTemplate");
const syncControlId = document.querySelector("#syncControlId");
const controlIdText = document.querySelector("#controlIdText");
const clockStatus = document.querySelector("#clockStatus");
const requestId = document.querySelector("#requestId");
const departmentFilter = document.querySelector("#departmentFilter");
const employeeFilter = document.querySelector("#employeeFilter");
const clearStorage = document.querySelector("#clearStorage");
const logoutButton = document.querySelector("#logoutButton");
const rhLock = document.querySelector("#rhLock");
const rhPanelContent = document.querySelector("#rhPanelContent");
const rhPanelExitButton = document.querySelector("#rhPanelExitButton");
const rhTab = document.querySelector("#painel-rh");
const rhNavItem = document.querySelector('[data-tab-target="painel-rh"]');
const rhRegisterFingerprintButtons = document.querySelectorAll("[data-register-fingerprint]");
const rhLockStatus = document.querySelector("#rhLockStatus");
const employeeRegistryForm = document.querySelector("#employeeRegistryForm");
const employeeRegistryStatus = document.querySelector("#employeeRegistryStatus");
const employeeRegistryList = document.querySelector("#employeeRegistryList");
const monthCount = document.querySelector("#monthCount");
const semesterCount = document.querySelector("#semesterCount");
const yearCount = document.querySelector("#yearCount");
const saveStatus = document.querySelector("#saveStatus");
const employeeIdInput = document.querySelector("#employeeIdInput");
const lookupStatus = document.querySelector("#lookupStatus");
const returnStatusInputs = document.querySelectorAll('[name="returnStatus"]');
const returnTimeCard = document.querySelector("#returnTimeCard");
const returnTimeInput = document.querySelector('[name="returnTime"]');
const rqSection = document.querySelector("#rqSection");
const stepEmployee = document.querySelector("#stepEmployee");
const stepRequest = document.querySelector("#stepRequest");
const controlMetric = document.querySelector("#controlMetric");
const sidebar = document.querySelector(".sidebar");
const sidebarToggle = document.querySelector(".sb-toggle");
const themeToggle = document.querySelector("#themeToggle");
const departmentOptions = document.querySelector("#departmentOptions");

const DEPARTMENTS = [
  "Presidência",
  "Diretoria Administrativa Financeira",
  "Administrativo",
  "Diretoria de Operações",
  "Gerência Administrativa Financeira",
  "Gerência de Operações",
  "Recepção",
  "Recursos Humanos",
  "Financeiro",
  "Tecnologia da Informação",
  "Marketing",
  "Contabilidade",
  "Manutenção",
  "Suprimentos",
  "SESMT/Serviços Gerais",
  "Logística de Expedição — Almoxarifado PA",
  "Logística de Recebimento — Almoxarifado MP/ME",
  "Validação",
  "Sistema da Qualidade — CQ",
  "Sistema da Qualidade — SAC",
  "Sistema da Qualidade — Departamento Técnico",
  "Produção — Suplementos/Cosméticos",
  "Produção — Encartuchamento",
  "Produção — Suplemento Sólidos/Embalagem",
  "Produção — Suplemento Sólidos/Blisteragem",
  "Produção — Suplemento Sólidos/Compressão",
  "Comercial — Teresina/PI",
  "Guarita"
];

const DEFAULT_EMPLOYEES_BY_ID = {
  "1024": {
    employeeName: "Maria Santos",
    department: "Producao",
    role: "Operadora de Producao",
    managerName: "Carlos Almeida",
    registeredSchedule: "07:00 as 11:00 e 12:00 as 16:48"
  },
  "1088": {
    employeeName: "Joao Pereira",
    department: "Logistica",
    role: "Auxiliar de Logistica",
    managerName: "Patricia Souza",
    registeredSchedule: "08:00 as 12:00 e 13:00 as 17:48"
  },
  "1170": {
    employeeName: "Ana Oliveira",
    department: "Administrativo",
    role: "Assistente Administrativo",
    managerName: "Renata Lima",
    registeredSchedule: "08:00 as 12:00 e 13:12 as 18:00"
  }
};

let controlIdTime = "";
let isSaving = false;
let isBiometricReading = false;
let activeTabId = document.querySelector(".tab-panel.active")?.id || "nova-solicitacao";
let apiToken = sessionStorage.getItem(API_TOKEN_KEY) || "";
let employeesCache = { ...DEFAULT_EMPLOYEES_BY_ID };
let recordsCache = [];
let autoLoginFingerprintTimer = 0;

function applyTheme(theme) {
  const isDark = theme === "dark";
  document.body.classList.toggle("dark-theme", isDark);
  themeToggle.textContent = isDark ? "Tema claro" : "Tema escuro";
  themeToggle.setAttribute("aria-pressed", String(isDark));
}

function toggleTheme() {
  const nextTheme = document.body.classList.contains("dark-theme") ? "light" : "dark";
  localStorage.setItem(THEME_KEY, nextTheme);
  applyTheme(nextTheme);
}

function unlockApp() {
  document.body.classList.remove("login-locked");
  clearAutoLoginFingerprint();
}

function lockApp() {
  document.body.classList.add("login-locked");
  scheduleAutoLoginFingerprint();
}

function isAuthenticated() {
  return Boolean(apiToken);
}

async function setAuthenticated(token) {
  apiToken = token;
  sessionStorage.setItem(API_TOKEN_KEY, token);
  loginError.classList.remove("visible");
  await refreshEmployees();
  populateDepartmentOptions();
  unlockApp();
}

async function logout() {
  if (apiToken) {
    try {
      await apiRequest("/logout", { method: "POST" });
    } catch (error) {
      // The local session is cleared even if the bridge is already closed.
    }
  }
  apiToken = "";
  sessionStorage.removeItem(API_TOKEN_KEY);
  sessionStorage.removeItem(RH_ACCESS_KEY);
  loginForm.reset();
  loginError.textContent = "";
  loginError.classList.remove("visible");
  syncLoginSubmit();
  lockRhPanel();
  lockApp();
}

function syncLoginSubmit() {
  loginSubmit.disabled = !loginUsername.value.trim() || !loginPassword.value;
}

function clearAutoLoginFingerprint() {
  if (!autoLoginFingerprintTimer) return;
  window.clearTimeout(autoLoginFingerprintTimer);
  autoLoginFingerprintTimer = 0;
}

function scheduleAutoLoginFingerprint(delay = 600) {
  if (apiToken || !document.body.classList.contains("login-locked")) return;
  clearAutoLoginFingerprint();
  autoLoginFingerprintTimer = window.setTimeout(() => {
    autoLoginFingerprintTimer = 0;
    loginWithFingerprint({ automatic: true });
  }, delay);
}

function initMatrixBackground() {
  const canvas = document.querySelector("#bg-canvas");
  if (!canvas) return;

  const context = canvas.getContext("2d");
  const stars = Array.from({ length: 140 }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: Math.random() * 1.2 + 0.2,
    a: Math.random() * 0.4 + 0.05
  }));
  const nebulae = [
    { x: 0.18, y: 0.3, r: 0.28, c: "rgba(15,40,90," },
    { x: 0.72, y: 0.68, r: 0.22, c: "rgba(60,15,40," }
  ];
  let tick = 0;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function paintStars() {
    const width = canvas.width;
    const height = canvas.height;
    stars.forEach((star) => {
      const flicker = star.a + Math.sin(tick * 2 + star.x * 100) * 0.02;
      context.beginPath();
      context.arc(star.x * width, star.y * height, star.r, 0, Math.PI * 2);
      context.fillStyle = `rgba(200,215,255,${Math.max(0, flicker)})`;
      context.fill();
    });
  }

  function draw() {
    tick += 0.0008;
    const width = canvas.width;
    const height = canvas.height;
    context.fillStyle = "#050a19";
    context.fillRect(0, 0, width, height);

    nebulae.forEach((nebula) => {
      const x = (nebula.x + Math.sin(tick + nebula.r) * 0.015) * width;
      const y = (nebula.y + Math.cos(tick * 0.7) * 0.012) * height;
      const gradient = context.createRadialGradient(x, y, 0, x, y, nebula.r * width);
      gradient.addColorStop(0, `${nebula.c}0.12)`);
      gradient.addColorStop(1, `${nebula.c}0.00)`);
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);
    });

    paintStars();
    window.requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener("resize", resize);
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    context.fillStyle = "#050a19";
    context.fillRect(0, 0, canvas.width, canvas.height);
    paintStars();
    return;
  }
  draw();
}

function hasRhAccess() {
  return sessionStorage.getItem(RH_ACCESS_KEY) === "authorized";
}

async function apiRequest(path, options = {}) {
  const headers = {
    ...(options.headers || {})
  };

  if (apiToken) headers["X-Session-Token"] = apiToken;
  if (options.body !== undefined) headers["Content-Type"] = "application/json";

  let response;
  try {
    response = await fetch(`${IDBIO_BRIDGE_URL}${path}`, {
      method: options.method || "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });
  } catch (error) {
    throw new Error("Ponte local nao encontrada. Abra o sistema pelo arquivo abrir-formulario.bat.");
  }

  const payload = await response.json();
  if (response.status === 401) {
    apiToken = "";
    sessionStorage.removeItem(API_TOKEN_KEY);
    sessionStorage.removeItem(RH_ACCESS_KEY);
    lockApp();
  }

  if (!response.ok || payload.ok === false) {
    throw new Error(payload.message || "Falha ao comunicar com o sistema local.");
  }

  return payload;
}

async function refreshEmployees() {
  const payload = await apiRequest("/employees");
  employeesCache = { ...DEFAULT_EMPLOYEES_BY_ID, ...payload };
  populateDepartmentOptions();
}

async function refreshRecords() {
  recordsCache = await apiRequest("/records");
}

function unlockRhPanel() {
  sessionStorage.setItem(RH_ACCESS_KEY, "authorized");
  rhLock.hidden = true;
  rhTab.classList.remove("rh-tab-locked");
  rhNavItem.classList.remove("rh-nav-locked");
  rhPanelContent.setAttribute("aria-disabled", "false");
  rhPanelContent.classList.remove("locked");
  rhPanelContent.classList.add("unlocked");
  rhLockStatus.textContent = "";
  renderEmployeeRegistry();
  fillRegisteredScheduleWithBrasiliaTime();
}

function lockRhPanel() {
  sessionStorage.removeItem(RH_ACCESS_KEY);
  rhLock.hidden = false;
  rhTab.classList.add("rh-tab-locked");
  rhNavItem.classList.add("rh-nav-locked");
  rhPanelContent.setAttribute("aria-disabled", "true");
  rhPanelContent.classList.add("locked");
  rhPanelContent.classList.remove("unlocked");
  rhLockStatus.textContent = "";
  recordsList.innerHTML = '<p class="empty-state">Painel bloqueado. Valide uma digital admin para visualizar os registros.</p>';
  employeeRegistryList.innerHTML = "";
  employeeRegistryStatus.textContent = "";
}

function setBiometricBusy(isBusy) {
  isBiometricReading = isBusy;
  if (loginBiometricButton) loginBiometricButton.disabled = isBusy;
}

async function callIdBioBridge(path) {
  return apiRequest(path, { method: "POST" });
}

async function validateRhFingerprint() {
  if (hasRhAccess() || isBiometricReading) return;

  setBiometricBusy(true);
  rhLockStatus.textContent = "Coloque a digital admin no leitor...";

  try {
    await callIdBioBridge("/verify");
    if (activeTabId !== "painel-rh") return;
    unlockRhPanel();
    await refreshRecords();
    renderRecords();
  } catch (error) {
    rhLockStatus.textContent = `Digital nao validada: ${error.message}`;
  } finally {
    setBiometricBusy(false);
  }
}

async function registerRhFingerprint() {
  clearAutoLoginFingerprint();

  const statusTarget = document.body.classList.contains("login-locked")
    ? loginBiometricStatus
    : rhLock.hidden
      ? employeeRegistryStatus
      : rhLockStatus;

  if (isBiometricReading) {
    statusTarget.textContent = "Aguarde a leitura atual terminar para cadastrar a digital.";
    return;
  }

  setBiometricBusy(true);
  statusTarget.textContent = "Coloque a digital admin no leitor para cadastrar...";

  try {
    const result = await callIdBioBridge("/register");
    statusTarget.textContent = result.message || "Digital admin cadastrada.";
    if (apiToken && activeTabId === "painel-rh") {
      lockRhPanel();
      rhLockStatus.textContent = "Digital admin cadastrada. Coloque a digital para liberar o Painel RH.";
    } else if (document.body.classList.contains("login-locked")) {
      statusTarget.textContent = "Digital admin cadastrada. Coloque o dedo novamente para entrar.";
      scheduleAutoLoginFingerprint(1000);
    }
  } catch (error) {
    statusTarget.textContent = `Nao foi possivel cadastrar a digital: ${error.message}`;
  } finally {
    setBiometricBusy(false);
  }
}

async function loginWithFingerprint(options = {}) {
  if (isBiometricReading) return;

  setBiometricBusy(true);
  loginError.classList.remove("visible");
  loginBiometricStatus.textContent = options.automatic
    ? "Aguardando digital admin no leitor..."
    : "Coloque a digital admin no leitor...";

  try {
    const payload = await apiRequest("/login/biometric", { method: "POST" });
    await setAuthenticated(payload.token);
    loginBiometricStatus.textContent = "";
  } catch (error) {
    loginBiometricStatus.textContent = `Digital nao validada: ${error.message}`;
  } finally {
    setBiometricBusy(false);
    if (options.automatic && !apiToken && document.body.classList.contains("login-locked")) {
      scheduleAutoLoginFingerprint(1200);
    }
  }
}

function setActiveTab(tabId) {
  const previousTabId = activeTabId;
  activeTabId = tabId;

  tabPanels.forEach((panel) => {
    const isActive = panel.id === tabId;
    panel.classList.toggle("active", isActive);
    panel.hidden = !isActive;
  });

  tabTriggers.forEach((trigger) => {
    const isActive = trigger.dataset.tabTarget === tabId;
    trigger.classList.toggle("active", isActive);
    if (trigger.getAttribute("role") === "tab") {
      trigger.setAttribute("aria-selected", String(isActive));
    }
  });

  if (sidebar.classList.contains("open")) sidebar.classList.remove("open");
  if (previousTabId === "painel-rh" && tabId !== "painel-rh") {
    lockRhPanel();
  }
  if (tabId === "painel-rh" && !hasRhAccess()) {
    validateRhFingerprint();
  }
}

function getSelectedReturnStatus() {
  return document.querySelector('[name="returnStatus"]:checked')?.value || "Vai retornar";
}

function updateReturnState() {
  const willReturn = getSelectedReturnStatus() === "Vai retornar";
  returnTimeInput.disabled = !willReturn;
  returnTimeCard.classList.toggle("disabled-field", !willReturn);
  if (!willReturn) setField("returnTime", "");
  if (controlIdTime) {
    controlIdText.textContent = willReturn
      ? `Ponto encontrado no Control ID: ${controlIdTime}`
      : `Ponto encontrado no Control ID: ${controlIdTime}. Funcionario informou que nao vai mais retornar.`;
    return;
  }
  controlIdText.textContent = willReturn
    ? "O horario sera exibido automaticamente pelo Control ID."
    : "Funcionario informou que nao vai mais retornar.";
}

function resetControlState() {
  controlIdTime = "";
  controlIdText.textContent = "O horario sera exibido automaticamente pelo Control ID.";
  clockStatus.textContent = "Control ID: aguardando ponto";
  controlMetric.textContent = "Pendente";
  document.querySelector('[name="requestDate"]').value = todayDate();
  setField("currentTime", "");
  setField("requestedTime", "");
  setField("returnTime", "");
  const defaultReturnStatus = document.querySelector('[name="returnStatus"][value="Vai retornar"]');
  if (defaultReturnStatus) defaultReturnStatus.checked = true;
  updateReturnState();
}

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function setField(name, value) {
  const field = form.elements[name];
  if (field) field.value = value || "";
}

function clearEmployeeFields() {
  ["employeeName", "department", "role", "managerName", "registeredSchedule"].forEach((name) => setField(name, ""));
}

function loadEmployees() {
  return employeesCache;
}

async function saveEmployees(employees) {
  employeesCache = employees;
  await apiRequest("/employees", { method: "POST", body: employees });
}

function setRequestSectionEnabled(enabled) {
  rqSection.disabled = !enabled;
  rqSection.classList.toggle("locked-section", !enabled);
  if (stepEmployee) stepEmployee.classList.toggle("active", !enabled);
  if (stepRequest) stepRequest.classList.toggle("active", enabled);
}

function fillEmployeeById(employeeId) {
  const employee = loadEmployees()[employeeId];

  if (!employee) {
    clearEmployeeFields();
    setRequestSectionEnabled(false);
    lookupStatus.textContent = employeeId.length ? "Matricula nao encontrada no cadastro." : "Digite a matricula para buscar o cadastro.";
    lookupStatus.className = employeeId.length ? "not-found" : "";
    return;
  }

  Object.entries(employee).forEach(([name, value]) => setField(name, value));
  setRequestSectionEnabled(true);
  lookupStatus.textContent = "Cadastro encontrado. Agora selecione a RQ.";
  lookupStatus.className = "found";
}

function renderEmployeeRegistry() {
  if (!hasRhAccess()) return;

  const employees = loadEmployees();
  const entries = Object.entries(employees).sort(([a], [b]) => a.localeCompare(b, "pt-BR", { numeric: true }));
  employeeRegistryList.innerHTML = "";

  if (!entries.length) {
    employeeRegistryList.innerHTML = '<p class="empty-state">Nenhum funcionario cadastrado.</p>';
    return;
  }

  entries.forEach(([employeeId, employee]) => {
    const item = document.createElement("article");
    item.className = "employee-item";
    item.innerHTML = `
      <div>
        <strong>${escapeHtml(employee.employeeName)}</strong>
        <p>${escapeHtml(employeeId)} · ${escapeHtml(employee.department)} · ${escapeHtml(employee.role)}</p>
        <small>${escapeHtml(employee.managerName)} · ${escapeHtml(employee.registeredSchedule)}</small>
      </div>
      <div class="employee-item-actions">
        <button class="btn-secondary" type="button" data-action="edit-employee" data-employee-id="${escapeHtml(employeeId)}">Editar</button>
        <button class="btn-secondary danger-action" type="button" data-action="delete-employee" data-employee-id="${escapeHtml(employeeId)}">Excluir</button>
      </div>
    `;
    employeeRegistryList.append(item);
  });
}

function fillEmployeeRegistryForm(employeeId) {
  const employee = loadEmployees()[employeeId];
  if (!employee) return;

  employeeRegistryForm.elements.employeeId.value = employeeId;
  Object.entries(employee).forEach(([name, value]) => {
    if (employeeRegistryForm.elements[name]) employeeRegistryForm.elements[name].value = value;
  });
  employeeRegistryStatus.textContent = "Cadastro carregado para edicao.";
}

function loadRecords() {
  return recordsCache;
}

function sortedDepartments(extraDepartments = []) {
  return [...new Set([...DEPARTMENTS, ...extraDepartments].filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function populateDepartmentOptions() {
  if (!departmentOptions) return;
  departmentOptions.innerHTML = "";
  sortedDepartments(Object.values(loadEmployees()).map((employee) => employee.department)).forEach((department) => {
    const option = document.createElement("option");
    option.value = department;
    departmentOptions.append(option);
  });
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function todayDate() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function currentClockTime() {
  const now = new Date();
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function currentBrasiliaTime() {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date());
}

function fillRegisteredScheduleWithBrasiliaTime(force = false) {
  const field = employeeRegistryForm?.elements.registeredSchedule;
  if (!field || (!force && field.value.trim())) return;
  field.value = currentBrasiliaTime();
}

function fillPointTime(pointTime) {
  document.querySelector('[name="requestDate"]').value = todayDate();
  setField("currentTime", pointTime);
  if (!form.elements.requestedTime.value) setField("requestedTime", pointTime);
  if (getSelectedReturnStatus() === "Vai retornar") {
    returnTimeInput.disabled = false;
  } else {
    setField("returnTime", "");
  }
}

function formatDate(value) {
  if (!value) return "-";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function getSemester(monthIndex) {
  return monthIndex < 6 ? 1 : 2;
}

function createEmailLink(record) {
  const subject = `Solicitacao de horario - ${record.employeeName} - ${formatDate(record.requestDate)}`;
  const body = [
    "Solicitacao de alteracao de horario",
    "",
    `Funcionario: ${record.employeeName}`,
    `Matricula: ${record.employeeId}`,
    `Setor: ${record.department}`,
    `Cargo: ${record.role || "-"}`,
    `Superior imediato: ${record.managerName || "-"}`,
    `Horario cadastrado: ${record.registeredSchedule || "-"}`,
    `Tipo: ${record.requestType}`,
    `Data: ${formatDate(record.requestDate)}`,
    `Horario exibido pelo ponto: ${record.currentTime || record.controlIdTime || "-"}`,
    `Retorno: ${record.returnStatus || "Vai retornar"}`,
    `Horario de retorno no ponto: ${record.returnTime || "-"}`,
    `Horario registrado no Control ID: ${record.controlIdTime || "-"}`,
    `Motivo: ${record.reason}`
  ].join("\n");

  return `mailto:${RH_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function populateDepartmentFilter(records) {
  const current = departmentFilter.value;
  const employeeDepartments = Object.values(loadEmployees()).map((employee) => employee.department);
  const recordDepartments = records.map((record) => record.department);
  const departments = sortedDepartments([...employeeDepartments, ...recordDepartments]);

  departmentFilter.innerHTML = '<option value="">Todos</option>';
  departments.forEach((department) => {
    const option = document.createElement("option");
    option.value = department;
    option.textContent = department;
    departmentFilter.append(option);
  });
  departmentFilter.value = departments.includes(current) ? current : "";
}

function filteredRecords(records) {
  const department = departmentFilter.value;
  const employee = employeeFilter.value.trim().toLowerCase();

  return records.filter((record) => {
    const departmentMatches = !department || record.department === department;
    const employeeMatches = !employee || record.employeeName.toLowerCase().includes(employee);
    return departmentMatches && employeeMatches;
  });
}

function updateMetrics(records) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const currentSemester = getSemester(currentMonth);

  const totals = records.reduce(
    (acc, record) => {
      const date = new Date(`${record.requestDate}T00:00:00`);
      if (date.getFullYear() !== currentYear) return acc;

      acc.year += 1;
      if (getSemester(date.getMonth()) === currentSemester) acc.semester += 1;
      if (date.getMonth() === currentMonth) acc.month += 1;
      return acc;
    },
    { month: 0, semester: 0, year: 0 }
  );

  monthCount.textContent = totals.month;
  semesterCount.textContent = totals.semester;
  yearCount.textContent = totals.year;
}

function renderRecords() {
  if (!hasRhAccess()) {
    recordsList.innerHTML = '<p class="empty-state">Painel bloqueado. Valide uma digital admin para visualizar os registros.</p>';
    monthCount.textContent = "0";
    semesterCount.textContent = "0";
    yearCount.textContent = "0";
    return;
  }

  const records = loadRecords();
  populateDepartmentFilter(records);

  const visibleRecords = filteredRecords(records);
  updateMetrics(visibleRecords);
  recordsList.innerHTML = "";

  if (!visibleRecords.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Nenhuma solicitacao encontrada.";
    recordsList.append(empty);
    return;
  }

  visibleRecords
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .forEach((record) => {
      const node = template.content.cloneNode(true);
      node.querySelector('[data-field="employeeName"]').textContent = record.employeeName;
      node.querySelector('[data-field="department"]').textContent = record.department;
      node.querySelector('[data-field="requestType"]').textContent = record.requestType;
      node.querySelector('[data-field="requestDate"]').textContent = formatDate(record.requestDate);
      node.querySelector('[data-field="controlIdTime"]').textContent = record.controlIdTime || "-";
      node.querySelector('[data-field="requestedTime"]').textContent = record.currentTime || record.requestedTime || record.controlIdTime || "-";
      node.querySelector('[data-field="returnStatus"]').textContent = record.returnStatus || "Vai retornar";
      node.querySelector('[data-field="reason"]').textContent = record.reason;
      node.querySelector('[data-field="emailLink"]').href = createEmailLink(record);
      recordsList.append(node);
    });
}

function getFormValue(data, name) {
  return String(data.get(name) || "").trim();
}

employeeIdInput.addEventListener("input", () => {
  employeeIdInput.value = onlyDigits(employeeIdInput.value);
  fillEmployeeById(employeeIdInput.value);
});

returnStatusInputs.forEach((input) => {
  input.addEventListener("change", updateReturnState);
});

syncControlId.addEventListener("click", () => {
  controlIdTime = currentClockTime();
  fillPointTime(controlIdTime);
  controlIdText.textContent =
    getSelectedReturnStatus() === "Vai retornar"
      ? `Ponto encontrado no Control ID: ${controlIdTime}`
      : `Ponto encontrado no Control ID: ${controlIdTime}. Funcionario informou que nao vai mais retornar.`;
  clockStatus.textContent = `Control ID: ${controlIdTime}`;
  controlMetric.textContent = controlIdTime;
});

sidebarToggle.addEventListener("click", () => {
  sidebar.classList.toggle("open");
});

themeToggle.addEventListener("click", toggleTheme);

tabTriggers.forEach((trigger) => {
  trigger.addEventListener("click", (event) => {
    event.preventDefault();
    const tabId = trigger.dataset.tabTarget;
    if (tabId !== "painel-rh" && hasRhAccess()) {
      lockRhPanel();
    }
    setActiveTab(tabId);
  });
});

rhPanelExitButton.addEventListener("click", () => {
  lockRhPanel();
  setActiveTab("nova-solicitacao");
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  let data = new FormData(form);

  if (!controlIdTime) {
    controlIdTime = currentClockTime();
    fillPointTime(controlIdTime);
    controlIdText.textContent = `Ponto registrado automaticamente: ${controlIdTime}`;
  }

  data = new FormData(form);
  const id = `SOL-${Date.now()}`;
  const record = {
    id,
    employeeName: getFormValue(data, "employeeName"),
    employeeId: getFormValue(data, "employeeId"),
    department: getFormValue(data, "department"),
    role: getFormValue(data, "role"),
    managerName: getFormValue(data, "managerName"),
    registeredSchedule: getFormValue(data, "registeredSchedule"),
    requestType: getFormValue(data, "requestType"),
    requestDate: getFormValue(data, "requestDate"),
    currentTime: getFormValue(data, "currentTime"),
    requestedTime: getFormValue(data, "requestedTime"),
    returnTime: getFormValue(data, "returnTime"),
    returnStatus: getFormValue(data, "returnStatus") || "Vai retornar",
    reason: getFormValue(data, "reason"),
    controlIdTime,
    createdAt: new Date().toISOString()
  };

  try {
    await apiRequest("/records/add", { method: "POST", body: record });
    recordsCache.push(record);
  } catch (error) {
    saveStatus.textContent = error.message;
    return;
  }

  requestId.textContent = id;
  saveStatus.textContent = "Salvo para conferencia do RH";
  isSaving = true;
  form.reset();
  isSaving = false;
  resetControlState();
  clearEmployeeFields();
  setRequestSectionEnabled(false);
  lookupStatus.textContent = "Digite a matricula para buscar o cadastro.";
  lookupStatus.className = "";
  renderRecords();
});

form.addEventListener("reset", () => {
  if (isSaving) return;
  window.setTimeout(() => {
    resetControlState();
    clearEmployeeFields();
    setRequestSectionEnabled(false);
    lookupStatus.textContent = "Digite a matricula para buscar o cadastro.";
    lookupStatus.className = "";
    saveStatus.textContent = "Nao enviado";
    requestId.textContent = "Rascunho";
  }, 0);
});

departmentFilter.addEventListener("change", renderRecords);
employeeFilter.addEventListener("input", renderRecords);

employeeRegistryForm.elements.employeeId.addEventListener("input", () => {
  employeeRegistryForm.elements.employeeId.value = onlyDigits(employeeRegistryForm.elements.employeeId.value);
});

employeeRegistryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!hasRhAccess()) {
    employeeRegistryStatus.textContent = "Valide uma digital admin antes de cadastrar funcionarios.";
    return;
  }

  const data = new FormData(employeeRegistryForm);
  const employeeId = onlyDigits(data.get("employeeId"));
  if (!employeeId) {
    employeeRegistryStatus.textContent = "Informe a matricula do funcionario.";
    return;
  }

  const employees = loadEmployees();
  employees[employeeId] = {
    employeeName: getFormValue(data, "employeeName"),
    department: getFormValue(data, "department"),
    role: getFormValue(data, "role"),
    managerName: getFormValue(data, "managerName"),
    registeredSchedule: getFormValue(data, "registeredSchedule")
  };
  try {
    await saveEmployees(employees);
    employeeRegistryStatus.textContent = "Funcionario salvo no cadastro.";
  } catch (error) {
    employeeRegistryStatus.textContent = error.message;
    return;
  }

  employeeRegistryForm.reset();
  fillRegisteredScheduleWithBrasiliaTime(true);
  populateDepartmentOptions();
  renderEmployeeRegistry();
  renderRecords();

  if (employeeIdInput.value === employeeId) fillEmployeeById(employeeId);
});

employeeRegistryForm.addEventListener("reset", () => {
  window.setTimeout(() => {
    employeeRegistryStatus.textContent = "";
    fillRegisteredScheduleWithBrasiliaTime(true);
  }, 0);
});

employeeRegistryList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button || !hasRhAccess()) return;

  const employeeId = button.dataset.employeeId;
  if (button.dataset.action === "edit-employee") {
    fillEmployeeRegistryForm(employeeId);
    employeeRegistryForm.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  if (button.dataset.action === "delete-employee") {
    const employees = loadEmployees();
    const employee = employees[employeeId];
    if (!employee) return;
    if (!confirm(`Excluir o cadastro de ${employee.employeeName}?`)) return;
    delete employees[employeeId];
    try {
      await saveEmployees(employees);
    } catch (error) {
      employeeRegistryStatus.textContent = error.message;
      return;
    }

    employeeRegistryStatus.textContent = "Funcionario removido do cadastro.";
    populateDepartmentOptions();
    renderEmployeeRegistry();
    renderRecords();

    if (employeeIdInput.value === employeeId) fillEmployeeById(employeeId);
  }
});

loginUsername.addEventListener("input", () => {
  loginError.classList.remove("visible");
  syncLoginSubmit();
});

loginPassword.addEventListener("input", () => {
  loginError.classList.remove("visible");
  syncLoginSubmit();
});

userHintButton.addEventListener("click", (event) => {
  event.stopPropagation();
  userHintTooltip.classList.toggle("visible");
});

userHintButton.addEventListener("focus", () => userHintTooltip.classList.add("visible"));
userHintButton.addEventListener("blur", () => userHintTooltip.classList.remove("visible"));
document.addEventListener("click", () => userHintTooltip.classList.remove("visible"));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") userHintTooltip.classList.remove("visible");
});

function updateCapsLockWarning(event) {
  capsLockWarning.hidden = !(event.getModifierState && event.getModifierState("CapsLock"));
}

loginPassword.addEventListener("keydown", updateCapsLockWarning);
loginPassword.addEventListener("keyup", updateCapsLockWarning);
loginPassword.addEventListener("blur", () => {
  capsLockWarning.hidden = true;
});

passwordToggle.addEventListener("click", () => {
  const isShowing = loginPassword.type === "text";
  loginPassword.type = isShowing ? "password" : "text";
  passwordToggle.setAttribute("aria-label", isShowing ? "Mostrar senha" : "Ocultar senha");
});

clearStorage.addEventListener("click", async () => {
  if (!hasRhAccess()) {
    setActiveTab("painel-rh");
    return;
  }
  if (!confirm("Deseja apagar todos os registros salvos neste navegador?")) return;
  try {
    await apiRequest("/records/clear", { method: "POST" });
    recordsCache = [];
  } catch (error) {
    rhLockStatus.textContent = error.message;
    return;
  }

  renderRecords();
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginSubmit.disabled = true;
  loginSubmit.textContent = "Autenticando...";
  const data = new FormData(loginForm);
  const username = String(data.get("username") || "").trim().toLowerCase();
  const password = String(data.get("password") || "");

  try {
    const payload = await apiRequest("/login", {
      method: "POST",
      body: { username, password }
    });
    loginSubmit.textContent = "Entrar";
    await setAuthenticated(payload.token);
    syncLoginSubmit();
    return;
  } catch (error) {
    loginError.textContent = error.message;
    loginError.classList.add("visible");
  }

  loginSubmit.textContent = "Entrar";
  syncLoginSubmit();
});

loginBiometricButton.addEventListener("click", () => {
  clearAutoLoginFingerprint();
  loginWithFingerprint();
});

rhRegisterFingerprintButtons.forEach((button) => {
  button.addEventListener("click", registerRhFingerprint);
});

logoutButton.addEventListener("click", logout);

async function initApp() {
  applyTheme(localStorage.getItem(THEME_KEY) || "light");
  tabPanels.forEach((panel) => {
    panel.hidden = !panel.classList.contains("active");
  });
  populateDepartmentOptions();
  fillRegisteredScheduleWithBrasiliaTime();
  document.querySelector('[name="requestDate"]').value = todayDate();
  initMatrixBackground();
  syncLoginSubmit();
  setRequestSectionEnabled(false);
  lockRhPanel();
  renderRecords();

  if (!apiToken) {
    scheduleAutoLoginFingerprint();
    return;
  }

  try {
    const session = await apiRequest("/session");
    await refreshEmployees();
    unlockApp();
  } catch (error) {
    apiToken = "";
    sessionStorage.removeItem(API_TOKEN_KEY);
    lockApp();
  }
}

initApp();
