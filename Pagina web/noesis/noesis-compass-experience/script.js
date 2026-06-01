const compassStage = document.querySelector("#compassStage");
const compassCaption = document.querySelector("#compassCaption");
const scenes = Array.from(document.querySelectorAll(".scene"));
const revealItems = Array.from(document.querySelectorAll("[data-reveal]"));
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const state = {
  current: { x: 73, y: 53, scale: 1, opacity: 0.96 },
  target: { x: 73, y: 53, scale: 1, opacity: 0.96 },
  label: "Direcció operativa",
  phase: "inici",
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function mix(start, end, amount) {
  return start + (end - start) * amount;
}

function getFrame(scene) {
  const isMobile = window.innerWidth < 780;
  const base = {
    x: Number(scene.dataset.x || 50),
    y: Number(scene.dataset.y || 52),
    scale: Number(scene.dataset.scale || 1),
    opacity: Number(scene.dataset.opacity || 0.9),
  };

  if (!isMobile) return base;

  const mobileFrames = {
    inici: { x: 90, y: 82, scale: 0.42, opacity: 0.16 },
    origen: { x: 75, y: 62, scale: 0.54, opacity: 0.2 },
    criteri: { x: 25, y: 62, scale: 0.54, opacity: 0.2 },
    sistema: { x: 75, y: 62, scale: 0.54, opacity: 0.2 },
    impacte: { x: 25, y: 62, scale: 0.54, opacity: 0.2 },
    contacte: { x: 50, y: 50, scale: 0.48, opacity: 0.16 },
  };

  return mobileFrames[scene.id] || {
    x: base.x,
    y: base.y,
    scale: base.scale * 0.55,
    opacity: Math.min(base.opacity, 0.22),
  };
}

function getAnchors() {
  return scenes.map((scene) => ({
    scene,
    frame: getFrame(scene),
    center: scene.offsetTop + scene.offsetHeight * 0.5,
  }));
}

function updateTargetFromScroll() {
  if (!scenes.length) return;

  const point = window.scrollY + window.innerHeight * 0.52;
  const anchors = getAnchors();

  let start = anchors[0];
  let end = anchors[0];
  let amount = 0;

  if (point >= anchors[anchors.length - 1].center) {
    start = anchors[anchors.length - 1];
    end = start;
    amount = 1;
  } else {
    for (let index = 1; index < anchors.length; index += 1) {
      if (point <= anchors[index].center) {
        start = anchors[index - 1];
        end = anchors[index];
        amount = clamp((point - start.center) / Math.max(end.center - start.center, 1), 0, 1);
        break;
      }
    }
  }

  const eased = amount * amount * (3 - 2 * amount);
  state.target.x = mix(start.frame.x, end.frame.x, eased);
  state.target.y = mix(start.frame.y, end.frame.y, eased);
  state.target.scale = mix(start.frame.scale, end.frame.scale, eased);
  state.target.opacity = mix(start.frame.opacity, end.frame.opacity, eased);
  state.label = amount < 0.5 ? start.scene.dataset.label : end.scene.dataset.label;
  state.phase = amount < 0.5 ? start.scene.id : end.scene.id;

  if (compassCaption && state.label) {
    compassCaption.textContent = state.label;
  }

  if (compassStage && state.phase) {
    compassStage.dataset.phase = state.phase;
  }
}

function revealVisibleItems() {
  const height = window.innerHeight || document.documentElement.clientHeight;
  revealItems.forEach((item) => {
    const rect = item.getBoundingClientRect();
    if (rect.top < height * 0.86 && rect.bottom > height * 0.12) {
      item.classList.add("is-visible");
    }
  });
}

function render(time = 0) {
  if (!compassStage) return;

  const ease = reduceMotion.matches ? 1 : 0.16;
  const driftX = reduceMotion.matches ? 0 : Math.sin(time / 2800) * 3;
  const driftY = reduceMotion.matches ? 0 : Math.cos(time / 3400) * 3.5;

  state.current.x = mix(state.current.x, state.target.x, ease);
  state.current.y = mix(state.current.y, state.target.y, ease);
  state.current.scale = mix(state.current.scale, state.target.scale, ease);
  state.current.opacity = mix(state.current.opacity, state.target.opacity, ease);

  compassStage.style.opacity = state.current.opacity.toFixed(3);
  compassStage.style.transform = `translate3d(${state.current.x.toFixed(3)}vw, ${state.current.y.toFixed(3)}vh, 0) translate(-50%, -50%) translate3d(${driftX.toFixed(2)}px, ${driftY.toFixed(2)}px, 0) scale(${state.current.scale.toFixed(3)})`;

  window.requestAnimationFrame(render);
}

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
      }
    });
  },
  { threshold: 0.24 }
);

revealItems.forEach((item) => observer.observe(item));

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    const target = document.querySelector(link.getAttribute("href"));
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth", block: "start" });
  });
});

window.addEventListener(
  "scroll",
  () => {
    updateTargetFromScroll();
    revealVisibleItems();
  },
  { passive: true }
);

window.addEventListener("resize", () => {
  updateTargetFromScroll();
  revealVisibleItems();
});

updateTargetFromScroll();
revealVisibleItems();
window.setTimeout(() => {
  updateTargetFromScroll();
  revealVisibleItems();
}, 80);
window.requestAnimationFrame(render);
