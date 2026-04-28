const usernameInput = document.getElementById("username_input");
const passwordInput = document.getElementById("password_input");
const loginButton = document.getElementById("login_button");
const registerButton = document.getElementById("register-button");
const messageDiv = document.getElementById("message");
const accountUsernameSpan = document.getElementById("account-username");

function showMessage(text, color = "red") {
  if (messageDiv) {
    messageDiv.textContent = text;
    messageDiv.style.color = color;
  }
}

if (loginButton && registerButton) {
  registerButton.addEventListener("click", () => {
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    if (!username || !password)
      return showMessage("Please enter username and password");
    if (password.length < 5)
      return showMessage("Password must be at least 5 characters");

    fetch("/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    })
      .then((res) => res.json())
      .then((data) => showMessage(data.message, data.message === "User registered successfully" ? "green" : "red"))
      .catch(() => showMessage("Error connecting to server"));
  });

  loginButton.addEventListener("click", () => {
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    if (!username || !password)
      return showMessage("Please enter username and password");

    fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.message === "Login successful") {
          localStorage.setItem("username", username);
          window.location.href = "account.html";
        } else {
          showMessage(data.message);
        }
      })
      .catch(() => showMessage("Error connecting to server"));
  });
}

if (accountUsernameSpan) {
  const username = localStorage.getItem("username");

  if (!username) {
    window.location.replace("index.html");
  }

  const accountMessage = document.getElementById("account-message");

  function showAccountMessage(text, color = "red") {
    if (accountMessage) {
      accountMessage.textContent = text;
      accountMessage.style.color = color;
    }
  }

  if (username) {
    accountUsernameSpan.textContent = username;

    fetch(`/account-info?username=${encodeURIComponent(username)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) {
          localStorage.removeItem("username");
          window.location.replace("index.html");
          return;
        }
        if (data.profilePic) {
          document.getElementById("profile-pic").src = data.profilePic;
        }
      })
      .catch(() => {});
  }

  const profilePicEl = document.getElementById("profile-pic");
  const picUpload = document.getElementById("pic-upload");
  let pendingProfilePic = null;

  if (picUpload && profilePicEl) {
    picUpload.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        pendingProfilePic = evt.target.result;
        profilePicEl.src = pendingProfilePic;
        showAccountMessage("Profile picture selected — click Save to apply.", "orange");
      };
      reader.readAsDataURL(file);
    });
  }

  const saveBtn = document.getElementById("save-btn");
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      const currentUsername = localStorage.getItem("username");
      const newUsername = document.getElementById("new-username").value.trim();
      const newPassword = document.getElementById("new-password").value;

      if (!newUsername && !newPassword && !pendingProfilePic)
        return showAccountMessage("Nothing to update.", "red");

      if (newPassword && newPassword.length < 5)
        return showAccountMessage("Password must be at least 5 characters.", "red");

      const payload = { currentUsername };
      if (newUsername) payload.newUsername = newUsername;
      if (newPassword) payload.newPassword = newPassword;
      if (pendingProfilePic) payload.profilePic = pendingProfilePic;

      fetch("/update-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            if (newUsername) {
              localStorage.setItem("username", newUsername);
              accountUsernameSpan.textContent = newUsername;
            }
            document.getElementById("new-username").value = "";
            document.getElementById("new-password").value = "";
            pendingProfilePic = null;
            showAccountMessage("Account updated successfully!", "green");
          } else {
            showAccountMessage(data.message || "Update failed.", "red");
          }
        })
        .catch(() => showAccountMessage("Error connecting to server.", "red"));
    });
  }

  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("username");
      window.location.replace("index.html");
    });
  }

  const deleteBtn = document.getElementById("delete-btn");
  if (deleteBtn) {
    deleteBtn.addEventListener("click", () => {
      if (!confirm("Are you sure you want to delete your account? This cannot be undone.")) return;
      const currentUsername = localStorage.getItem("username");
      fetch("/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: currentUsername }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            localStorage.removeItem("username");
            window.location.replace("index.html");
          } else {
            showAccountMessage(data.message || "Failed to delete account.", "red");
          }
        })
        .catch(() => showAccountMessage("Error connecting to server.", "red"));
    });
  }
}