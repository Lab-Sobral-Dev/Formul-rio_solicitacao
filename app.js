const RH_ACCESS_KEY = "rhPanelAccess";
const THEME_KEY = "rhSobralTheme";
const SUPABASE_URL = "https://dlrqwyidlgpnfqmdvrjo.supabase.co";
// Chave "anon" vem de config.local.js (fora do Git). Sem ela, usa localStorage.
const SUPABASE_ANON_KEY = window.APP_CONFIG?.supabaseAnonKey || "";
const EMPLOYEES_KEY = "rhSobralEmployees";
const RECORDS_KEY = "rhSobralRecords";
// Senha de teste: rh123 (somente o hash SHA-256 fica no codigo). Trocar antes de publicar.
const RH_PASSWORD_HASH = "b655f90cf354b94f9be03c3b3e7a734e827b2fa3fd41aba3c13d0d2c2e9b8cf2";
const RH_EMAIL = "rh@empresa.com.br";

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
const typeFilter = document.querySelector("#typeFilter");
const dateFromFilter = document.querySelector("#dateFromFilter");
const dateToFilter = document.querySelector("#dateToFilter");
const exportCsvButton = document.querySelector("#exportCsv");
const formError = document.querySelector("#formError");
const requestTypeInputs = document.querySelectorAll('[name="requestType"]');
const requestDateInput = document.querySelector('[name="requestDate"]');
const requestDateLabel = document.querySelector("#requestDateLabel");
const requestedTimeInput = document.querySelector('[name="requestedTime"]');
const requestedTimeLabel = document.querySelector("#requestedTimeLabel");
const currentTimeCard = document.querySelector("#currentTimeCard");
const requestedTimeCard = document.querySelector("#requestedTimeCard");
const returnOptions = document.querySelector("#returnOptions");
const controlBox = document.querySelector("#controlBox");
const statusFilter = document.querySelector("#statusFilter");
const pendingCount = document.querySelector("#pendingCount");
const employeeFilter = document.querySelector("#employeeFilter");
const clearStorage = document.querySelector("#clearStorage");
const rhLock = document.querySelector("#rhLock");
const rhPanelContent = document.querySelector("#rhPanelContent");
const rhPanelExitButton = document.querySelector("#rhPanelExitButton");
const rhTab = document.querySelector("#painel-rh");
const rhNavItem = document.querySelector('[data-tab-target="painel-rh"]');
const rhLockForm = document.querySelector("#rhLockForm");
const rhPasswordInput = document.querySelector("#rhPasswordInput");
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

const STATUS_PENDING = "Pendente";
const STATUS_APPROVED = "Aprovada";
const STATUS_REJECTED = "Recusada";

// Campos do formulario que mudam conforme o tipo de RQ.
const REQUEST_TYPE_RULES = {
  "Alteracao de horario": { timeLabel: "Novo horario solicitado", hasTime: true, hasReturn: false },
  "Entrada fora de horario": { timeLabel: "Horario de entrada", hasTime: true, hasReturn: false },
  "Saida fora de horario": { timeLabel: "Horario de saida", hasTime: true, hasReturn: false },
  "Servico externo": { timeLabel: "Horario de saida", hasTime: true, hasReturn: true },
  "Saida particular": { timeLabel: "Horario de saida", hasTime: true, hasReturn: true },
  "Falta justificada": { dateLabel: "Data da falta", hasTime: false, hasReturn: false, futureDate: true }
};
const DEFAULT_REQUEST_RULE = { timeLabel: "Horario de saida", hasTime: true, hasReturn: true };

const DEFAULT_REGISTERED_SCHEDULE = "08:00 as 12:00 e 13:00 as 17:48";

const DEFAULT_EMPLOYEES_BY_ID = {};

let controlIdTime = "";
let isSaving = false;
let activeTabId = document.querySelector(".tab-panel.active")?.id || "nova-solicitacao";
let employeesCache = { ...DEFAULT_EMPLOYEES_BY_ID };
let recordsCache = [];

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

function hasRhAccess() {
  return sessionStorage.getItem(RH_ACCESS_KEY) === "authorized";
}

const EMPLOYEE_COLUMNS = {
  employeeName: "employee_name",
  department: "department",
  role: "role",
  managerName: "manager_name",
  registeredSchedule: "registered_schedule"
};

const RECORD_COLUMNS = {
  id: "id",
  employeeName: "employee_name",
  employeeId: "employee_id",
  department: "department",
  role: "role",
  managerName: "manager_name",
  registeredSchedule: "registered_schedule",
  requestType: "request_type",
  requestDate: "request_date",
  currentTime: "current_time_value",
  requestedTime: "requested_time",
  returnTime: "return_time",
  returnStatus: "return_status",
  reason: "reason",
  controlIdTime: "control_id_time",
  createdAt: "created_at",
  status: "status",
  decidedAt: "decided_at"
};

function mapKeys(source, columns) {
  const result = {};
  Object.entries(columns).forEach(([appKey, column]) => {
    if (source[appKey] !== undefined) result[column] = source[appKey];
  });
  return result;
}

function unmapKeys(row, columns) {
  const result = {};
  Object.entries(columns).forEach(([appKey, column]) => {
    if (row[column] !== undefined && row[column] !== null) result[appKey] = row[column];
  });
  return result;
}

async function supabaseRequest(table, { method = "GET", query = "", body, upsertOn } = {}) {
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (upsertOn) headers.Prefer = "resolution=merge-duplicates,return=minimal";
  else if (method !== "GET") headers.Prefer = "return=minimal";

  const url = `${SUPABASE_URL}/rest/v1/${table}${query}`;
  let response;
  try {
    response = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch (error) {
    throw new Error("Nao foi possivel conectar ao banco de dados. Verifique a internet.");
  }

  if (!response.ok) {
    let detail = "";
    try {
      detail = (await response.json()).message || "";
    } catch (error) {
      detail = "";
    }
    throw new Error(`Falha no banco de dados (${response.status}). ${detail}`.trim());
  }

  return method === "GET" ? response.json() : null;
}

async function supabaseApi(path, options) {
  const method = options.method || "GET";

  if (path === "/employees") {
    if (method !== "POST") {
      const rows = await supabaseRequest("employees");
      return Object.fromEntries(rows.map((row) => [row.employee_id, unmapKeys(row, EMPLOYEE_COLUMNS)]));
    }

    const employees = options.body;
    const ids = Object.keys(employees);
    const existing = await supabaseRequest("employees", { query: "?select=employee_id" });
    const removed = existing.map((row) => row.employee_id).filter((id) => !ids.includes(id));
    if (removed.length) {
      const list = removed.map((id) => `"${id}"`).join(",");
      await supabaseRequest("employees", { method: "DELETE", query: `?employee_id=in.(${encodeURIComponent(list)})` });
    }
    if (ids.length) {
      const rows = ids.map((id) => ({ employee_id: id, ...mapKeys(employees[id], EMPLOYEE_COLUMNS) }));
      await supabaseRequest("employees", { method: "POST", query: "?on_conflict=employee_id", body: rows, upsertOn: true });
    }
    return { ok: true };
  }

  if (path === "/records") {
    const rows = await supabaseRequest("records", { query: "?order=created_at.asc" });
    return rows.map((row) => unmapKeys(row, RECORD_COLUMNS));
  }

  if (path === "/records/exists") {
    const { employeeId, requestDate, requestType } = options.body;
    const query = `?select=id&limit=1&employee_id=eq.${encodeURIComponent(employeeId)}`
      + `&request_date=eq.${encodeURIComponent(requestDate)}`
      + `&request_type=eq.${encodeURIComponent(requestType)}&status=neq.Recusada`;
    return (await supabaseRequest("records", { query })).length > 0;
  }

  if (path === "/records/add") {
    await supabaseRequest("records", { method: "POST", body: mapKeys(options.body, RECORD_COLUMNS) });
    return { ok: true };
  }

  if (path === "/records/status") {
    const { id, status, decidedAt } = options.body;
    await supabaseRequest("records", {
      method: "PATCH",
      query: `?id=eq.${encodeURIComponent(id)}`,
      body: mapKeys({ status, decidedAt }, RECORD_COLUMNS)
    });
    return { ok: true };
  }

  if (path === "/records/clear") {
    await supabaseRequest("records", { method: "DELETE", query: "?id=not.is.null" });
    return { ok: true };
  }

  throw new Error(`Rota nao encontrada: ${path}`);
}

// Sem chave do Supabase, usa o localStorage do navegador (apenas para teste).
async function apiRequest(path, options = {}) {
  if (SUPABASE_ANON_KEY) return supabaseApi(path, options);

  const readStored = (key, fallback) => {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch (error) {
      return fallback;
    }
  };
  const method = options.method || "GET";

  if (path === "/employees") {
    if (method === "POST") {
      localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(options.body));
      return { ok: true };
    }
    return readStored(EMPLOYEES_KEY, {});
  }

  if (path === "/records") return readStored(RECORDS_KEY, []);

  if (path === "/records/exists") {
    const { employeeId, requestDate, requestType } = options.body;
    return readStored(RECORDS_KEY, []).some((item) => item.employeeId === employeeId
      && item.requestDate === requestDate && item.requestType === requestType && item.status !== "Recusada");
  }

  if (path === "/records/add") {
    const records = readStored(RECORDS_KEY, []);
    records.push(options.body);
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
    return { ok: true };
  }

  if (path === "/records/status") {
    const { id, status, decidedAt } = options.body;
    const records = readStored(RECORDS_KEY, []);
    const target = records.find((item) => item.id === id);
    if (target) Object.assign(target, { status, decidedAt });
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
    return { ok: true };
  }

  if (path === "/records/clear") {
    localStorage.removeItem(RECORDS_KEY);
    return { ok: true };
  }

  throw new Error(`Rota nao encontrada: ${path}`);
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
  fillRegisteredScheduleAutomatically();
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
  recordsList.innerHTML = '<p class="empty-state">Painel bloqueado. Digite a senha do Painel RH para visualizar os registros.</p>';
  employeeRegistryList.innerHTML = "";
  employeeRegistryStatus.textContent = "";
}

async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function openRhPanel(password) {
  if (hasRhAccess()) return;

  if (await sha256Hex(password) !== RH_PASSWORD_HASH) {
    rhLockStatus.textContent = "Senha incorreta.";
    rhPasswordInput.select();
    return;
  }

  rhLockForm.reset();
  unlockRhPanel();
  try {
    await refreshRecords();
  } catch (error) {
    rhLockStatus.textContent = error.message;
  }
  renderRecords();
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
    rhPasswordInput.focus();
  }
}

function getSelectedReturnStatus() {
  return document.querySelector('[name="returnStatus"]:checked')?.value || "Vai retornar";
}

function getRequestRule() {
  const type = document.querySelector('[name="requestType"]:checked')?.value;
  return REQUEST_TYPE_RULES[type] || DEFAULT_REQUEST_RULE;
}

function tomorrowDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function showFormError(message) {
  formError.textContent = message;
  formError.hidden = !message;
}

function applyRequestType() {
  const rule = getRequestRule();
  showFormError("");

  requestDateLabel.textContent = rule.dateLabel || "Data do ponto";
  requestDateInput.readOnly = !rule.futureDate;
  requestDateInput.min = rule.futureDate ? tomorrowDate() : "";
  requestDateInput.value = rule.futureDate ? "" : todayDate();

  requestedTimeLabel.textContent = rule.timeLabel || DEFAULT_REQUEST_RULE.timeLabel;
  [currentTimeCard, requestedTimeCard, controlBox].forEach((element) => { element.hidden = !rule.hasTime; });
  requestedTimeInput.disabled = !rule.hasTime;
  requestedTimeInput.required = rule.hasTime;
  form.elements.currentTime.disabled = !rule.hasTime;

  returnOptions.hidden = !rule.hasReturn;
  returnTimeCard.hidden = !rule.hasReturn;
  updateReturnState();
}

function updateReturnState() {
  const rule = getRequestRule();
  const willReturn = getSelectedReturnStatus() === "Vai retornar";
  returnTimeInput.disabled = !(willReturn && rule.hasReturn);
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
  setField("currentTime", "");
  setField("requestedTime", "");
  setField("returnTime", "");
  const defaultReturnStatus = document.querySelector('[name="returnStatus"][value="Vai retornar"]');
  if (defaultReturnStatus) defaultReturnStatus.checked = true;
  applyRequestType();
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
  return currentBrasiliaTime();
}

function currentBrasiliaTime() {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date());
}

function fillRegisteredScheduleAutomatically(force = false) {
  const field = employeeRegistryForm?.elements.registeredSchedule;
  if (!field || (!force && field.value.trim())) return;
  field.value = DEFAULT_REGISTERED_SCHEDULE;
}

function fillPointTime(pointTime) {
  if (!getRequestRule().futureDate) requestDateInput.value = todayDate();
  setField("currentTime", pointTime);
  if (!form.elements.requestedTime.value) setField("requestedTime", pointTime);
  if (getSelectedReturnStatus() !== "Vai retornar") setField("returnTime", "");
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
    `Motivo: ${record.reason}`,
    `Status: ${recordStatus(record)}`
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

function populateTypeFilter() {
  Object.keys(REQUEST_TYPE_RULES).forEach((type) => {
    const option = document.createElement("option");
    option.value = type;
    option.textContent = type;
    typeFilter.append(option);
  });
}

function csvCell(value) {
  let text = String(value ?? "");
  // Evita que o Excel interprete o texto como formula.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function exportRecordsCsv() {
  const records = filteredRecords(loadRecords()).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  if (!records.length) {
    rhLockStatus.textContent = "";
    window.alert("Nao ha solicitacoes para exportar com os filtros atuais.");
    return;
  }

  const columns = [
    ["Protocolo", (r) => r.id],
    ["Data", (r) => formatDate(r.requestDate)],
    ["Matricula", (r) => r.employeeId],
    ["Funcionario", (r) => r.employeeName],
    ["Setor", (r) => r.department],
    ["Cargo", (r) => r.role],
    ["Superior imediato", (r) => r.managerName],
    ["Tipo de RQ", (r) => r.requestType],
    ["Horario do ponto", (r) => r.currentTime],
    ["Horario solicitado", (r) => r.requestedTime],
    ["Retorno", (r) => r.returnStatus],
    ["Horario de retorno", (r) => r.returnTime],
    ["Control ID", (r) => r.controlIdTime],
    ["Status", (r) => recordStatus(r)],
    ["Decidido em", (r) => (r.decidedAt ? new Date(r.decidedAt).toLocaleString("pt-BR") : "")],
    ["Motivo", (r) => r.reason],
    ["Criado em", (r) => (r.createdAt ? new Date(r.createdAt).toLocaleString("pt-BR") : "")]
  ];
  const lines = [columns.map(([title]) => csvCell(title)).join(";")];
  records.forEach((record) => lines.push(columns.map(([, get]) => csvCell(get(record))).join(";")));

  // BOM + ponto e virgula para abrir corretamente no Excel em portugues.
  const blob = new Blob(["\ufeff", lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `solicitacoes-${todayDate()}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

function printRecord(card) {
  card.classList.add("printing");
  document.body.classList.add("print-one");
  window.print();
}

window.addEventListener("afterprint", () => {
  document.body.classList.remove("print-one");
  document.querySelectorAll(".record.printing").forEach((card) => card.classList.remove("printing"));
});

function recordStatus(record) {
  return record.status || STATUS_PENDING;
}

function filteredRecords(records) {
  const department = departmentFilter.value;
  const status = statusFilter.value;
  const type = typeFilter.value;
  const dateFrom = dateFromFilter.value;
  const dateTo = dateToFilter.value;
  const employee = employeeFilter.value.trim().toLowerCase();

  return records.filter((record) => {
    const departmentMatches = !department || record.department === department;
    const statusMatches = !status || recordStatus(record) === status;
    const employeeMatches = !employee || record.employeeName.toLowerCase().includes(employee);
    const typeMatches = !type || record.requestType === type;
    const fromMatches = !dateFrom || record.requestDate >= dateFrom;
    const toMatches = !dateTo || record.requestDate <= dateTo;
    return departmentMatches && statusMatches && typeMatches && fromMatches && toMatches && employeeMatches;
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

  pendingCount.textContent = records.filter((record) => recordStatus(record) === STATUS_PENDING).length;
  monthCount.textContent = totals.month;
  semesterCount.textContent = totals.semester;
  yearCount.textContent = totals.year;
}

function renderRecords() {
  if (!hasRhAccess()) {
    recordsList.innerHTML = '<p class="empty-state">Painel bloqueado. Digite a senha do Painel RH para visualizar os registros.</p>';
    pendingCount.textContent = "0";
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
      const status = recordStatus(record);
      node.querySelector(".record").dataset.id = record.id;
      const badge = node.querySelector('[data-field="status"]');
      badge.textContent = status;
      badge.dataset.status = status;
      node.querySelector('[data-action="approve-record"]').disabled = status === STATUS_APPROVED;
      node.querySelector('[data-action="reject-record"]').disabled = status === STATUS_REJECTED;
      node.querySelector('[data-field="emailLink"]').href = createEmailLink(record);
      recordsList.append(node);
    });
}

function validateRequest(record) {
  const rule = REQUEST_TYPE_RULES[record.requestType] || DEFAULT_REQUEST_RULE;

  if (rule.futureDate && record.requestDate < tomorrowDate()) {
    return "Falta justificada exige solicitacao com 24h de antecedencia. Escolha a partir de amanha.";
  }
  if (rule.hasReturn && record.returnStatus === "Vai retornar" && record.returnTime && record.requestedTime
    && record.returnTime <= record.requestedTime) {
    return "O horario de retorno deve ser depois do horario de saida.";
  }
  return "";
}

function getFormValue(data, name) {
  return String(data.get(name) || "").trim();
}

employeeIdInput.addEventListener("input", () => {
  employeeIdInput.value = onlyDigits(employeeIdInput.value);
  fillEmployeeById(employeeIdInput.value);
});

requestTypeInputs.forEach((input) => {
  input.addEventListener("change", () => {
    setField("requestedTime", "");
    setField("returnTime", "");
    applyRequestType();
  });
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

rhLockForm.addEventListener("submit", (event) => {
  event.preventDefault();
  openRhPanel(rhPasswordInput.value);
});

rhPanelExitButton.addEventListener("click", () => {
  lockRhPanel();
  setActiveTab("nova-solicitacao");
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  showFormError("");
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

  const validationError = validateRequest(record);
  if (validationError) {
    showFormError(validationError);
    return;
  }

  try {
    let duplicated = false;
    try {
      duplicated = await apiRequest("/records/exists", { method: "POST", body: record });
    } catch (error) {
      duplicated = false; // Sem checagem de duplicidade, segue com o salvamento.
    }
    if (duplicated) {
      showFormError("Ja existe uma solicitacao deste tipo para esta matricula e data (pendente ou aprovada).");
      return;
    }
    await apiRequest("/records/add", { method: "POST", body: record });
    recordsCache.push({ ...record, status: STATUS_PENDING });
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
statusFilter.addEventListener("change", renderRecords);
typeFilter.addEventListener("change", renderRecords);
dateFromFilter.addEventListener("change", renderRecords);
dateToFilter.addEventListener("change", renderRecords);
exportCsvButton.addEventListener("click", exportRecordsCsv);

recordsList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  const card = button?.closest(".record");
  if (!button || !card || !hasRhAccess()) return;

  if (button.dataset.action === "print-record") {
    printRecord(card);
    return;
  }

  const status = { "approve-record": STATUS_APPROVED, "reject-record": STATUS_REJECTED }[button.dataset.action];
  if (!status) return;

  const decidedAt = new Date().toISOString();
  button.disabled = true;
  try {
    await apiRequest("/records/status", { method: "POST", body: { id: card.dataset.id, status, decidedAt } });
  } catch (error) {
    rhLockStatus.textContent = error.message;
    window.alert(`Nao foi possivel atualizar a solicitacao. ${error.message}`);
    renderRecords();
    return;
  }

  const record = recordsCache.find((item) => item.id === card.dataset.id);
  if (record) Object.assign(record, { status, decidedAt });
  renderRecords();
});
employeeFilter.addEventListener("input", renderRecords);

employeeRegistryForm.elements.employeeId.addEventListener("input", () => {
  employeeRegistryForm.elements.employeeId.value = onlyDigits(employeeRegistryForm.elements.employeeId.value);
});

employeeRegistryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!hasRhAccess()) {
    employeeRegistryStatus.textContent = "Digite a senha do Painel RH antes de cadastrar funcionarios.";
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
  fillRegisteredScheduleAutomatically(true);
  populateDepartmentOptions();
  renderEmployeeRegistry();
  renderRecords();

  if (employeeIdInput.value === employeeId) fillEmployeeById(employeeId);
});

employeeRegistryForm.addEventListener("reset", () => {
  window.setTimeout(() => {
    employeeRegistryStatus.textContent = "";
    fillRegisteredScheduleAutomatically(true);
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

async function initApp() {
  applyTheme(localStorage.getItem(THEME_KEY) || "light");
  tabPanels.forEach((panel) => {
    panel.hidden = !panel.classList.contains("active");
  });
  populateDepartmentOptions();
  fillRegisteredScheduleAutomatically();
  applyRequestType();
  populateTypeFilter();
  setRequestSectionEnabled(false);
  lockRhPanel();
  renderRecords();

  try {
    await refreshEmployees();
  } catch (error) {
    // Sem servidor local, segue com os funcionarios padrao.
  }
}

initApp();
