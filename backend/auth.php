<?php
require_once 'config.php';

$response = ['success' => false, 'message' => 'Invalid request'];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        echo json_encode(['success' => false, 'message' => 'Invalid JSON input']);
        exit();
    }
    
    $action = $input['action'] ?? '';
    
    if ($action === 'login') {
        $identifier = trim($input['identifier'] ?? '');
        $password = $input['password'] ?? '';
        
        if (empty($identifier) || empty($password)) {
            echo json_encode(['success' => false, 'message' => 'All fields required']);
            exit();
        }
        
        $pdo = getDB();
        
        // Using prepared statement to prevent SQL injection
        $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ? OR email = ?");
        $stmt->execute([$identifier, $identifier]);
        $user = $stmt->fetch();
        
        if ($user && password_verify($password, $user['password'])) {
            $_SESSION['user_id'] = $user['user_id'];
            $_SESSION['username'] = $user['username'];
            $_SESSION['fullname'] = $user['fullname'];
            $_SESSION['role'] = $user['role'];
            
            // Log the login activity
            $logStmt = $pdo->prepare("INSERT INTO activity_logs (user_id, action, ip_address) VALUES (?, 'login', ?)");
            $logStmt->execute([$user['user_id'], $_SERVER['REMOTE_ADDR']]);
            
            $response = [
                'success' => true,
                'message' => 'Login successful',
                'user' => [
                    'user_id' => $user['user_id'],
                    'username' => $user['username'],
                    'fullname' => $user['fullname'],
                    'role' => $user['role']
                ]
            ];
        } else {
            $response = ['success' => false, 'message' => 'Invalid email/username or password'];
        }
    }
    
    elseif ($action === 'register') {
        $fullname = trim($input['fullname'] ?? '');
        $email = trim($input['email'] ?? '');
        $username = trim($input['username'] ?? '');
        $password = $input['password'] ?? '';
        
        if (empty($fullname) || empty($email) || empty($username) || empty($password)) {
            echo json_encode(['success' => false, 'message' => 'All fields required']);
            exit();
        }
        
        if (strlen($password) < 6) {
            echo json_encode(['success' => false, 'message' => 'Password must be at least 6 characters']);
            exit();
        }
        
        $pdo = getDB();
        
        // Check if email or username exists
        $checkStmt = $pdo->prepare("SELECT user_id FROM users WHERE email = ? OR username = ?");
        $checkStmt->execute([$email, $username]);
        if ($checkStmt->fetch()) {
            echo json_encode(['success' => false, 'message' => 'Email or username already exists']);
            exit();
        }
        
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $pdo->prepare("INSERT INTO users (fullname, email, username, password, role) VALUES (?, ?, ?, ?, 'responder')");
        
        if ($stmt->execute([$fullname, $email, $username, $hashedPassword])) {
            $response = ['success' => true, 'message' => 'Registration successful! You can now login.'];
        } else {
            $response = ['success' => false, 'message' => 'Registration failed. Please try again.'];
        }
    }
    
    elseif ($action === 'logout') {
        if (isset($_SESSION['user_id'])) {
            $pdo = getDB();
            $logStmt = $pdo->prepare("INSERT INTO activity_logs (user_id, action, ip_address) VALUES (?, 'logout', ?)");
            $logStmt->execute([$_SESSION['user_id'], $_SERVER['REMOTE_ADDR']]);
        }
        session_destroy();
        $response = ['success' => true, 'message' => 'Logged out successfully'];
    }
}

elseif ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['action']) && $_GET['action'] === 'check') {
    if (isset($_SESSION['user_id'])) {
        $response = [
            'logged_in' => true,
            'username' => $_SESSION['username'],
            'fullname' => $_SESSION['fullname'],
            'role' => $_SESSION['role']
        ];
    } else {
        $response = ['logged_in' => false];
    }
}

echo json_encode($response);
?>