import { login, register, renderFeedback, setSession } from "./api.js";

const showLoginButton = document.getElementById("show-login");
const showRegisterButton = document.getElementById("show-register");
const authForm = document.getElementById("auth-form");
const authSubmit = document.getElementById("auth-submit");
const authFeedback = document.getElementById("auth-feedback");

let mode = "login";

function updateMode(nextMode) {
  mode = nextMode;
  showLoginButton.classList.toggle("active", nextMode === "login");
  showRegisterButton.classList.toggle("active", nextMode === "register");
  authSubmit.textContent = nextMode === "login" ? "Login" : "Create account";
  renderFeedback(authFeedback, "");
}

showLoginButton.addEventListener("click", () => updateMode("login"));
showRegisterButton.addEventListener("click", () => updateMode("register"));

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("auth-email").value.trim();
  const password = document.getElementById("auth-password").value;

  try {
    const data = mode === "login" ? await login({ email, password }) : await register({ email, password });
    setSession(data);
    renderFeedback(authFeedback, "Authentication successful. Redirecting...", "success");
    window.location.href = data.user.role === "ADMIN" ? "/admin.html" : "/";
  } catch (error) {
    renderFeedback(authFeedback, error.message, "error");
  }
});

updateMode("login");

