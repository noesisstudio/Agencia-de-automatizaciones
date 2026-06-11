const revealItems = document.querySelectorAll("[data-reveal]");

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.16 }
  );

  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

const CLIENT_SESSION_KEY = "noesisClientSession";
const PRIVACY_NOTICE_KEY = "noesisPrivacyNotice";
const LANGUAGE_KEY = "noesisLanguage";
const WEB3FORMS_ACCESS_KEY = "c0e13644-9a7a-4dc6-8920-6055afcd351a";
const translations = window.NOESIS_I18N || { es: {}, ca: {} };
let currentLanguage = "es";

function readStorage(key) {
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    // Storage can be blocked in strict browser modes. The interface remains usable without persistence.
  }
}

function removeStorage(key) {
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    // Ignore storage restrictions.
  }
}

const menuToggle = document.querySelector(".menu-toggle");
const mobileMenu = document.querySelector("#mobile-menu");

if (menuToggle && mobileMenu) {
  menuToggle.addEventListener("click", () => {
    const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!isOpen));
    mobileMenu.hidden = isOpen;
  });
}

const privateLinks = document.querySelectorAll("[data-private-link]");
const hasClientSession = readStorage(CLIENT_SESSION_KEY) === "active";

function updatePrivateLinks(language) {
  const dictionary = translations[language] || translations.es;

  privateLinks.forEach((link) => {
    if (hasClientSession) {
      link.href = "portal-dashboard.html";
      link.textContent = dictionary["site.nav.private"];
    } else {
      link.href = "iniciar-sesion.html";
      link.textContent = dictionary["site.nav.login"];
    }
  });
}

const portalForm = document.querySelector("#portal-login-form");

if (portalForm) {
  portalForm.addEventListener("submit", (event) => {
    event.preventDefault();
    writeStorage(CLIENT_SESSION_KEY, "active");
    const dashboardUrl = portalForm.dataset.dashboardUrl || "portal-dashboard.html";
    window.location.href = dashboardUrl;
  });
}

document.querySelectorAll("[data-logout]").forEach((logout) => {
  logout.addEventListener("click", () => {
    removeStorage(CLIENT_SESSION_KEY);
  });
});

const diagnosisForm = document.querySelector("#diagnosis-form");

if (diagnosisForm) {
  diagnosisForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(diagnosisForm);
    const feedback = document.querySelector("#diagnosis-feedback");
    const submitButton = diagnosisForm.querySelector('button[type="submit"]');
    const originalButtonText = submitButton ? submitButton.textContent : "";

    formData.append("access_key", WEB3FORMS_ACCESS_KEY);
    formData.append("subject", "Diagnostico inicial Noesis");
    formData.append("from_name", "Formulario web Noesis");

    const dictionary = translations[currentLanguage] || translations.es;

    if (feedback) {
      feedback.textContent = dictionary["site.contact.sending"];
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = dictionary["site.contact.sendingBtn"];
    }

    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error("No se ha podido enviar el formulario.");
      }

      diagnosisForm.reset();

      if (feedback) {
        feedback.textContent = dictionary["site.contact.success"];
      }
    } catch (error) {
      if (feedback) {
        feedback.textContent = dictionary["site.contact.error"];
      }
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
      }
    }
  });
}

const panelTriggers = document.querySelectorAll("[data-panel-target]");
const clientPanels = document.querySelectorAll(".client-panel[data-panel]");
const clientNavButtons = document.querySelectorAll(".client-nav [data-panel-target]");

function activateClientPanel(panelName) {
  if (!panelName || !clientPanels.length) return;

  clientPanels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.panel === panelName);
  });

  clientNavButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.panelTarget === panelName);
  });

  if (window.location.hash !== `#${panelName}`) {
    window.history.replaceState(null, "", `#${panelName}`);
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

panelTriggers.forEach((trigger) => {
  trigger.addEventListener("click", () => activateClientPanel(trigger.dataset.panelTarget));
});

if (clientPanels.length && window.location.hash) {
  const initialPanel = window.location.hash.replace("#", "");
  if (document.querySelector(`.client-panel[data-panel="${initialPanel}"]`)) {
    activateClientPanel(initialPanel);
  }
}

const languageButtons = document.querySelectorAll("[data-lang]");

function setLanguage(language) {
  const dictionary = translations[language];
  if (!dictionary) return;

  currentLanguage = language;
  document.documentElement.lang = language;

  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const key = node.dataset.i18n;
    if (dictionary[key]) node.textContent = dictionary[key];
  });

  document.querySelectorAll("[data-i18n-html]").forEach((node) => {
    const key = node.dataset.i18nHtml;
    if (dictionary[key]) node.innerHTML = dictionary[key];
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    const key = node.dataset.i18nPlaceholder;
    if (dictionary[key]) node.setAttribute("placeholder", dictionary[key]);
  });

  document.querySelectorAll("[data-i18n-aria]").forEach((node) => {
    const key = node.dataset.i18nAria;
    if (dictionary[key]) node.setAttribute("aria-label", dictionary[key]);
  });

  document.querySelectorAll("option[data-i18n]").forEach((node) => {
    const key = node.dataset.i18n;
    if (dictionary[key]) node.textContent = dictionary[key];
  });

  const titleNode = document.querySelector("[data-i18n-title]");
  if (titleNode) {
    const titleKey = titleNode.dataset.i18nTitle;
    if (dictionary[titleKey]) document.title = dictionary[titleKey];
  }

  const metaNode = document.querySelector("[data-i18n-meta]");
  if (metaNode) {
    const metaKey = metaNode.dataset.i18nMeta;
    if (dictionary[metaKey]) metaNode.setAttribute("content", dictionary[metaKey]);
  }

  languageButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.lang === language);
  });

  updatePrivateLinks(language);
}

languageButtons.forEach((button) => {
  button.addEventListener("click", () => {
    writeStorage(LANGUAGE_KEY, button.dataset.lang);
    setLanguage(button.dataset.lang);
  });
});

const storedLanguage = readStorage(LANGUAGE_KEY);
const initialLanguage = storedLanguage === "ca" ? "ca" : "es";
setLanguage(initialLanguage);

const supportSend = document.querySelector("[data-support-send]");
const supportInput = document.querySelector("[data-support-input]");

async function getSupportReplyEmail() {
  try {
    if (typeof noesisSupabase !== "undefined" && noesisSupabase?.auth) {
      const { data } = await noesisSupabase.auth.getUser();
      if (data?.user?.email) {
        return data.user.email;
      }
    }
  } catch (error) {
    // The support message can still be sent without session metadata.
  }

  return "info@bynoesis.com";
}

if (supportSend && supportInput) {
  supportSend.addEventListener("click", async () => {
    const message = supportInput.value.trim();
    if (!message) {
      supportInput.focus();
      return;
    }

    const thread = document.querySelector(".chat-thread");
    if (thread) {
      const bubble = document.createElement("div");
      bubble.className = "chat-message user";
      bubble.textContent = message;
      thread.appendChild(bubble);
    }

    supportInput.value = "";

    try {
      const formData = new FormData();
      formData.append("access_key", WEB3FORMS_ACCESS_KEY);
      formData.append("subject", "Soporte cliente Noesis");
      formData.append("from_name", "Portal cliente Noesis");
      formData.append("email", await getSupportReplyEmail());
      formData.append("message", message);

      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error("No se ha podido enviar el mensaje.");
      }
    } catch (error) {
      const dictionary = translations[currentLanguage] || translations.es;
      const thread = document.querySelector(".chat-thread");
      if (thread) {
        const bubble = document.createElement("div");
        bubble.className = "chat-message system";
        bubble.textContent = dictionary["site.contact.error"];
        thread.appendChild(bubble);
      }
    }
  });
}

if (
  !readStorage(PRIVACY_NOTICE_KEY) &&
  !document.body.classList.contains("client-area-body") &&
  !document.body.classList.contains("portal-entry-body")
) {
  const dictionary = translations[currentLanguage] || translations.es;
  const notice = document.createElement("aside");
  notice.className = "cookie-notice";
  notice.setAttribute("aria-label", dictionary["site.cookie.aria"]);
  notice.innerHTML = `
    <p>${dictionary["site.cookie.text"]}</p>
    <button class="button primary compact" type="button">${dictionary["site.cookie.accept"]}</button>
  `;
  document.body.appendChild(notice);
  notice.querySelector("button").addEventListener("click", () => {
    writeStorage(PRIVACY_NOTICE_KEY, "accepted");
    notice.remove();
  });
}
