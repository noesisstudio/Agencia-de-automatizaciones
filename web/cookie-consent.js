/**
 * Banner de consentimiento de cookies (RGPD / AEPD).
 * Google Analytics NO se carga hasta que el usuario acepta.
 * Autónomo: inyecta sus propios estilos y textos (ES / CA).
 */
(function () {
  "use strict";

  var GA_ID = "G-4J84RJDEQX";
  var CONSENT_KEY = "noesisCookieConsent"; // "granted" | "denied"
  var LANGUAGE_KEY = "noesisLanguage"; // "es" | "ca"

  var TEXT = {
    es: {
      message:
        "Usamos cookies propias y de Google Analytics para entender cómo se usa la web y mejorarla. Puedes aceptarlas o rechazarlas.",
      accept: "Aceptar",
      reject: "Rechazar",
      more: "Más información",
      aria: "Aviso de cookies",
    },
    ca: {
      message:
        "Fem servir cookies pròpies i de Google Analytics per entendre com s'utilitza el web i millorar-lo. Pots acceptar-les o rebutjar-les.",
      accept: "Acceptar",
      reject: "Rebutjar",
      more: "Més informació",
      aria: "Avís de galetes",
    },
  };

  function getLang() {
    try {
      return window.localStorage.getItem(LANGUAGE_KEY) === "ca" ? "ca" : "es";
    } catch (e) {
      return "es";
    }
  }

  function readConsent() {
    try {
      return window.localStorage.getItem(CONSENT_KEY);
    } catch (e) {
      return null;
    }
  }

  function writeConsent(value) {
    try {
      window.localStorage.setItem(CONSENT_KEY, value);
    } catch (e) {
      /* almacenamiento no disponible */
    }
  }

  function loadGA() {
    if (window.__noesisGALoaded) return;
    window.__noesisGALoaded = true;

    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID;
    document.head.appendChild(s);

    window.dataLayer = window.dataLayer || [];
    function gtag() {
      window.dataLayer.push(arguments);
    }
    window.gtag = gtag;
    gtag("js", new Date());
    gtag("config", GA_ID, { anonymize_ip: true });
  }

  function injectStyles() {
    if (document.getElementById("noesis-cookie-style")) return;
    var css =
      ".noesis-cookie{position:fixed;left:50%;bottom:20px;transform:translateX(-50%);" +
      "z-index:9999;width:calc(100% - 32px);max-width:720px;background:#123C35;color:#FBFAF5;" +
      "border-radius:16px;box-shadow:0 18px 48px rgba(9,28,25,.35);padding:20px 22px;" +
      "display:flex;flex-wrap:wrap;align-items:center;gap:14px 18px;" +
      "font-family:'Inter',system-ui,-apple-system,sans-serif;font-size:14.5px;line-height:1.5;" +
      "opacity:0;translate:0 12px;transition:opacity .3s ease,translate .3s ease}" +
      ".noesis-cookie.is-visible{opacity:1;translate:0 0}" +
      ".noesis-cookie__text{flex:1 1 260px;margin:0;color:#EAF2EF}" +
      ".noesis-cookie__text a{color:#FBFAF5;text-decoration:underline;text-underline-offset:2px}" +
      ".noesis-cookie__actions{display:flex;gap:10px;flex:0 0 auto;flex-wrap:wrap}" +
      ".noesis-cookie__btn{cursor:pointer;border-radius:999px;padding:10px 20px;font-size:14px;" +
      "font-weight:600;font-family:inherit;border:1px solid transparent;transition:filter .2s ease,background .2s ease}" +
      ".noesis-cookie__btn--accept{background:#FBFAF5;color:#123C35}" +
      ".noesis-cookie__btn--accept:hover{filter:brightness(.94)}" +
      ".noesis-cookie__btn--reject{background:transparent;color:#EAF2EF;border-color:rgba(251,250,245,.4)}" +
      ".noesis-cookie__btn--reject:hover{background:rgba(251,250,245,.1)}" +
      "@media(max-width:520px){.noesis-cookie{padding:18px}.noesis-cookie__actions{width:100%}" +
      ".noesis-cookie__btn{flex:1 1 auto}}";
    var style = document.createElement("style");
    style.id = "noesis-cookie-style";
    style.textContent = css;
    document.head.appendChild(style);
  }

  function removeBanner() {
    var el = document.getElementById("noesis-cookie");
    if (!el) return;
    el.classList.remove("is-visible");
    window.setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 300);
  }

  function showBanner() {
    if (document.getElementById("noesis-cookie")) return;
    injectStyles();

    var t = TEXT[getLang()];
    var banner = document.createElement("div");
    banner.id = "noesis-cookie";
    banner.className = "noesis-cookie";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-live", "polite");
    banner.setAttribute("aria-label", t.aria);
    banner.innerHTML =
      '<p class="noesis-cookie__text">' +
      t.message +
      ' <a href="/cookies.html">' +
      t.more +
      "</a></p>" +
      '<div class="noesis-cookie__actions">' +
      '<button type="button" class="noesis-cookie__btn noesis-cookie__btn--reject" data-consent="denied">' +
      t.reject +
      "</button>" +
      '<button type="button" class="noesis-cookie__btn noesis-cookie__btn--accept" data-consent="granted">' +
      t.accept +
      "</button>" +
      "</div>";

    banner.addEventListener("click", function (ev) {
      var btn = ev.target.closest("[data-consent]");
      if (!btn) return;
      var value = btn.getAttribute("data-consent");
      writeConsent(value);
      if (value === "granted") loadGA();
      removeBanner();
    });

    document.body.appendChild(banner);
    // Forzar reflow para animar la entrada.
    window.requestAnimationFrame(function () {
      banner.classList.add("is-visible");
    });
  }

  // Permite reabrir el banner desde la página de cookies para cambiar la elección.
  window.noesisOpenCookiePreferences = function () {
    showBanner();
  };

  function init() {
    var consent = readConsent();
    if (consent === "granted") {
      loadGA();
    } else if (consent === "denied") {
      /* respetar el rechazo: no cargar nada */
    } else {
      showBanner();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
