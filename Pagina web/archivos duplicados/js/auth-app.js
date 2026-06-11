/* ----------  Supabase Auth app  ---------- */

const supabaseConfig = window.NOESIS_SUPABASE || {};
const hasSupabaseConfig = Boolean(supabaseConfig.url && supabaseConfig.anonKey);

if (!hasSupabaseConfig) {
  console.warn("Falta configurar Supabase en js/auth.js.");
}

const supabaseClient = hasSupabaseConfig
  ? window.supabase.createClient(supabaseConfig.url, supabaseConfig.anonKey)
  : null;

/* ----------  validaciones  ---------- */

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPassword(password) {
  return password.length >= 8 && /[\d\W_]/.test(password);
}

function showError(message) {
  alert(message);
}

function setLoading(button, isLoading, loadingText) {
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

function restoreButton(button, originalText) {
  if (!button) {
    return;
  }

  button.disabled = false;
  button.textContent = originalText;
}

/* ----------  formulario login  ---------- */

const loginForm = document.getElementById("formulario-login");
const emailIn = document.getElementById("email");
const passIn = document.getElementById("password");

if (loginForm) {
  loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const email = emailIn.value.trim();
    const password = passIn.value;

    if (!email || !password) {
      showError("Por favor, rellena todos los campos.");
      return;
    }

    if (!isValidEmail(email)) {
      showError("Introduce un correo electrónico válido, por ejemplo usuario@dominio.com.");
      return;
    }

    if (!supabaseClient) {
      showError("Falta configurar Supabase antes de iniciar sesión.");
      return;
    }

    const btn = loginForm.querySelector('button[type="submit"]');
    const btnTextOriginal = setLoading(btn, true, "Entrando...");

    try {
      const { error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        showError("Error al iniciar sesión: " + error.message);
        return;
      }

      window.location.href = "portal.html";
    } catch (err) {
      showError("Error inesperado: " + err.message);
    } finally {
      restoreButton(btn, btnTextOriginal);
    }
  });
}

/* ----------  formulario registro  ---------- */

const registerForm = document.getElementById("formulario-registro");

if (registerForm) {
  registerForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const registerEmailIn = registerForm.querySelector('input[name="email"], #registro-email, #email');
    const registerPassIn = registerForm.querySelector('input[name="password"], #registro-password, #password');
    const registerNameIn = registerForm.querySelector('input[name="nombre"], #nombre');

    const email = registerEmailIn ? registerEmailIn.value.trim() : "";
    const password = registerPassIn ? registerPassIn.value : "";
    const nombre = registerNameIn ? registerNameIn.value.trim() : "";

    if (!email || !password) {
      showError("Por favor, rellena el correo electrónico y la contraseña.");
      return;
    }

    if (!isValidEmail(email)) {
      showError("Introduce un correo electrónico válido, por ejemplo usuario@dominio.com.");
      return;
    }

    if (!isValidPassword(password)) {
      showError("La contraseña debe tener mínimo 8 caracteres y contener al menos un número o símbolo.");
      return;
    }

    if (!supabaseClient) {
      showError("Falta configurar Supabase antes de crear la cuenta.");
      return;
    }

    const btn = registerForm.querySelector('button[type="submit"]');
    const btnTextOriginal = setLoading(btn, true, "Creando cuenta...");

    try {
      const { error } = await supabaseClient.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            nombre: nombre,
          },
        },
      });

      if (error) {
        showError("Error al crear la cuenta: " + error.message);
        return;
      }

      alert("Cuenta creada correctamente. Revisa tu correo para confirmar el registro.");
      registerForm.reset();
    } catch (err) {
      showError("Error inesperado: " + err.message);
    } finally {
      restoreButton(btn, btnTextOriginal);
    }
  });
}
