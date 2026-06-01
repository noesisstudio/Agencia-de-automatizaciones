type InitOptions = {
  apiBaseUrl: string;
  tenantId?: string;
};

declare global {
  interface Window {
    AgenciaChatbot?: {
      init: (opts: InitOptions) => void;
    };
  }
}

function readScriptOptions(): Partial<InitOptions> {
  const current = document.currentScript as HTMLScriptElement | null;
  if (!current) return {};
  const api = current.getAttribute("data-api-url")?.trim();
  const tenantId = current.getAttribute("data-tenant-id")?.trim();
  const out: Partial<InitOptions> = {};
  if (api) out.apiBaseUrl = api.replace(/\/$/, "");
  if (tenantId) out.tenantId = tenantId;
  return out;
}

function normalizeBase(url: string) {
  return url.replace(/\/$/, "");
}

function mount(opts: InitOptions) {
  const apiBaseUrl = normalizeBase(opts.apiBaseUrl);
  const tenantId = opts.tenantId ?? "default";

  const host = document.createElement("div");
  host.id = "agencia-chatbot-root";
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = `
    * { box-sizing: border-box; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
    .fab {
      position: fixed; right: 16px; bottom: 16px; z-index: 2147483000;
      width: 56px; height: 56px; border-radius: 999px; border: none; cursor: pointer;
      background: #111827; color: #fff; font-size: 22px; box-shadow: 0 8px 24px rgba(0,0,0,.2);
    }
    .panel {
      position: fixed; right: 16px; bottom: 80px; z-index: 2147483000;
      width: min(92vw, 360px); height: min(70vh, 520px);
      background: #fff; color: #111827; border-radius: 12px;
      box-shadow: 0 12px 40px rgba(0,0,0,.18); display: none; flex-direction: column; overflow: hidden;
      border: 1px solid #e5e7eb;
    }
    .panel.open { display: flex; }
    .head { padding: 12px 14px; border-bottom: 1px solid #e5e7eb; font-weight: 600; font-size: 14px; }
    .msgs { flex: 1; overflow: auto; padding: 12px; display: flex; flex-direction: column; gap: 8px; background: #f9fafb; }
    .bubble { max-width: 92%; padding: 10px 12px; border-radius: 12px; font-size: 14px; line-height: 1.45; white-space: pre-wrap; }
    .bubble.user { align-self: flex-end; background: #111827; color: #fff; }
    .bubble.bot { align-self: flex-start; background: #fff; border: 1px solid #e5e7eb; }
    .row { display: flex; gap: 8px; padding: 10px; border-top: 1px solid #e5e7eb; background: #fff; }
    input {
      flex: 1; border: 1px solid #d1d5db; border-radius: 10px; padding: 10px 12px; font-size: 14px; outline: none;
    }
    button.send {
      border: none; border-radius: 10px; padding: 0 14px; background: #111827; color: #fff; cursor: pointer; font-weight: 600;
    }
    .err { color: #b91c1c; font-size: 13px; }
  `;

  const panel = document.createElement("div");
  panel.className = "panel";
  panel.innerHTML = `
    <div class="head">Chat</div>
    <div class="msgs" id="msgs"></div>
    <div class="row">
      <input id="q" type="text" placeholder="Escribe un mensaje..." autocomplete="off" />
      <button class="send" id="send" type="button">Enviar</button>
    </div>
  `;

  const fab = document.createElement("button");
  fab.className = "fab";
  fab.type = "button";
  fab.setAttribute("aria-label", "Abrir chat");
  fab.textContent = "💬";

  shadow.append(style, fab, panel);

  const msgs = () => panel.querySelector("#msgs") as HTMLDivElement;
  const input = () => panel.querySelector("#q") as HTMLInputElement;

  function addBubble(text: string, who: "user" | "bot") {
    const el = document.createElement("div");
    el.className = `bubble ${who}`;
    el.textContent = text;
    msgs().appendChild(el);
    msgs().scrollTop = msgs().scrollHeight;
  }

  let open = false;
  function toggle() {
    open = !open;
    panel.classList.toggle("open", open);
    if (open) input().focus();
  }

  fab.addEventListener("click", toggle);

  async function send() {
    const q = input().value.trim();
    if (!q) return;
    input().value = "";
    addBubble(q, "user");

    try {
      const res = await fetch(`${apiBaseUrl}/web/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, tenant_id: tenantId }),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = (await res.json()) as { answer?: string };
      addBubble(data.answer ?? "Sin respuesta", "bot");
    } catch {
      addBubble("No se pudo conectar al servidor del chat.", "bot");
    }
  }

  panel.querySelector("#send")?.addEventListener("click", send);
  input().addEventListener("keydown", (e) => {
    if (e.key === "Enter") send();
  });
}

function init(opts: InitOptions) {
  if (!opts.apiBaseUrl) return;
  if (document.getElementById("agencia-chatbot-root")) return;
  mount(opts);
}

window.AgenciaChatbot = { init };

const fromScript = readScriptOptions();
if (fromScript.apiBaseUrl) {
  init({ apiBaseUrl: fromScript.apiBaseUrl, tenantId: fromScript.tenantId });
}

// Nota: con <script async src="widget.js" ...> document.currentScript puede ser null.
// En ese caso usa: onload="AgenciaChatbot.init({apiBaseUrl:'https://...'})" o carga sin async.

export {};
