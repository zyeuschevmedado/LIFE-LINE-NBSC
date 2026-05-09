<?php
require_once 'config.php';

// Ensure required tables exist
try {
    $pdo = getDB();
    
    // Create rescue_teams table if not exists
    $pdo->exec("CREATE TABLE IF NOT EXISTS rescue_teams (
        team_id INT AUTO_INCREMENT PRIMARY KEY,
        team_name VARCHAR(100) NOT NULL,
        status VARCHAR(50) DEFAULT 'available',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");
    
    // Create incident_assignments table if not exists (for team assignments)
    $pdo->exec("CREATE TABLE IF NOT EXISTS incident_assignments (
        assignment_id INT AUTO_INCREMENT PRIMARY KEY,
        incident_id INT NOT NULL,
        team_id INT NOT NULL,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (incident_id) REFERENCES incidents(incident_id) ON DELETE CASCADE,
        FOREIGN KEY (team_id) REFERENCES rescue_teams(team_id) ON DELETE CASCADE
    )");
    
    // Add some sample teams if empty
    $checkTeams = $pdo->query("SELECT COUNT(*) FROM rescue_teams")->fetchColumn();
    if ($checkTeams == 0) {
        $pdo->exec("INSERT INTO rescue_teams (team_name, status) VALUES 
            ('Water Rescue Unit 1', 'active'),
            ('Medical Response Team', 'active'),
            ('Fire Suppression Unit', 'standby'),
            ('Search and Rescue Alpha', 'active'),
            ('Evacuation Support', 'standby')");
    }
    
    // Add some sample assignments for existing incidents (optional)
    $checkAssignments = $pdo->query("SELECT COUNT(*) FROM incident_assignments")->fetchColumn();
    if ($checkAssignments == 0) {
        // Get first incident and first team to create a sample assignment
        $incidentCheck = $pdo->query("SELECT incident_id FROM incidents LIMIT 1")->fetchColumn();
        $teamCheck = $pdo->query("SELECT team_id FROM rescue_teams LIMIT 1")->fetchColumn();
        if ($incidentCheck && $teamCheck) {
            $pdo->prepare("INSERT INTO incident_assignments (incident_id, team_id) VALUES (?, ?)")->execute([$incidentCheck, $teamCheck]);
        }
    }
} catch (PDOException $e) {
    // Log error but continue - tables might already exist
    error_log("Table creation warning: " . $e->getMessage());
}

// Check authentication
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized - Please login first']);
    exit();
}

$pdo = getDB();
$user_id = $_SESSION['user_id'];
$method = $_SERVER['REQUEST_METHOD'];

// ============================================
// READ - GET incidents with SQL JOIN DEMONSTRATIONS
// ============================================
if ($method === 'GET') {
    // Check if this is a stats request
    if (isset($_GET['stats']) && $_GET['stats'] === 'true') {
        
        // ========== LEFT JOIN DEMONSTRATION ==========
        // Shows ALL users even if they have no incidents
        $leftJoinSQL = "SELECT u.user_id, u.username, u.fullname, COUNT(i.incident_id) as incident_count
                        FROM users u
                        LEFT JOIN incidents i ON u.user_id = i.created_by
                        GROUP BY u.user_id
                        ORDER BY incident_count DESC";
        $leftStmt = $pdo->prepare($leftJoinSQL);
        $leftStmt->execute();
        $user_stats = $leftStmt->fetchAll();
        
        // ========== INNER JOIN DEMONSTRATION ==========
        // Shows only incidents that have valid creator (matching users)
        $innerJoinSQL = "SELECT i.incident_id, i.title, i.severity, i.status, u.username as creator
                         FROM incidents i
                         INNER JOIN users u ON i.created_by = u.user_id
                         LIMIT 10";
        $innerStmt = $pdo->prepare($innerJoinSQL);
        $innerStmt->execute();
        $recent_incidents = $innerStmt->fetchAll();
        
        // ========== RIGHT JOIN SIMULATION ==========
        // Shows all teams even if not assigned to incidents
        $rightJoinSQL = "SELECT rt.team_id, rt.team_name, rt.status, COUNT(ia.incident_id) as assigned_count
                         FROM rescue_teams rt
                         LEFT JOIN incident_assignments ia ON rt.team_id = ia.team_id
                         GROUP BY rt.team_id";
        $rightStmt = $pdo->prepare($rightJoinSQL);
        $rightStmt->execute();
        $team_stats = $rightStmt->fetchAll();
        
        // ========== FULL OUTER JOIN SIMULATION ==========
        // Combines LEFT and RIGHT JOIN results (MySQL doesn't support FULL OUTER JOIN natively)
        $fullOuterSQL = "SELECT 'incident' as type, incident_id as id, title as name, status FROM incidents
                         UNION ALL
                         SELECT 'team' as type, team_id as id, team_name as name, status FROM rescue_teams";
        $fullStmt = $pdo->prepare($fullOuterSQL);
        $fullStmt->execute();
        $combined_records = $fullStmt->fetchAll();
        
        // Get basic stats
        $totalStmt = $pdo->query("SELECT COUNT(*) as count FROM incidents");
        $activeStmt = $pdo->query("SELECT COUNT(*) as count FROM incidents WHERE status = 'active'");
        $resolvedStmt = $pdo->query("SELECT COUNT(*) as count FROM incidents WHERE status = 'resolved'");
        
        // Get recent activity logs with user info (INNER JOIN)
        $logSQL = "SELECT l.*, u.username 
                   FROM activity_logs l
                   INNER JOIN users u ON l.user_id = u.user_id
                   ORDER BY l.timestamp DESC LIMIT 10";
        $logStmt = $pdo->prepare($logSQL);
        $logStmt->execute();
        $recent_logs = $logStmt->fetchAll();
        
        echo json_encode([
            'success' => true,
            'total' => $totalStmt->fetch()['count'],
            'active' => $activeStmt->fetch()['count'],
            'resolved' => $resolvedStmt->fetch()['count'],
            'user_stats' => $user_stats,
            'team_stats' => $team_stats,
            'recent_incidents' => $recent_incidents,
            'combined_records' => $combined_records,
            'recent_logs' => $recent_logs,
            'sql_joins_demo' => [
                'left_join' => 'SELECT ... FROM users LEFT JOIN incidents ... Shows ALL users even without incidents',
                'inner_join' => 'SELECT ... FROM incidents INNER JOIN users ... Shows only incidents with valid creators',
                'right_join_simulated' => 'SELECT ... FROM rescue_teams LEFT JOIN incident_assignments ... Shows ALL teams',
                'full_outer_simulated' => 'UNION of incidents and teams - Complete set of all records'
            ]
        ]);
        exit();
    }
    
    // ============================================
    // MAIN GET - Fetch all incidents with JOIN to get creator info
    // Using INNER JOIN to demonstrate relationship
    // ============================================
    $sql = "SELECT i.*, u.username as created_by_name, u.fullname as creator_fullname,
                   COUNT(DISTINCT ia.team_id) as teams_count,
                   GROUP_CONCAT(DISTINCT rt.team_name SEPARATOR ', ') as team_names
            FROM incidents i
            LEFT JOIN users u ON i.created_by = u.user_id
            LEFT JOIN incident_assignments ia ON i.incident_id = ia.incident_id
            LEFT JOIN rescue_teams rt ON ia.team_id = rt.team_id
            GROUP BY i.incident_id
            ORDER BY i.created_at DESC";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    $incidents = $stmt->fetchAll();
    
    echo json_encode(['success' => true, 'incidents' => $incidents]);
}

// ============================================
// CREATE - POST new incident
// ============================================
elseif ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $sql = "INSERT INTO incidents (title, description, location, teams_assigned, affected_count, severity, status, created_by) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
    $stmt = $pdo->prepare($sql);
    $result = $stmt->execute([
        $input['title'],
        $input['description'] ?? '',
        $input['location'],
        $input['teams'] ?? '',
        $input['affected'] ?? '',
        $input['severity'],
        $input['status'],
        $user_id
    ]);
    
    if ($result) {
        $incident_id = $pdo->lastInsertId();
        
        // Log activity
        $logStmt = $pdo->prepare("INSERT INTO activity_logs (user_id, action, incident_id, ip_address) VALUES (?, 'create', ?, ?)");
        $logStmt->execute([$user_id, $incident_id, $_SERVER['REMOTE_ADDR']]);
        
        echo json_encode(['success' => true, 'message' => 'Incident created successfully', 'incident_id' => $incident_id]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to create incident']);
    }
}

// ============================================
// UPDATE - PUT incident
// ============================================
elseif ($method === 'PUT') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $sql = "UPDATE incidents SET title = ?, description = ?, location = ?, 
            teams_assigned = ?, affected_count = ?, severity = ?, status = ? 
            WHERE incident_id = ?";
    $stmt = $pdo->prepare($sql);
    $result = $stmt->execute([
        $input['title'],
        $input['description'],
        $input['location'],
        $input['teams'],
        $input['affected'],
        $input['severity'],
        $input['status'],
        $input['incident_id']
    ]);
    
    if ($result) {
        $logStmt = $pdo->prepare("INSERT INTO activity_logs (user_id, action, incident_id, ip_address) VALUES (?, 'update', ?, ?)");
        $logStmt->execute([$user_id, $input['incident_id'], $_SERVER['REMOTE_ADDR']]);
        echo json_encode(['success' => true, 'message' => 'Incident updated successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to update incident']);
    }
}

// ============================================
// DELETE - DELETE incident
// ============================================
elseif ($method === 'DELETE') {
    $input = json_decode(file_get_contents('php://input'), true);
    $incident_id = $input['incident_id'];
    
    // Log before deletion
    $logStmt = $pdo->prepare("INSERT INTO activity_logs (user_id, action, incident_id, ip_address) VALUES (?, 'delete', ?, ?)");
    $logStmt->execute([$user_id, $incident_id, $_SERVER['REMOTE_ADDR']]);
    
    $sql = "DELETE FROM incidents WHERE incident_id = ?";
    $stmt = $pdo->prepare($sql);
    $result = $stmt->execute([$incident_id]);
    
    echo json_encode(['success' => $result, 'message' => $result ? 'Incident deleted successfully' : 'Delete failed']);
}
?>