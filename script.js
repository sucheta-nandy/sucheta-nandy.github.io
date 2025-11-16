const toggle = document.getElementById("themeToggle");
const root = document.documentElement;

toggle.addEventListener("click", () => {
  const current = document.body.getAttribute("data-theme");
  const next = current === "light" ? "dark" : "light";
  document.body.setAttribute("data-theme", next);
});
