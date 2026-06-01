(function () {
  document.documentElement.classList.add("js");

  if (!window.location.hash) {
    window.scrollTo(0, 0);
  }

  var nav = document.getElementById("nav");
  var toggle = document.getElementById("navToggle");
  var yearEl = document.getElementById("year");
  var form = document.getElementById("contactForm");
  var notice = document.getElementById("formNotice");
  var header = document.getElementById("siteHeader");
  var hero = document.querySelector(".hero");
  var heroInner = document.getElementById("heroInner");
  var reduceMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  function menuLabel(open) {
    var ui = window.__openixUi;
    if (open && ui && ui.menuClose) {
      return ui.menuClose;
    }
    if (!open && ui && ui.menuOpen) {
      return ui.menuOpen;
    }
    return open ? "Cerrar menú" : "Abrir menú";
  }

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", menuLabel(open));
    });

    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", menuLabel(false));
      });
    });
  }

  if (form && notice) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.reportValidity()) {
        return;
      }
      notice.removeAttribute("hidden");
      notice.textContent =
        "Mensaje recibido (modo demostración). En producción este envío se conectaría a tu correo, CRM o servicio de formularios.";
      form.reset();
      notice.focus();
    });
  }

  var loginForm = document.getElementById("loginForm");
  var loginError = document.getElementById("loginError");
  if (loginForm) {
    loginForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!loginForm.reportValidity()) {
        return;
      }
      var fd = new FormData(loginForm);
      var user = String(fd.get("username") || "").trim();
      var password = String(fd.get("password") || "");
      var demo = window.OPENIX && window.OPENIX.demoLogin;
      var ok =
        demo &&
        user.toLowerCase() === String(demo.username).toLowerCase() &&
        password === demo.password;

      if (!ok) {
        if (loginError) {
          loginError.hidden = false;
          loginError.textContent = "Usuario o contraseña incorrectos.";
          loginError.focus();
        }
        return;
      }

      if (loginError) {
        loginError.hidden = true;
      }

      try {
        sessionStorage.setItem(
          "openixPortal",
          JSON.stringify({
            user: user,
            displayName: user,
            at: Date.now(),
          })
        );
      } catch (err) {
        /* ignore */
      }
      var next = "";
      try {
        next = new URLSearchParams(location.search).get("next") || "";
      } catch (err2) {
        /* ignore */
      }
      if (
        next &&
        /^[a-z0-9][a-z0-9._-]*\.html$/i.test(next) &&
        next.indexOf("..") === -1
      ) {
        location.href = next;
      } else {
        location.href = "portal.html";
      }
    });
  }

  var revealNodes = document.querySelectorAll(".reveal");
  if (revealNodes.length) {
    if (reduceMotion) {
      revealNodes.forEach(function (el) {
        el.classList.add("reveal--visible");
      });
    } else if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) {
              return;
            }
            entry.target.classList.add("reveal--visible");
            io.unobserve(entry.target);
          });
        },
        { root: null, rootMargin: "0px 0px -8% 0px", threshold: 0.06 }
      );
      revealNodes.forEach(function (el) {
        io.observe(el);
      });
    } else {
      revealNodes.forEach(function (el) {
        el.classList.add("reveal--visible");
      });
    }
  }

  var parallaxTick = false;
  var heroParallaxLimit = typeof window.innerHeight === "number" ? window.innerHeight * 1.15 : 900;

  function runParallax() {
    parallaxTick = false;
    if (!hero || !heroInner) {
      return;
    }
    var rect = hero.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight) {
      return;
    }
    var shift = Math.round((window.innerHeight * 0.4 - rect.top) * 0.035);
    shift = Math.max(-14, Math.min(18, shift));
    heroInner.style.transform = "translate3d(0, " + shift + "px, 0)";
  }

  function onScroll() {
    var y = window.scrollY;
    if (header) {
      header.classList.toggle("is-scrolled", y > 10);
    }
    if (!reduceMotion && hero && heroInner) {
      if (y > heroParallaxLimit) {
        if (heroInner.style.transform) {
          heroInner.style.transform = "";
        }
        return;
      }
      if (!parallaxTick) {
        parallaxTick = true;
        window.requestAnimationFrame(runParallax);
      }
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  window.addEventListener(
    "resize",
    function () {
      heroParallaxLimit = window.innerHeight * 1.15;
    },
    { passive: true }
  );
})();
