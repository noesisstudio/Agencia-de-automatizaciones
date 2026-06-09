/*  ──────────────────────────────────────────────
 *  auth.js  –  Autenticación con Supabase
 *  ──────────────────────────────────────────────
 *  Pega tu URL y Anon Key del panel de Supabase:
 *    https://app.supabase.com  →  Settings  →  API
 *  ────────────────────────────────────────────── */

const SUPABASE_URL  = "TU_URL_AQUI";        // ej: https://xyzcompany.supabase.co
const SUPABASE_ANON = "TU_ANON_KEY_AQUI";   // ej: eyJhbGciOiJIUzI1NiIs...

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

/* ----------  formulario  ---------- */

const form     = document.getElementById("formulario-login");
const emailIn  = document.getElementById("email");
const passIn   = document.getElementById("password");

if (form) {
  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const email    = emailIn.value.trim();
    const password = passIn.value;

    if (!email || !password) {
      alert("Por favor, rellena todos los campos.");
      return;
    }

    /* Desactivar botón mientras se procesa */
    const btn = form.querySelector('button[type="submit"]');
    const btnTextOriginal = btn.textContent;
    btn.disabled    = true;
    btn.textContent = "Entrando…";

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email:    email,
        password: password,
      });

      if (error) {
        alert("Error al iniciar sesión: " + error.message);
        return;
      }

      /* Login correcto → redirigir al portal */
      window.location.href = "portal.html";

    } catch (err) {
      alert("Error inesperado: " + err.message);
    } finally {
      btn.disabled    = false;
      btn.textContent = btnTextOriginal;
    }
  });
}
