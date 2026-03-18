const usernameInput = document.getElementById("username_input");
const passwordInput = document.getElementById("password_input");
const loginButton = document.getElementById("login_button");
const registerButton = document.getElementById("register-button");
const messageDiv = document.getElementById("message");
const accountUsernameSpan = document.getElementById("account-username");

// Show messages
function showMessage(text, color = "red") {
    if (messageDiv) {
        messageDiv.textContent = text;
        messageDiv.style.color = color;
    }
}

// ===== INDEX PAGE LOGIC =====
if (loginButton && registerButton) {
    // REGISTER
    registerButton.addEventListener("click", () => {
        const username = usernameInput.value;
        const password = passwordInput.value;
        if (!username || !password) {
            showMessage("Please enter username and password");
            return;
        }

        fetch("/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        })
        .then(res => res.json())
        .then(data => showMessage(data.message, "green"))
        .catch(err => {
            console.error(err);
            showMessage("Error connecting to server");
        });
    });

    // LOGIN
    loginButton.addEventListener("click", () => {
        const username = usernameInput.value;
        const password = passwordInput.value;
        if (!username || !password) {
            showMessage("Please enter username and password");
            return;
        }

        fetch("/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        })
        .then(res => res.json())
        .then(data => {
            if (data.message === "Login successful") {
                localStorage.setItem("username", username);
                window.location.href = "account.html";
            } else {
                showMessage(data.message, "red");
            }
        })
        .catch(err => {
            console.error(err);
            showMessage("Error connecting to server");
        });
    });
}

// ===== ACCOUNT PAGE LOGIC =====
if (accountUsernameSpan) {
    const username = localStorage.getItem("username");
    if (!username) {
        window.location.href = "index.html"; // redirect if not logged in
    } else {
        accountUsernameSpan.textContent = username;
    }
}