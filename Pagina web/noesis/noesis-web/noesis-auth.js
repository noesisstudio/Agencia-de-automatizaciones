const NOESIS_CLIENT_SESSION_KEY = "noesisClientSession";

function readNoesisStorage(key) {
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    return null;
  }
}

function writeNoesisStorage(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    // The auth flow still works if storage is blocked.
  }
}

function removeNoesisStorage(key) {
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    // Ignore storage restrictions.
  }
}

function getSupabaseClient() {
  const config = window.NOESIS_SUPABASE || {};

  if (!window.supabase || !config.url || !config.anonKey) {
    return null;
  }

  return window.supabase.createClient(config.url, config.anonKey);
}

function isValidNoesisEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidNoesisPassword(password) {
  return password.length >= 8 && /[\d\W_]/.test(password);
}

function setAuthFeedback(form, message, type) {
  const feedback = form.querySelector("[data-auth-feedback]");

  if (!feedback) {
    return;
  }

  feedback.textContent = message;
  feedback.dataset.state = type || "info";
  feedback.hidden = false;
}

function setAuthLoading(button, isLoading, loadingText) {
  if (!button) {
    return "";
  }

  if (isLoading) {
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = loadingText;
    return originalText;
  }

  button.disabled = false;
  return "";
}

function restoreAuthButton(button, originalText) {
  if (!button) {
    return;
  }

  button.disabled = false;
  button.textContent = originalText;
}

const noesisSupabase = getSupabaseClient();
const loginForm = document.querySelector("#noesis-login-form");
const resetForm = document.querySelector("#noesis-reset-form");
const updatePasswordForm = document.querySelector("#noesis-update-password-form");
const isClientArea = document.body.classList.contains("client-area-body");

if (isClientArea) {
  (async () => {
    if (!noesisSupabase) {
      if (readNoesisStorage(NOESIS_CLIENT_SESSION_KEY) !== "active") {
        window.location.replace("iniciar-sesion.html?next=portal-dashboard.html");
      }
      return;
    }

    const { data } = await noesisSupabase.auth.getSession();

    if (!data.session) {
      removeNoesisStorage(NOESIS_CLIENT_SESSION_KEY);
      window.location.replace("iniciar-sesion.html?next=portal-dashboard.html");
      return;
    }

    writeNoesisStorage(NOESIS_CLIENT_SESSION_KEY, "active");

    const userEmail = data.session.user?.email;
    if (userEmail) {
      document.querySelectorAll("[data-client-email]").forEach((node) => {
        node.textContent = userEmail;
      });
    }
  })();
}

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = (loginForm.querySelector('input[name="email"]')?.value || "").trim();
    const password = loginForm.querySelector('input[name="password"]')?.value || "";

    if (!email || !password) {
      setAuthFeedback(loginForm, "Rellena el correo y la contrasena para continuar.", "error");
      return;
    }

    if (!isValidNoesisEmail(email)) {
      setAuthFeedback(loginForm, "Introduce un correo electronico valido.", "error");
      return;
    }

    if (!noesisSupabase) {
      setAuthFeedback(loginForm, "Falta configurar Supabase antes de iniciar sesion.", "error");
      return;
    }

    const button = loginForm.querySelector('button[type="submit"]');
    const originalText = setAuthLoading(button, true, "Entrando...");

    try {
      const { error } = await noesisSupabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setAuthFeedback(loginForm, `No hemos podido iniciar sesion: ${error.message}`, "error");
        return;
      }

      writeNoesisStorage(NOESIS_CLIENT_SESSION_KEY, "active");
      const params = new URLSearchParams(window.location.search);
      const nextUrl = params.get("next") || loginForm.dataset.dashboardUrl || "portal-dashboard.html";
      window.location.href = nextUrl;
    } catch (error) {
      setAuthFeedback(loginForm, `Error inesperado: ${error.message}`, "error");
    } finally {
      restoreAuthButton(button, originalText);
    }
  });
}

if (resetForm) {
  resetForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = (resetForm.querySelector('input[name="email"]')?.value || "").trim();

    if (!email) {
      setAuthFeedback(resetForm, "Introduce el correo asociado a tu cuenta.", "error");
      return;
    }

    if (!isValidNoesisEmail(email)) {
      setAuthFeedback(resetForm, "Introduce un correo electronico valido.", "error");
      return;
    }

    if (!noesisSupabase) {
      setAuthFeedback(resetForm, "Falta configurar Supabase antes de recuperar el acceso.", "error");
      return;
    }

    const button = resetForm.querySelector('button[type="submit"]');
    const originalText = setAuthLoading(button, true, "Enviando...");

    try {
      const redirectTo = window.location.href.replace(/recuperar-contrasena\.html(?:\?.*)?$/, "nueva-contrasena.html");
      const { error } = await noesisSupabase.auth.resetPasswordForEmail(email, { redirectTo });

      if (error) {
        setAuthFeedback(resetForm, `No hemos podido enviar el enlace: ${error.message}`, "error");
        return;
      }

      setAuthFeedback(resetForm, "Te hemos enviado un enlace de recuperacion si el correo existe en el sistema.", "success");
      resetForm.reset();
    } catch (error) {
      setAuthFeedback(resetForm, `Error inesperado: ${error.message}`, "error");
    } finally {
      restoreAuthButton(button, originalText);
    }
  });
}

if (updatePasswordForm) {
  updatePasswordForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const password = updatePasswordForm.querySelector('input[name="password"]')?.value || "";
    const passwordConfirm = updatePasswordForm.querySelector('input[name="passwordConfirm"]')?.value || "";

    if (!password || !passwordConfirm) {
      setAuthFeedback(updatePasswordForm, "Rellena los dos campos de contrasena.", "error");
      return;
    }

    if (password !== passwordConfirm) {
      setAuthFeedback(updatePasswordForm, "Las contrasenas no coinciden.", "error");
      return;
    }

    if (!isValidNoesisPassword(password)) {
      setAuthFeedback(updatePasswordForm, "La contrasena debe tener minimo 8 caracteres y al menos un numero o simbolo.", "error");
      return;
    }

    if (!noesisSupabase) {
      setAuthFeedback(updatePasswordForm, "Falta configurar Supabase antes de cambiar la contrasena.", "error");
      return;
    }

    const button = updatePasswordForm.querySelector('button[type="submit"]');
    const originalText = setAuthLoading(button, true, "Guardando...");

    try {
      if (window.location.search.includes("code=")) {
        await noesisSupabase.auth.exchangeCodeForSession(window.location.href);
      }

      const { error } = await noesisSupabase.auth.updateUser({ password });

      if (error) {
        setAuthFeedback(updatePasswordForm, `No hemos podido cambiar la contrasena: ${error.message}`, "error");
        return;
      }

      writeNoesisStorage(NOESIS_CLIENT_SESSION_KEY, "active");
      setAuthFeedback(updatePasswordForm, "Contrasena actualizada. Redirigiendo al area privada...", "success");
      window.setTimeout(() => {
        window.location.href = "portal-dashboard.html";
      }, 900);
    } catch (error) {
      setAuthFeedback(updatePasswordForm, `Error inesperado: ${error.message}`, "error");
    } finally {
      restoreAuthButton(button, originalText);
    }
  });
}

document.querySelectorAll("[data-logout]").forEach((logout) => {
  logout.addEventListener("click", async (event) => {
    event.preventDefault();
    removeNoesisStorage(NOESIS_CLIENT_SESSION_KEY);

    if (noesisSupabase) {
      await noesisSupabase.auth.signOut();
    }

    window.location.href = logout.getAttribute("href") || "iniciar-sesion.html";
  });
});

if (readNoesisStorage(NOESIS_CLIENT_SESSION_KEY) === "active") {
  document.querySelectorAll("[data-authenticated-label]").forEach((node) => {
    node.textContent = "Area privada";
  });
}
