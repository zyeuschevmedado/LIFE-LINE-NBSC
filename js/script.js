
let users = [];

// Load users from localStorage
function loadUsersFromStorage() {
  const stored = localStorage.getItem("nbsc_rescue_users");
  if (stored) {
    users = JSON.parse(stored);
  } else {
    users = [
      {
        fullname: "Alex Rivera",
        email: "captain@lifeline.org",
        username: "rescuelead",
        password: "lifeline123",
      },
      {
        fullname: "Maria Santiago",
        email: "rescue@example.com",
        username: "firstresponder",
        password: "rescue123",
      },
    ];
    saveUsersToStorage();
  }
}

// Save users to localStorage
function saveUsersToStorage() {
  localStorage.setItem("nbsc_rescue_users", JSON.stringify(users));
}

// Find user by username or email
function findUserByIdentifier(identifier) {
  return users.find((u) => u.username === identifier || u.email === identifier);
}

// Register new user
function registerUser(fullname, email, username, password) {
  if (!fullname || !email || !username || !password) {
    return { success: false, msg: "All fields required." };
  }
  if (password.length < 6) {
    return { success: false, msg: "Password must be at least 6 characters." };
  }
  if (users.find((u) => u.email === email)) {
    return { success: false, msg: "Email already registered." };
  }
  if (users.find((u) => u.username === username)) {
    return { success: false, msg: "Username already taken." };
  }

  const newUser = { fullname, email, username, password };
  users.push(newUser);
  saveUsersToStorage();
  return { success: true, msg: "Registration successful! You can now log in." };
}

// Login user
function loginUser(identifier, password) {
  const user = findUserByIdentifier(identifier);
  if (!user) {
    return {
      success: false,
      msg: "No account found with that email/username.",
    };
  }
  if (user.password !== password) {
    return { success: false, msg: "Incorrect password. Try again." };
  }
  return { success: true, msg: "Login successful!", user: user };
}

// DOM Elements
const loginFormDiv = document.getElementById("loginForm");
const registerFormDiv = document.getElementById("registerForm");
const tabBtns = document.querySelectorAll(".tab-btn");
const loginMsg = document.getElementById("loginMessage");
const regMsg = document.getElementById("registerMessage");

// Show message helper
function showMessage(element, message, isError = true) {
  if (!element) return;
  element.innerHTML = message;
  element.style.color = isError ? "#bd6232" : "#2e7d64";
  element.style.backgroundColor = isError
    ? "rgba(189, 98, 50, 0.1)"
    : "rgba(46, 125, 100, 0.1)";

  setTimeout(() => {
    if (element) {
      element.innerHTML = "";
      element.style.backgroundColor = "transparent";
    }
  }, 3000);
}

// Switch between login and register tabs
function switchTab(tabId) {
  tabBtns.forEach((btn) => {
    if (btn.getAttribute("data-tab") === tabId) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  if (tabId === "login") {
    loginFormDiv.classList.add("active-form");
    registerFormDiv.classList.remove("active-form");
  } else {
    registerFormDiv.classList.add("active-form");
    loginFormDiv.classList.remove("active-form");
  }

  if (loginMsg) loginMsg.innerHTML = "";
  if (regMsg) regMsg.innerHTML = "";
}

// Clear form fields
function clearForms() {
  const loginId = document.getElementById("loginIdentifier");
  const loginPw = document.getElementById("loginPassword");
  const regFull = document.getElementById("regFullname");
  const regEmail = document.getElementById("regEmail");
  const regUser = document.getElementById("regUsername");
  const regPw = document.getElementById("regPassword");

  if (loginId) loginId.value = "";
  if (loginPw) loginPw.value = "";
  if (regFull) regFull.value = "";
  if (regEmail) regEmail.value = "";
  if (regUser) regUser.value = "";
  if (regPw) regPw.value = "";
}

// Login submit handler
function onLoginSubmit(e) {
  e.preventDefault();

  const identifier = document.getElementById("loginIdentifier").value.trim();
  const password = document.getElementById("loginPassword").value;

  if (!identifier || !password) {
    showMessage(
      loginMsg,
      "❌ Please enter both Email and password.",
      true,
    );
    return;
  }

  const result = loginUser(identifier, password);

  if (result.success) {
    showMessage(
      loginMsg,
      "✅ " + result.msg + " Welcome, " + result.user.fullname + "!",
      false,
    );
    localStorage.setItem("nbsc_rescue_session", JSON.stringify(result.user));
    clearForms();
  } else {
    showMessage(loginMsg, "❌ " + result.msg, true);
  }
}

// Register submit handler
function onRegisterSubmit(e) {
  e.preventDefault();

  const fullname = document.getElementById("regFullname").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const username = document.getElementById("regUsername").value.trim();
  const password = document.getElementById("regPassword").value;

  const result = registerUser(fullname, email, username, password);

  if (result.success) {
    showMessage(regMsg, "✅ " + result.msg, false);

    setTimeout(() => {
      switchTab("login");
      const loginId = document.getElementById("loginIdentifier");
      if (loginId) loginId.value = email;
      if (regMsg) regMsg.innerHTML = "";
    }, 1500);
  } else {
    showMessage(regMsg, "⚠️ " + result.msg, true);
  }
}

// Check existing session on page load
function checkSession() {
  const session = localStorage.getItem("nbsc_rescue_session");
  if (session) {
    const user = JSON.parse(session);
    setTimeout(() => {
      showMessage(
        loginMsg,
        "👋 Welcome back, " + user.fullname + "! You are logged in.",
        false,
      );
    }, 100);
  }
}

// Initialize event listeners
function init() {
  loadUsersFromStorage();
  checkSession();

  // Set default active form
  if (loginFormDiv) loginFormDiv.classList.add("active-form");
  if (registerFormDiv) registerFormDiv.classList.remove("active-form");

  // Tab button listeners
  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      switchTab(btn.getAttribute("data-tab"));
    });
  });

  // Switch link listeners
  const switchLinks = document.querySelectorAll(".switch-link");
  switchLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      const target = link.getAttribute("data-switch");
      if (target === "login") switchTab("login");
      else if (target === "register") switchTab("register");
    });
  });

  // Form submit listeners
  const loginFormElement = document.getElementById("loginFormElement");
  const registerFormElement = document.getElementById("registerFormElement");

  if (loginFormElement) {
    loginFormElement.addEventListener("submit", onLoginSubmit);
  }
  if (registerFormElement) {
    registerFormElement.addEventListener("submit", onRegisterSubmit);
  }

  // Add demo hint
  const loginContainer = document.getElementById("loginForm");
  if (loginContainer && !document.querySelector(".demo-hint")) {
    const demoHint = document.createElement("div");
    demoHint.className = "demo-hint";
    demoHint.innerHTML =
      '<i class="fa-solid fa-flask"></i> Demo Accounts:<br> <strong>rescuelead</strong> / lifeline123 &nbsp;|&nbsp; <strong>firstresponder</strong> / rescue123';
    loginContainer.appendChild(demoHint);
  }
}

// Run initialization when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
