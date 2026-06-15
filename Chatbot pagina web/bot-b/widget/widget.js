(function () {
  'use strict';

  // ── Configuración (se inyecta desde el snippet del cliente) ──────────────────
  const script = document.currentScript ||
    document.querySelector('script[data-api-url]');

  const API_URL    = script?.dataset.apiUrl    || '';
  const BOT_NOMBRE = script?.dataset.botNombre || 'Asistente';
  const COLOR      = script?.dataset.color      || '#0066cc';

  if (!API_URL) {
    console.warn('[ChatbotB] data-api-url no configurado');
    return;
  }

  // ── Estado ────────────────────────────────────────────────────────────────────
  const SESSION_ID = 'sess_' + Math.random().toString(36).slice(2) + Date.now();
  const history = [];   // [{role, content}]
  let isOpen = false;
  let isLoading = false;

  // ── Estilos ───────────────────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #cb-launcher {
      position: fixed; bottom: 20px; right: 20px; z-index: 9999;
      width: 56px; height: 56px; border-radius: 50%;
      background: ${COLOR}; border: none; cursor: pointer;
      box-shadow: 0 4px 16px rgba(0,0,0,.25);
      display: flex; align-items: center; justify-content: center;
      transition: transform .2s;
    }
    #cb-launcher:hover { transform: scale(1.08); }
    #cb-launcher svg { width: 28px; height: 28px; fill: #fff; }

    #cb-window {
      position: fixed; bottom: 88px; right: 20px; z-index: 9998;
      width: 340px; max-height: 520px;
      display: flex; flex-direction: column;
      background: #fff; border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,.18);
      font-family: system-ui, sans-serif; font-size: 14px;
      overflow: hidden; transition: opacity .2s, transform .2s;
    }
    #cb-window.cb-hidden { opacity: 0; pointer-events: none; transform: translateY(12px); }

    #cb-header {
      background: ${COLOR}; color: #fff;
      padding: 14px 16px; display: flex; align-items: center; gap: 10px;
    }
    #cb-header-dot { width: 10px; height: 10px; border-radius: 50%; background: #4ade80; }
    #cb-header-name { font-weight: 600; flex: 1; }
    #cb-close-btn {
      background: none; border: none; color: #fff; cursor: pointer;
      font-size: 20px; line-height: 1; padding: 0;
    }

    #cb-legal {
      background: #f8f9fa; border-bottom: 1px solid #e9ecef;
      padding: 10px 14px; font-size: 12px; color: #555; line-height: 1.5;
    }
    #cb-legal a { color: ${COLOR}; }
    #cb-legal-btn {
      margin-top: 6px; padding: 4px 12px;
      background: ${COLOR}; color: #fff; border: none; border-radius: 6px;
      cursor: pointer; font-size: 12px;
    }

    #cb-messages {
      flex: 1; overflow-y: auto; padding: 14px;
      display: flex; flex-direction: column; gap: 10px;
    }
    .cb-msg { max-width: 82%; padding: 9px 13px; border-radius: 12px; line-height: 1.5; }
    .cb-msg-user { align-self: flex-end; background: ${COLOR}; color: #fff; border-bottom-right-radius: 3px; }
    .cb-msg-bot  { align-self: flex-start; background: #f1f3f5; color: #1a1a2e; border-bottom-left-radius: 3px; }
    .cb-msg-typing { opacity: .6; font-style: italic; }

    #cb-input-area {
      padding: 10px 12px; border-top: 1px solid #e9ecef;
      display: flex; gap: 8px;
    }
    #cb-input {
      flex: 1; border: 1px solid #dee2e6; border-radius: 8px;
      padding: 8px 12px; font-size: 14px; outline: none;
      font-family: inherit;
    }
    #cb-input:focus { border-color: ${COLOR}; }
    #cb-send {
      background: ${COLOR}; color: #fff; border: none;
      border-radius: 8px; padding: 8px 14px; cursor: pointer; font-size: 18px;
    }
    #cb-send:disabled { opacity: .5; cursor: not-allowed; }
  `;
  document.head.appendChild(style);

  // ── HTML ──────────────────────────────────────────────────────────────────────
  const launcher = document.createElement('button');
  launcher.id = 'cb-launcher';
  launcher.setAttribute('aria-label', 'Abrir chat');
  launcher.innerHTML = `<svg viewBox="0 0 24 24"><path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Z"/></svg>`;

  const win = document.createElement('div');
  win.id = 'cb-window';
  win.classList.add('cb-hidden');
  win.innerHTML = `
    <div id="cb-header">
      <div id="cb-header-dot"></div>
      <span id="cb-header-name">${BOT_NOMBRE}</span>
      <button id="cb-close-btn" aria-label="Cerrar">×</button>
    </div>
    <div id="cb-legal">
      <strong>Asistente virtual automatizado</strong> — sistema de IA, no una persona.
      Las conversaciones pueden registrarse para mejorar el servicio.
      <a href="/politica-de-privacidad" target="_blank">Política de privacidad</a>
      <br>
      <button id="cb-legal-btn">Entendido</button>
    </div>
    <div id="cb-messages"></div>
    <div id="cb-input-area">
      <input id="cb-input" type="text" placeholder="Escribe tu consulta..." autocomplete="off">
      <button id="cb-send" aria-label="Enviar">➤</button>
    </div>
  `;

  document.body.appendChild(launcher);
  document.body.appendChild(win);

  // ── Referencias ───────────────────────────────────────────────────────────────
  const messagesEl  = win.querySelector('#cb-messages');
  const inputEl     = win.querySelector('#cb-input');
  const sendBtn     = win.querySelector('#cb-send');
  const legalEl     = win.querySelector('#cb-legal');
  const legalBtn    = win.querySelector('#cb-legal-btn');

  // ── Aviso legal — ocultar si ya fue aceptado ──────────────────────────────────
  if (localStorage.getItem('cb_legal_accepted')) legalEl.style.display = 'none';
  legalBtn.addEventListener('click', () => {
    localStorage.setItem('cb_legal_accepted', '1');
    legalEl.style.display = 'none';
  });

  // ── Abrir / cerrar ────────────────────────────────────────────────────────────
  function toggleChat() {
    isOpen = !isOpen;
    win.classList.toggle('cb-hidden', !isOpen);
    if (isOpen && history.length === 0) addBotMessage(
      `¡Hola! Soy ${BOT_NOMBRE}, el asistente virtual de este sitio. Soy un sistema de inteligencia artificial. ¿En qué puedo ayudarte?`
    );
    if (isOpen) inputEl.focus();
  }

  launcher.addEventListener('click', toggleChat);
  win.querySelector('#cb-close-btn').addEventListener('click', toggleChat);

  // ── Mensajes ──────────────────────────────────────────────────────────────────
  function addMessage(text, role) {
    const el = document.createElement('div');
    el.className = `cb-msg cb-msg-${role}`;
    el.textContent = text;
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return el;
  }

  function addBotMessage(text) { return addMessage(text, 'bot'); }
  function addUserMessage(text) { return addMessage(text, 'user'); }

  function showTyping() {
    const el = addBotMessage('Escribiendo...');
    el.classList.add('cb-msg-typing');
    return el;
  }

  // ── Enviar mensaje ────────────────────────────────────────────────────────────
  async function sendMessage() {
    const text = inputEl.value.trim();
    if (!text || isLoading) return;

    inputEl.value = '';
    isLoading = true;
    sendBtn.disabled = true;

    addUserMessage(text);
    history.push({ role: 'user', content: text });

    const typingEl = showTyping();

    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: SESSION_ID, messages: history }),
      });

      const data = await res.json();
      const reply = data.reply || 'Ha ocurrido un error. Por favor, inténtalo de nuevo.';

      typingEl.remove();
      addBotMessage(reply);
      history.push({ role: 'assistant', content: reply });

    } catch {
      typingEl.remove();
      addBotMessage('Error de conexión. Por favor, inténtalo de nuevo.');
    }

    isLoading = false;
    sendBtn.disabled = false;
    inputEl.focus();
  }

  sendBtn.addEventListener('click', sendMessage);
  inputEl.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) sendMessage(); });

})();
