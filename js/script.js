// API Base URL - Try different options if needed
// Option 1: Standard XAMPP setup
const API_BASE = 'http://localhost/LIFELINE-NBSC/backend/';
// Option 2: If using port 8080
// const API_BASE = 'http://localhost:8080/lifeline_nbsc/backend/';
// Option 3: Using 127.0.0.1 instead of localhost
// const API_BASE = 'http://127.0.0.1/lifeline_nbsc/backend/';

// Message display elements
const loginMsg = document.getElementById("loginMessage");
const registerMsg = document.getElementById("registerMessage");

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
        const url = `${API_BASE}${endpoint}`;
        console.log('Fetching:', url); // Debug: See what URL is being called
        
        const response = await fetch(url, options);
        
        if (!response.ok) {
            console.error('HTTP Error:', response.status, response.statusText);
            return { success: false, message: `HTTP ${response.status}: ${response.statusText}` };
        }
        
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('API Error:', error);
        return { success: false, message: 'Connection error. Make sure XAMPP is running.' };
    }
}

async function loginUser(identifier, password) {
    return await apiRequest('auth.php', 'POST', { 
        action: 'login', 
        identifier: identifier, 
        password: password 
    });
}

async function registerUser(fullname, email, username, password) {
    return await apiRequest('auth.php', 'POST', {
        action: 'register',
        fullname: fullname,
        email: email,
        username: username,
        password: password
    });
}

async function checkSession() {
    try {
        const response = await fetch(`${API_BASE}auth.php?action=check`, {
            credentials: 'include'
        });
        const data = await response.json();
        if (data.logged_in) {
            window.location.href = "dashboard.html";
            return true;
        }
    } catch(e) {
        console.log('Session check failed:', e);
        // If backend fails, fallback to localStorage
        const session = localStorage.getItem("lifeline_session");
        if (session) {
            window.location.href = "dashboard.html";
        }
    }
    return false;
}

// Helper function to show messages
function showMessage(element, message, isError = false) {
    if (!element) return;
    element.innerHTML = message;
    element.style.color = isError ? '#bc3a2a' : '#4f7a5a';
    element.style.backgroundColor = isError ? '#ffe0e0' : '#e0ffe0';
    element.style.padding = '8px 12px';
    element.style.borderRadius = '6px';
    element.style.display = 'block';
    
    // Clear message after 5 seconds
    setTimeout(() => {
        if (element) {
            element.innerHTML = '';
            element.style.backgroundColor = 'transparent';
            element.style.display = 'none';
        }
    }, 5000);
}

// Tab switching functionality
function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (!tabBtns.length) return;
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            if (tab === 'login') {
                loginForm.classList.add('active-form');
                registerForm.classList.remove('active-form');
            } else {
                loginForm.classList.remove('active-form');
                registerForm.classList.add('active-form');
            }
        });
    });
    
    const switchLinks = document.querySelectorAll('.switch-link');
    switchLinks.forEach(link => {
        link.addEventListener('click', () => {
            const targetTab = link.dataset.switch;
            const targetBtn = document.querySelector(`.tab-btn[data-tab="${targetTab}"]`);
            if (targetBtn) targetBtn.click();
        });
    });
}

// Login submit handler
async function onLoginSubmit(e) {
    e.preventDefault();
    const identifier = document.getElementById("loginIdentifier").value.trim();
    const password = document.getElementById("loginPassword").value;
    
    if (!identifier || !password) {
        showMessage(loginMsg, "❌ Please enter both Email/Username and password.", true);
        return;
    }
    
    const submitBtn = document.querySelector('#loginFormElement .btn-rescue');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> LOGGING IN...';
    submitBtn.disabled = true;
    
    const result = await loginUser(identifier, password);
    
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
    
    if (result.success) {
        showMessage(loginMsg, "✅ " + result.message, false);
        localStorage.setItem("lifeline_session", JSON.stringify(result.user));
        setTimeout(() => {
            window.location.href = "dashboard.html";
        }, 1000);
    } else {
        showMessage(loginMsg, "❌ " + result.message, true);
    }
}

// Register submit handler
async function onRegisterSubmit(e) {
    e.preventDefault();
    const fullname = document.getElementById("regFullname").value.trim();
    const email = document.getElementById("regEmail").value.trim();
    const username = document.getElementById("regUsername").value.trim();
    const password = document.getElementById("regPassword").value;
    
    if (!fullname || !email || !username || !password) {
        showMessage(registerMsg, "❌ All fields are required.", true);
        return;
    }
    
    if (password.length < 6) {
        showMessage(registerMsg, "❌ Password must be at least 6 characters.", true);
        return;
    }
    
    if (!email.includes('@')) {
        showMessage(registerMsg, "❌ Please enter a valid email address.", true);
        return;
    }
    
    const submitBtn = document.querySelector('#registerFormElement .btn-rescue');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> REGISTERING...';
    submitBtn.disabled = true;
    
    const result = await registerUser(fullname, email, username, password);
    
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
    
    if (result.success) {
        showMessage(registerMsg, "✅ " + result.message + " Please login.", false);
        document.getElementById("regFullname").value = "";
        document.getElementById("regEmail").value = "";
        document.getElementById("regUsername").value = "";
        document.getElementById("regPassword").value = "";
        
        setTimeout(() => {
            const loginTab = document.querySelector('.tab-btn[data-tab="login"]');
            if (loginTab) loginTab.click();
        }, 2000);
    } else {
        showMessage(registerMsg, "❌ " + result.message, true);
    }
}

// Test backend connection on page load
async function testBackendConnection() {
    try {
        const response = await fetch(`${API_BASE}test.php`);
        const data = await response.json();
        console.log('Backend test:', data);
        if (data.status === 'ok') {
            console.log('✅ Backend is reachable!');
            return true;
        }
    } catch(e) {
        console.error('❌ Cannot reach backend:', e);
        console.log('Make sure:');
        console.log('1. XAMPP Apache is running');
        console.log('2. Files are in htdocs/lifeline_nbsc/');
        console.log(`3. URL is accessible: ${API_BASE}test.php`);
        return false;
    }
    return false;
}

// Initialize all event listeners
function init() {
    console.log('Initializing...');
    testBackendConnection();
    checkSession();
    initTabs();
    
    const loginForm = document.getElementById("loginFormElement");
    if (loginForm) {
        loginForm.addEventListener("submit", onLoginSubmit);
    }
    
    const registerForm = document.getElementById("registerFormElement");
    if (registerForm) {
        registerForm.addEventListener("submit", onRegisterSubmit);
    }
}

// Run initialization when DOM is ready
document.addEventListener("DOMContentLoaded", init);