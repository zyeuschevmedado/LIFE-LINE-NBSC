// dashboard-crud.js - LIFELINE NBSC emergency monitoring CRUD
let incidents = [];
let sessionUser = null;

function loadIncidents() {
  const stored = localStorage.getItem("lifeline_incidents");
  if(stored) {
    incidents = JSON.parse(stored);
  } else {
    incidents = [
      { id: "inc1", title: "Flash Flood - North Sector", desc: "rising waters, evacuation ongoing", location: "barangay 5, northern", teams: "3 teams", affected: "23 families", severity: "critical", status: "active", createdAt: new Date().toLocaleString() },
      { id: "inc2", title: "Landslide alert", desc: "monitoring east ridge", location: "eastern trail", teams: "2 scout teams", affected: "evacuation zone", severity: "high", status: "monitoring", createdAt: new Date().toLocaleString() }
    ];
    saveIncidents();
  }
  renderIncidentTable();
  updateStats();
}
function saveIncidents() { localStorage.setItem("lifeline_incidents", JSON.stringify(incidents)); }
function generateId() { return Date.now().toString() + "-" + Math.floor(Math.random()*1000); }

function renderIncidentTable() {
  const tbody = document.getElementById("incidentTableBody");
  if(!tbody) return;
  if(incidents.length === 0) { tbody.innerHTML = "<tr><td colspan='10' style='text-align:center'>no incidents recorded</td></tr>"; return; }
  let html = "";
  incidents.forEach(inc => {
    let sevClass = "badge-medium";
    if(inc.severity === "critical") sevClass = "badge-critical";
    else if(inc.severity === "high") sevClass = "badge-high";
    else if(inc.severity === "low") sevClass = "badge-low";
    let statClass = "status-active";
    if(inc.status === "monitoring") statClass = "status-monitor";
    if(inc.status === "resolved") statClass = "status-resolved";
    html += `<tr>
      <td>${inc.id}</td>
      <td>${escapeHtml(inc.title)}</td>
      <td>${escapeHtml(inc.desc)}</td>
      <td>${escapeHtml(inc.location)}</td>
      <td>${escapeHtml(inc.teams)}</td>
      <td>${escapeHtml(inc.affected)}</td>
      <td><span class="${sevClass}">${inc.severity.toUpperCase()}</span></td>
      <td><span class="${statClass}">${inc.status.toUpperCase()}</span></td>
      <td>${inc.createdAt || "just now"}</td>
      <td><button class="edit-btn" data-id="${inc.id}">EDIT</button> <button class="del-btn" data-id="${inc.id}">DEL</button></td>
    </tr>`;
  });
  tbody.innerHTML = html;
  document.querySelectorAll(".edit-btn").forEach(btn => {
    btn.addEventListener("click", (e) => openEditModal(btn.getAttribute("data-id")));
  });
  document.querySelectorAll(".del-btn").forEach(btn => {
    btn.addEventListener("click", (e) => { if(confirm("delete incident?")) deleteIncident(btn.getAttribute("data-id")); });
  });
}

function escapeHtml(str) { if(!str) return ""; return str.replace(/[&<>]/g, function(m){ if(m==='&') return '&amp;'; if(m==='<') return '&lt;'; if(m==='>') return '&gt;'; return m;}); }

function updateStats() {
  document.getElementById("totalIncidents").innerText = incidents.length;
  const activeAlerts = incidents.filter(i => i.status === "active").length;
  document.getElementById("activeIncidents").innerText = activeAlerts;
  const teamsSum = incidents.reduce((acc, i) => { let num = parseInt(i.teams) || 0; return acc + num; }, 0);
  document.getElementById("teamsCount").innerText = teamsSum || 0;
  const resolved = incidents.filter(i => i.status === "resolved").length;
  document.getElementById("resolvedCount").innerText = resolved;
}

document.getElementById("createIncidentBtn")?.addEventListener("click", () => {
  const title = document.getElementById("incidentTitle").value.trim();
  const severity = document.getElementById("incidentSeverity").value;
  const statusVal = document.getElementById("incidentStatusSelect").value;
  const desc = document.getElementById("incidentDesc").value.trim();
  const loc = document.getElementById("incidentLocation").value.trim();
  const teams = document.getElementById("incidentTeams").value.trim();
  const affected = document.getElementById("incidentAffected").value.trim();
  if(!title) { alert("incident title required"); return; }
  const newInc = {
    id: generateId(),
    title: title,
    desc: desc || "no details",
    location: loc || "unknown",
    teams: teams || "1 team",
    affected: affected || "unknown",
    severity: severity,
    status: statusVal,
    createdAt: new Date().toLocaleString()
  };
  incidents.unshift(newInc);
  saveIncidents();
  renderIncidentTable();
  updateStats();
  document.getElementById("incidentTitle").value = "";
  document.getElementById("incidentDesc").value = "";
  document.getElementById("incidentLocation").value = "";
  document.getElementById("incidentTeams").value = "";
  document.getElementById("incidentAffected").value = "";
});

function deleteIncident(id) {
  incidents = incidents.filter(inc => inc.id !== id);
  saveIncidents();
  renderIncidentTable();
  updateStats();
}

const modal = document.getElementById("editModal");
function openEditModal(id) {
  const inc = incidents.find(i => i.id === id);
  if(!inc) return;
  document.getElementById("editId").value = inc.id;
  document.getElementById("editTitle").value = inc.title;
  document.getElementById("editDesc").value = inc.desc;
  document.getElementById("editLocation").value = inc.location;
  document.getElementById("editTeams").value = inc.teams;
  document.getElementById("editAffected").value = inc.affected;
  document.getElementById("editSeverity").value = inc.severity;
  document.getElementById("editStatus").value = inc.status;
  modal.style.display = "flex";
}
document.getElementById("saveEditBtn")?.addEventListener("click", () => {
  const id = document.getElementById("editId").value;
  const index = incidents.findIndex(i => i.id === id);
  if(index !== -1) {
    incidents[index].title = document.getElementById("editTitle").value;
    incidents[index].desc = document.getElementById("editDesc").value;
    incidents[index].location = document.getElementById("editLocation").value;
    incidents[index].teams = document.getElementById("editTeams").value;
    incidents[index].affected = document.getElementById("editAffected").value;
    incidents[index].severity = document.getElementById("editSeverity").value;
    incidents[index].status = document.getElementById("editStatus").value;
    saveIncidents();
    renderIncidentTable();
    updateStats();
  }
  modal.style.display = "none";
});
document.getElementById("closeModalBtn")?.addEventListener("click", () => { modal.style.display = "none"; });
window.addEventListener("click", (e) => { if(e.target === modal) modal.style.display = "none"; });

// session check + display name
const sessionRaw = localStorage.getItem("lifeline_session");
if(sessionRaw) {
  sessionUser = JSON.parse(sessionRaw);
  document.getElementById("dashboardUserName").innerText = sessionUser.username || "responder";
} else {
  window.location.href = "index.html";
}
document.getElementById("logoutDashboardBtn")?.addEventListener("click", () => {
  localStorage.removeItem("lifeline_session");
  window.location.href = "index.html";
});

loadIncidents();