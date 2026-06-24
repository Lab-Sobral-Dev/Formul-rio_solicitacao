const STORAGE_KEY = "horarioSolicitacoes";
const RH_EMAIL = "rh@empresa.com.br";

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
const monthCount = document.querySelector("#monthCount");
const semesterCount = document.querySelector("#semesterCount");
const yearCount = document.querySelector("#yearCount");
const saveStatus = document.querySelector("#saveStatus");
const employeeIdInput = document.querySelector("#employeeIdInput");
const lookupStatus = document.querySelector("#lookupStatus");
const rqSection = document.querySelector("#rqSection");
const stepEmployee = document.querySelector("#stepEmployee");
const stepRequest = document.querySelector("#stepRequest");
const controlMetric = document.querySelector("#controlMetric");
const sidebar = document.querySelector(".sidebar");
const sidebarToggle = document.querySelector(".sb-toggle");

const EMPLOYEES_BY_ID = {
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

function resetControlState() {
  controlIdTime = "";
  controlIdText.textContent = "Buscar o registro do Control ID antes de salvar.";
  clockStatus.textContent = "Control ID: aguardando ponto";
  controlMetric.textContent = "Pendente";
  document.querySelector('[name="requestDate"]').value = todayDate();
}

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function setField(name, value) {
  const field = form.elements[name];
  if (field) field.value = value || "";
}

function clearEmployeeFields() {
  ["employeeName", "department", "role", "managerName", "registeredSchedule"].forEach((name) => setField(name, ""));
}

function setRequestSectionEnabled(enabled) {
  rqSection.disabled = !enabled;
  rqSection.classList.toggle("locked-section", !enabled);
  stepEmployee.classList.toggle("active", !enabled);
  stepRequest.classList.toggle("active", enabled);
}

function fillEmployeeById(employeeId) {
  const employee = EMPLOYEES_BY_ID[employeeId];

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

function loadRecords() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
}

function saveRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
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
    `Horario atual: ${record.currentTime || "-"}`,
    `Horario solicitado: ${record.requestedTime || "-"}`,
    `Retorno: ${record.returnTime || "-"}`,
    `Horario registrado no Control ID: ${record.controlIdTime || "-"}`,
    `Motivo: ${record.reason}`,
    "",
    "Assinaturas digitais:",
    `Funcionario: ${record.employeeApproval ? "assinado" : "pendente"}`,
    `Chefe do setor: ${record.managerApproval ? "assinado" : "pendente"}`,
    `RH: ${record.hrApproval ? "assinado" : "pendente"}`
  ].join("\n");

  return `mailto:${RH_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function populateDepartmentFilter(records) {
  const current = departmentFilter.value;
  const departments = [...new Set(records.map((record) => record.department))].sort();

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
      node.querySelector('[data-field="requestedTime"]').textContent = record.requestedTime || "-";
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

syncControlId.addEventListener("click", () => {
  controlIdTime = currentClockTime();
  controlIdText.textContent = `Ponto encontrado no Control ID: ${controlIdTime}`;
  clockStatus.textContent = `Control ID: ${controlIdTime}`;
  controlMetric.textContent = controlIdTime;
});

sidebarToggle.addEventListener("click", () => {
  sidebar.classList.toggle("open");
});

form.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!controlIdTime) {
    controlIdTime = currentClockTime();
    controlIdText.textContent = `Ponto registrado automaticamente: ${controlIdTime}`;
  }

  const data = new FormData(form);
  const records = loadRecords();
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
    reason: getFormValue(data, "reason"),
    controlIdTime,
    employeeApproval: data.get("employeeApproval") === "on",
    managerApproval: data.get("managerApproval") === "on",
    hrApproval: data.get("hrApproval") === "on",
    createdAt: new Date().toISOString()
  };

  records.push(record);
  saveRecords(records);
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

clearStorage.addEventListener("click", () => {
  if (!confirm("Deseja apagar todos os registros salvos neste navegador?")) return;
  saveRecords([]);
  renderRecords();
});

document.querySelector('[name="requestDate"]').value = todayDate();
setRequestSectionEnabled(false);
renderRecords();
