document.querySelectorAll("[data-toggle-password]").forEach((button) => {
  button.addEventListener("click", () => {
    const input = document.getElementById(button.dataset.togglePassword);
    if (!input) return;

    const show = input.type === "password";
    input.type = show ? "text" : "password";
    button.setAttribute("aria-label", show ? "Hide password" : "Show password");

    const eye = button.querySelector(".icon-eye");
    const eyeOff = button.querySelector(".icon-eye-off");
    if (eye) eye.toggleAttribute("hidden", show);
    if (eyeOff) eyeOff.toggleAttribute("hidden", !show);
  });
});
