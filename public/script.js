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

    fetch("/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    })
      .then((res) => res.json())
      .then((data) => showMessage(data.message, "green"))
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
    window.location.href = "index.html";
  } else {
    accountUsernameSpan.textContent = username;

    fetch(`/account-info?username=${encodeURIComponent(username)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.profilePic) {
          document.getElementById("profile-pic").src = data.profilePic;
        }
      })
      .catch(() => {});
  }

  const profilePicEl = document.getElementById("profile-pic");
  const picUpload = document.getElementById("pic-upload");
  const accountMessage = document.getElementById("account-message");

  function showAccountMessage(text, color = "red") {
    if (accountMessage) {
      accountMessage.textContent = text;
      accountMessage.style.color = color;
    }
  }

  let pendingProfilePic = null;
  if (picUpload && profilePicEl) {
    picUpload.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        pendingProfilePic = evt.target.result;
        profilePicEl.src = pendingProfilePic;
        showAccountMessage(
          "Profile picture selected — click Save to apply.",
          "orange",
        );
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

      if (!newUsername && !newPassword && !pendingProfilePic) {
        return showAccountMessage("Nothing to update.", "red");
      }

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
}
