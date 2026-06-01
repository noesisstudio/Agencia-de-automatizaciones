import { state } from "./state.js";

export function applyTheme() {
  document.documentElement.setAttribute("data-theme", state.theme);
  updateThemeIcons();
}

export function toggleTheme() {
  state.theme = state.theme === "dark" ? "light" : "dark";
  localStorage.setItem("facturai_theme", state.theme);
  applyTheme();
}

function updateThemeIcons() {
  const lightIcon = document.getElementById("icon-theme-light");
  const darkIcon = document.getElementById("icon-theme-dark");
  
  if (lightIcon && darkIcon) {
    if (state.theme === "dark") {
      lightIcon.hidden = true;
      darkIcon.hidden = false;
    } else {
      lightIcon.hidden = false;
      darkIcon.hidden = true;
    }
  }
}

export function bindThemeToggle() {
  const btn = document.getElementById("theme-toggle");
  if (btn) {
    btn.addEventListener("click", toggleTheme);
  }

  // Escuchar cambios del sistema
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", e => {
    if (!localStorage.getItem("facturai_theme")) {
      state.theme = e.matches ? "dark" : "light";
      applyTheme();
    }
  });
}
