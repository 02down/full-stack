const usernameInput = document.getElementById("username_input");
const passwordInput = document.getElementById("password_input");
const loginButton = document.getElementById("login_button");
const registerButton = document.getElementById("register-button");

// REGISTER
registerButton.addEventListener("click", function () {
    const username = usernameInput.value;
    const password = passwordInput.value;

    fetch("http://localhost:3000/register", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, password })
    })
    .then(res => res.json())
    .then(data => {
        console.log("REGISTER:", data);
    })
    .catch(err => console.error(err));
});

// LOGIN
loginButton.addEventListener("click", function () {
    const username = usernameInput.value;
    const password = passwordInput.value;

    fetch("http://localhost:3000/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, password })
    })
    .then(res => res.json())
    .then(data => {
        console.log("LOGIN:", data);
    })
    .catch(err => console.error(err));
});