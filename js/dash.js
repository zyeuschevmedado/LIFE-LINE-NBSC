// API Base URL
const API_BASE = 'http://localhost/LIFELINE-NBSC/backend/';
let incidents = [];
let sessionUser = null;
let severityChart = null;
let statusChart = null;

// Filter and sort state
let currentFilter = 'all';
let currentSort = 'date_desc';
let currentSearch = '';



// Add this test function
async function testBackendConnection() {
    try {
        const response = await fetch(`${API_BASE}test.php`);
        const data = await response.json();
        if (data.status === 'ok') {
            console.log('✅ Dashboard backend connected');
            return true;
        }
    } catch(e) {
        console.error('❌ Dashboard cannot connect to backend:', e);
        alert('Cannot connect to backend. Make sure XAMPP is running!\n\nURL: ' + API_BASE);
        return false;
    }
    return false;
}

async function apiRequest(endpoint, method, data = null) {
    const options = {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
    };
    if (data) {
        options.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, options);
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        return { success: false, message: 'Connection error' };
    }
}

// Load incidents from database
async function loadIncidents() {
    try {
        const result = await apiRequest('incidents.php', 'GET');
        if (result.success && result.incidents) {
            // Convert database format to frontend format
            incidents = result.incidents.map(inc => ({
                id: inc.incident_id,
                title: inc.title,
                desc: inc.description,
                location: inc.location,
                teams: inc.teams_assigned || inc.team_names || 'N/A',
                affected: inc.affected_count,
                severity: inc.severity,
                status: inc.status,
                createdAt: inc.created_at,
                created_by_name: inc.created_by_name || inc.creator_fullname || 'Unknown'
            }));
        } else {
            // Fallback to localStorage if no database
            const stored = localStorage.getItem("lifeline_incidents");
            if (stored) {
                incidents = JSON.parse(stored);
            } else {
                incidents = getSampleIncidents();
            }
        }
    } catch(e) {
        // Fallback to localStorage
        const stored = localStorage.getItem("lifeline_incidents");
        if (stored) {
            incidents = JSON.parse(stored);
        } else {
            incidents = getSampleIncidents();
        }
    }
    
    applyFiltersAndRender();
    updateStats();
    updateCharts();
    loadSQLJoinInfo();
}

function getSampleIncidents() {
    return [
        { id: "1", title: "Flash Flood - North Sector", desc: "rising waters, evacuation ongoing", location: "barangay 5, northern", teams: "3 teams", affected: "23 families", severity: "critical", status: "active", createdAt: new Date().toLocaleString(), created_by_name: "Admin" },
        { id: "2", title: "Landslide alert", desc: "monitoring east ridge", location: "eastern trail", teams: "2 scout teams", affected: "evacuation zone", severity: "high", status: "monitoring", createdAt: new Date().toLocaleString(), created_by_name: "Admin" },
        { id: "3", title: "Structure Fire", desc: "residential area fire", location: "barangay 3, central", teams: "4 fire trucks", affected: "5 families", severity: "critical", status: "active", createdAt: new Date().toLocaleString(), created_by_name: "Admin" }
    ];
}

// Apply filters, search, and sorting then render
function applyFiltersAndRender() {
    let filteredIncidents = [...incidents];
    
    // Apply status filter
    if (currentFilter !== 'all') {
        filteredIncidents = filteredIncidents.filter(inc => inc.status === currentFilter);
    }
    
    // Apply search
    if (currentSearch) {
        const searchLower = currentSearch.toLowerCase();
        filteredIncidents = filteredIncidents.filter(inc => 
            inc.title.toLowerCase().includes(searchLower) ||
            (inc.location && inc.location.toLowerCase().includes(searchLower)) ||
            (inc.desc && inc.desc.toLowerCase().includes(searchLower))
        );
    }
    
    // Apply sorting
    filteredIncidents.sort((a, b) => {
        switch(currentSort) {
            case 'date_desc':
                return new Date(b.createdAt) - new Date(a.createdAt);
            case 'date_asc':
                return new Date(a.createdAt) - new Date(b.createdAt);
            case 'severity_critical':
                const severityOrder = { critical: 1, high: 2, medium: 3, low: 4 };
                return (severityOrder[a.severity] || 5) - (severityOrder[b.severity] || 5);
            case 'severity_low':
                const severityOrderLow = { low: 1, medium: 2, high: 3, critical: 4 };
                return (severityOrderLow[a.severity] || 5) - (severityOrderLow[b.severity] || 5);
            case 'title_asc':
                return a.title.localeCompare(b.title);
            case 'title_desc':
                return b.title.localeCompare(a.title);
            default:
                return 0;
        }
    });
    
    renderIncidentTable(filteredIncidents);
}

// Render incidents to table
function renderIncidentTable(incidentsToRender) {
    const tbody = document.getElementById('incidentTableBody');
    if (!tbody) return;
    
    if (incidentsToRender.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align:center">No incidents found</td></tr>';
        return;
    }
    
    tbody.innerHTML = incidentsToRender.map(inc => `
        <tr>
            <td>${inc.id}</td>
            <td><strong>${escapeHtml(inc.title)}</strong></td>
            <td>${escapeHtml(inc.desc || '').substring(0, 50)}${(inc.desc || '').length > 50 ? '...' : ''}</td>
            <td>${escapeHtml(inc.location || '')}</td>
            <td>${escapeHtml(inc.teams || '')}</td>
            <td>${escapeHtml(inc.affected || '')}</td>
            <td><span class="badge-${inc.severity}">${inc.severity.toUpperCase()}</span></td>
            <td><span class="status-${inc.status}">${inc.status.toUpperCase()}</span></td>
            <td>${formatDate(inc.createdAt)}</td>
            <td>
                <button class="edit-btn" onclick="openEditModal(${inc.id})"><i class="fa-solid fa-pen"></i> Edit</button>
                <button class="del-btn" onclick="deleteIncident(${inc.id})"><i class="fa-solid fa-trash"></i> Del</button>
            </td>
        </tr>
    `).join('');
}

// Helper function to escape HTML
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Format date for display
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch(e) {
        return dateString;
    }
}

// Update statistics
function updateStats() {
    const total = incidents.length;
    const active = incidents.filter(i => i.status === 'active').length;
    const resolved = incidents.filter(i => i.status === 'resolved').length;
    
    // Calculate unique teams (simplified)
    const teamsSet = new Set();
    incidents.forEach(i => {
        if (i.teams) {
            const teamNames = i.teams.split(',').map(t => t.trim());
            teamNames.forEach(t => teamsSet.add(t));
        }
    });
    const teamsCount = teamsSet.size || Math.ceil(total / 3);
    
    document.getElementById('totalIncidents').innerText = total;
    document.getElementById('activeIncidents').innerText = active;
    document.getElementById('teamsCount').innerText = teamsCount;
    document.getElementById('resolvedCount').innerText = resolved;
}

// Update Charts
function updateCharts() {
    // Severity counts
    const severityCounts = {
        critical: incidents.filter(i => i.severity === 'critical').length,
        high: incidents.filter(i => i.severity === 'high').length,
        medium: incidents.filter(i => i.severity === 'medium').length,
        low: incidents.filter(i => i.severity === 'low').length
    };
    
    // Status counts
    const statusCounts = {
        active: incidents.filter(i => i.status === 'active').length,
        monitoring: incidents.filter(i => i.status === 'monitoring').length,
        resolved: incidents.filter(i => i.status === 'resolved').length
    };
    
    // Severity Chart
    const severityCtx = document.getElementById('severityChart')?.getContext('2d');
    if (severityCtx) {
        if (severityChart) severityChart.destroy();
        severityChart = new Chart(severityCtx, {
            type: 'pie',
            data: {
                labels: ['Critical', 'High', 'Medium', 'Low'],
                datasets: [{
                    data: [severityCounts.critical, severityCounts.high, severityCounts.medium, severityCounts.low],
                    backgroundColor: ['#bc3a2a', '#e0843a', '#e8b45a', '#4f7a5a'],
                    borderColor: '#fff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    }
    
    // Status Chart
    const statusCtx = document.getElementById('statusChart')?.getContext('2d');
    if (statusCtx) {
        if (statusChart) statusChart.destroy();
        statusChart = new Chart(statusCtx, {
            type: 'bar',
            data: {
                labels: ['Active', 'Monitoring', 'Resolved'],
                datasets: [{
                    label: 'Number of Incidents',
                    data: [statusCounts.active, statusCounts.monitoring, statusCounts.resolved],
                    backgroundColor: ['#bc3a2a', '#e8b45a', '#4f7a5a'],
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true, ticks: { precision: 0 } }
                }
            }
        });
    }
}

// Load SQL JOIN information from backend
async function loadSQLJoinInfo() {
    try {
        const result = await apiRequest('incidents.php?stats=true', 'GET');
        if (result.success && result.sql_joins_demo) {
            const sqlPanel = document.querySelector('.sql-info');
            if (sqlPanel) {
                sqlPanel.innerHTML = `
                    <i class="fa-solid fa-database"></i> <strong>SQL JOIN DEMONSTRATION (Live Database)</strong><br>
                    📊 Total Incidents: ${result.total} | Active: ${result.active} | Resolved: ${result.resolved}<br><br>
                    <code>🔗 INNER JOIN</code> - ${result.recent_incidents?.length || 0} incidents with valid creators<br>
                    <code>⬅️ LEFT JOIN</code> - Shows ALL ${result.user_stats?.length || 0} users (even without incidents)<br>
                    <code>➡️ RIGHT JOIN (simulated)</code> - Shows ALL ${result.team_stats?.length || 0} rescue teams<br>
                    <code>🔄 FULL OUTER JOIN (simulated)</code> - ${result.combined_records?.length || 0} combined records (incidents + teams)<br>
                    <br>
                    <i class="fa-solid fa-code"></i> <strong>SQL Queries Used:</strong><br>
                    • INNER JOIN: <code>incidents INNER JOIN users ON incidents.created_by = users.user_id</code><br>
                    • LEFT JOIN: <code>users LEFT JOIN incidents ON users.user_id = incidents.created_by</code><br>
                    • RIGHT JOIN: <code>rescue_teams LEFT JOIN incident_assignments</code><br>
                    • FULL OUTER: <code>UNION of incidents and rescue_teams</code>
                `;
            }
        }
    } catch(e) {
        console.log('Could not load SQL join info from backend');
    }
}

// Create incident with database
async function createIncident(incidentData) {
    const result = await apiRequest('incidents.php', 'POST', incidentData);
    if (result.success) {
        await loadIncidents(); // Reload from database
        return true;
    }
    return false;
}

// Update incident in database
async function updateIncident(incidentData) {
    const result = await apiRequest('incidents.php', 'PUT', incidentData);
    if (result.success) {
        await loadIncidents();
        return true;
    }
    return false;
}

// Delete incident from database
async function deleteIncidentFromDB(id) {
    const result = await apiRequest('incidents.php', 'DELETE', { incident_id: parseInt(id) });
    if (result.success) {
        await loadIncidents();
        return true;
    }
    return false;
}

// Global delete function
window.deleteIncident = async function(id) {
    if (confirm('Are you sure you want to delete this incident?')) {
        const success = await deleteIncidentFromDB(id);
        if (!success) {
            alert('Delete failed');
        }
    }
};

// Open edit modal
window.openEditModal = function(id) {
    const incident = incidents.find(inc => inc.id == id);
    if (!incident) return;
    
    document.getElementById('editId').value = incident.id;
    document.getElementById('editTitle').value = incident.title;
    document.getElementById('editDesc').value = incident.desc || '';
    document.getElementById('editLocation').value = incident.location || '';
    document.getElementById('editTeams').value = incident.teams || '';
    document.getElementById('editAffected').value = incident.affected || '';
    document.getElementById('editSeverity').value = incident.severity;
    document.getElementById('editStatus').value = incident.status;
    
    const modal = document.getElementById('editModal');
    if (modal) modal.style.display = 'flex';
};

// Create button handler
document.getElementById("createIncidentBtn")?.addEventListener("click", async () => {
    const title = document.getElementById("incidentTitle").value.trim();
    const severity = document.getElementById("incidentSeverity").value;
    const statusVal = document.getElementById("incidentStatusSelect").value;
    const desc = document.getElementById("incidentDesc").value.trim();
    const loc = document.getElementById("incidentLocation").value.trim();
    const teams = document.getElementById("incidentTeams").value.trim();
    const affected = document.getElementById("incidentAffected").value.trim();
    
    if (!title) { alert("Incident title required"); return; }
    
    const success = await createIncident({
        title: title,
        description: desc || "no details",
        location: loc || "unknown",
        teams: teams || "1 team",
        affected: affected || "unknown",
        severity: severity,
        status: statusVal
    });
    
    if (success) {
        // Clear form
        document.getElementById("incidentTitle").value = "";
        document.getElementById("incidentDesc").value = "";
        document.getElementById("incidentLocation").value = "";
        document.getElementById("incidentTeams").value = "";
        document.getElementById("incidentAffected").value = "";
    } else {
        alert('Failed to create incident. Make sure backend is running.');
    }
});

// Save edit handler
document.getElementById("saveEditBtn")?.addEventListener("click", async () => {
    const id = document.getElementById("editId").value;
    if (!id) return;
    
    const success = await updateIncident({
        incident_id: parseInt(id),
        title: document.getElementById("editTitle").value,
        description: document.getElementById("editDesc").value,
        location: document.getElementById("editLocation").value,
        teams: document.getElementById("editTeams").value,
        affected: document.getElementById("editAffected").value,
        severity: document.getElementById("editSeverity").value,
        status: document.getElementById("editStatus").value
    });
    
    if (success) {
        const modal = document.getElementById("editModal");
        if (modal) modal.style.display = "none";
    } else {
        alert('Update failed');
    }
});

// Close modal
document.getElementById("closeModalBtn")?.addEventListener("click", () => {
    const modal = document.getElementById("editModal");
    if (modal) modal.style.display = "none";
});

// Click outside modal to close
window.addEventListener("click", (e) => {
    const modal = document.getElementById("editModal");
    if (e.target === modal) {
        modal.style.display = "none";
    }
});

// Search input handler
document.getElementById("searchInput")?.addEventListener("input", (e) => {
    currentSearch = e.target.value;
    applyFiltersAndRender();
});

// Sort select handler
document.getElementById("sortSelect")?.addEventListener("change", (e) => {
    currentSort = e.target.value;
    applyFiltersAndRender();
});

// Filter buttons
document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        // Update active class
        document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        
        // Update filter
        currentFilter = btn.dataset.filter;
        applyFiltersAndRender();
    });
});

// Table header sorting
document.querySelectorAll(".alert-table th[data-sort]").forEach(th => {
    th.addEventListener("click", () => {
        const sortKey = th.dataset.sort;
        const sortSelect = document.getElementById("sortSelect");
        
        if (sortKey === 'id' || sortKey === 'date') {
            sortSelect.value = sortKey === 'date' ? 'date_desc' : 'date_desc';
        } else if (sortKey === 'title') {
            sortSelect.value = currentSort === 'title_asc' ? 'title_desc' : 'title_asc';
        } else if (sortKey === 'severity') {
            sortSelect.value = currentSort === 'severity_critical' ? 'severity_low' : 'severity_critical';
        } else if (sortKey === 'status') {
            // Simple toggle for status (by severity order)
            sortSelect.value = currentSort === 'severity_critical' ? 'severity_low' : 'severity_critical';
        } else if (sortKey === 'location') {
            sortSelect.value = currentSort === 'title_asc' ? 'title_desc' : 'title_asc';
        }
        
        currentSort = sortSelect.value;
        applyFiltersAndRender();
    });
});

// Session check
async function checkSession() {
    try {
        const response = await fetch(`${API_BASE}auth.php?action=check`, {
            credentials: 'include'
        });
        const data = await response.json();
        if (data.logged_in) {
            sessionUser = data;
            const userNameElement = document.getElementById("dashboardUserName");
            if (userNameElement) userNameElement.innerText = data.username || data.fullname || "responder";
        } else {
            // Fallback to localStorage
            const sessionRaw = localStorage.getItem("lifeline_session");
            if (sessionRaw) {
                sessionUser = JSON.parse(sessionRaw);
                const userNameElement = document.getElementById("dashboardUserName");
                if (userNameElement) userNameElement.innerText = sessionUser.username || "responder";
            } else {
                window.location.href = "index.html";
            }
        }
    } catch(e) {
        const sessionRaw = localStorage.getItem("lifeline_session");
        if (sessionRaw) {
            sessionUser = JSON.parse(sessionRaw);
            const userNameElement = document.getElementById("dashboardUserName");
            if (userNameElement) userNameElement.innerText = sessionUser.username || "responder";
        } else {
            window.location.href = "index.html";
        }
    }
}

// Logout
document.getElementById("logoutDashboardBtn")?.addEventListener("click", async () => {
    await apiRequest('auth.php', 'POST', { action: 'logout' });
    localStorage.removeItem("lifeline_session");
    window.location.href = "index.html";
});

// Initialize
checkSession();
loadIncidents();