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

const DEFAULT_REGISTERED_SCHEDULE = "08:00 as 12:00 e 13:00 as 17:48";

const DEFAULT_EMPLOYEES_BY_ID = {
  "1024": {
    employeeName: "Maria Santos",
    department: "Producao",
    role: "Operadora de Producao",
    managerName: "Carlos Almeida",
    registeredSchedule: "07:00 as 11:00 e 12:00 as 16:48"
  }
};

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
  createdAt: "created_at"
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

  if (path === "/records/add") {
    await supabaseRequest("records", { method: "POST", body: mapKeys(options.body, RECORD_COLUMNS) });
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

  if (path === "/records/add") {
    const records = readStored(RECORDS_KEY, []);
    records.push(options.body);
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
    recordsList.innerHTML = '<p class="empty-state">Painel bloqueado. Digite a senha do Painel RH para visualizar os registros.</p>';
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
  document.querySelector('[name="requestDate"]').value = todayDate();
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
