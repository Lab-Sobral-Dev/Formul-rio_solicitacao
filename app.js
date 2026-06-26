const STORAGE_KEY = "horarioSolicitacoes";
const SESSION_KEY = "rhSobralSession";
const RH_ACCESS_KEY = "rhCoordinatorFingerprint";
const IDBIO_BRIDGE_URL = "http://127.0.0.1:5055";
const RH_EMAIL = "rh@empresa.com.br";
const LOGIN_USER = "rh.sobral";
const LOGIN_PASSWORD = "1234";

const loginForm = document.querySelector("#loginForm");
const loginError = document.querySelector("#loginError");
const loginUsername = document.querySelector("#loginUsername");
const loginPassword = document.querySelector("#loginPassword");
const loginSubmit = document.querySelector("#loginSubmit");
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
const rhTab = document.querySelector("#painel-rh");
const rhNavItem = document.querySelector('[data-tab-target="painel-rh"]');
const rhRegisterFingerprintButton = document.querySelector("#rhRegisterFingerprintButton");
const rhFingerprintButton = document.querySelector("#rhFingerprintButton");
const rhLockStatus = document.querySelector("#rhLockStatus");
const signatureWarning = document.querySelector("#signatureWarning");
const signatureSubmit = document.querySelector("#signatureSubmit");
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

function unlockApp() {
  document.body.classList.remove("login-locked");
}

function lockApp() {
  document.body.classList.add("login-locked");
}

function isAuthenticated() {
  return localStorage.getItem(SESSION_KEY) === "active";
}

function setAuthenticated() {
  localStorage.setItem(SESSION_KEY, "active");
  loginError.classList.remove("visible");
  unlockApp();
}

function logout() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(RH_ACCESS_KEY);
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

function unlockRhPanel() {
  sessionStorage.setItem(RH_ACCESS_KEY, "authorized");
  rhLock.hidden = true;
  rhTab.classList.remove("rh-tab-locked");
  rhNavItem.classList.remove("rh-nav-locked");
  rhPanelContent.setAttribute("aria-disabled", "false");
  rhPanelContent.classList.remove("locked");
  rhPanelContent.classList.add("unlocked");
  rhLockStatus.textContent = "";
}

function lockRhPanel() {
  sessionStorage.removeItem(RH_ACCESS_KEY);
  rhLock.hidden = false;
  rhTab.classList.add("rh-tab-locked");
  rhNavItem.classList.add("rh-nav-locked");
  rhPanelContent.setAttribute("aria-disabled", "true");
  rhPanelContent.classList.add("locked");
  rhPanelContent.classList.remove("unlocked");
  recordsList.innerHTML = '<p class="empty-state">Painel bloqueado. Valide uma digital admin para visualizar os registros.</p>';
}

function setBiometricBusy(isBusy) {
  rhRegisterFingerprintButton.disabled = isBusy;
  rhFingerprintButton.disabled = isBusy;
}

async function callIdBioBridge(path) {
  let response;
  try {
    response = await fetch(`${IDBIO_BRIDGE_URL}${path}`, { method: "POST" });
  } catch (error) {
    throw new Error("Ponte local do iDBio nao encontrada. Abra o sistema pelo arquivo abrir-formulario.bat.");
  }
  const payload = await response.json();
  if (!response.ok || !payload.ok) {
    throw new Error(payload.message || "Falha ao comunicar com o leitor iDBio.");
  }
  return payload;
}

async function registerRhFingerprint() {
  setBiometricBusy(true);
  rhLockStatus.textContent = "Aguardando digital admin no leitor Control iD...";

  try {
    const result = await callIdBioBridge("/register");
    rhLockStatus.textContent = `${result.message} Agora valide a digital admin para acessar o painel.`;
  } catch (error) {
    rhLockStatus.textContent = `Nao foi possivel cadastrar a digital: ${error.message}`;
  } finally {
    setBiometricBusy(false);
  }
}

async function validateRhFingerprint() {
  setBiometricBusy(true);
  rhLockStatus.textContent = "Lendo digital admin no leitor Control iD...";

  try {
    await callIdBioBridge("/verify");
    unlockRhPanel();
    renderRecords();
  } catch (error) {
    rhLockStatus.textContent = `Digital nao validada: ${error.message}`;
  } finally {
    setBiometricBusy(false);
  }
}

function setActiveTab(tabId) {
  tabPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.id === tabId);
  });

  tabTriggers.forEach((trigger) => {
    const isActive = trigger.dataset.tabTarget === tabId;
    trigger.classList.toggle("active", isActive);
    if (trigger.getAttribute("role") === "tab") {
      trigger.setAttribute("aria-selected", String(isActive));
    }
  });

  if (sidebar.classList.contains("open")) sidebar.classList.remove("open");
  if (tabId === "painel-rh" && !hasRhAccess()) {
    rhLockStatus.textContent = "Painel do RH bloqueado. Valide uma digital admin cadastrada.";
  }
}

function approvalsAreComplete(data) {
  return ["employeeApproval", "managerApproval", "hrApproval"].every((name) => data.get(name) === "on");
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
  if (stepEmployee) stepEmployee.classList.toggle("active", !enabled);
  if (stepRequest) stepRequest.classList.toggle("active", enabled);
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

tabTriggers.forEach((trigger) => {
  trigger.addEventListener("click", (event) => {
    event.preventDefault();
    setActiveTab(trigger.dataset.tabTarget);
  });
});

signatureSubmit.addEventListener("click", () => {
  setActiveTab("nova-solicitacao");
});

form.addEventListener("submit", (event) => {
  event.preventDefault();

  let data = new FormData(form);

  if (!approvalsAreComplete(data)) {
    signatureWarning.textContent = "Todas as assinaturas precisam ser marcadas para salvar.";
    setActiveTab("assinaturas");
    return;
  }

  signatureWarning.textContent = "";

  if (!controlIdTime) {
    controlIdTime = currentClockTime();
    fillPointTime(controlIdTime);
    controlIdText.textContent = `Ponto registrado automaticamente: ${controlIdTime}`;
  }

  data = new FormData(form);
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
    returnStatus: getFormValue(data, "returnStatus") || "Vai retornar",
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
    signatureWarning.textContent = "";
    requestId.textContent = "Rascunho";
  }, 0);
});

departmentFilter.addEventListener("change", renderRecords);
employeeFilter.addEventListener("input", renderRecords);

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

clearStorage.addEventListener("click", () => {
  if (!hasRhAccess()) {
    setActiveTab("painel-rh");
    rhLockStatus.textContent = "Valide uma digital admin antes de limpar registros.";
    return;
  }
  if (!confirm("Deseja apagar todos os registros salvos neste navegador?")) return;
  saveRecords([]);
  renderRecords();
});

rhRegisterFingerprintButton.addEventListener("click", registerRhFingerprint);
rhFingerprintButton.addEventListener("click", validateRhFingerprint);

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  loginSubmit.disabled = true;
  loginSubmit.textContent = "Autenticando...";
  const data = new FormData(loginForm);
  const username = String(data.get("username") || "").trim().toLowerCase();
  const password = String(data.get("password") || "");

  if (username === LOGIN_USER && password === LOGIN_PASSWORD) {
    loginSubmit.textContent = "Entrar";
    setAuthenticated();
    return;
  }

  loginError.textContent = "Usuario ou senha invalidos.";
  loginError.classList.add("visible");
  loginSubmit.textContent = "Entrar";
  syncLoginSubmit();
});

logoutButton.addEventListener("click", logout);

document.querySelector('[name="requestDate"]').value = todayDate();
initMatrixBackground();
syncLoginSubmit();
setRequestSectionEnabled(false);
if (hasRhAccess()) unlockRhPanel();
else lockRhPanel();
renderRecords();
if (isAuthenticated()) unlockApp();
