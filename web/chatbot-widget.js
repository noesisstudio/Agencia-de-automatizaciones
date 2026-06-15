/**
 * Widget del chatbot Noesis — sin dependencias.
 * Llama a la función serverless de Netlify en el mismo dominio:
 * /.netlify/functions/chat  (no hay CORS ni URL externa que mantener).
 */
(function () {
  const ENDPOINT = '/.netlify/functions/chat';
  let messages = [];

  function el(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstChild;
  }

  function escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  const style = document.createElement('style');
  style.textContent = `
    #noesis-bot{position:fixed;right:20px;bottom:20px;z-index:99999;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
    #noesis-bot .nb-toggle{width:56px;height:56px;border-radius:50%;border:none;cursor:pointer;background:#111;color:#fff;box-shadow:0 6px 20px rgba(0,0,0,.18);display:flex;align-items:center;justify-content:center;transition:transform .2s}
    #noesis-bot .nb-toggle:hover{transform:scale(1.06)}
    #noesis-bot .nb-win{position:absolute;right:0;bottom:70px;width:360px;max-width:calc(100vw - 40px);height:540px;max-height:75vh;background:#fff;border-radius:16px;box-shadow:0 12px 48px rgba(0,0,0,.22);display:none;flex-direction:column;overflow:hidden}
    #noesis-bot.open .nb-win{display:flex}
    #noesis-bot .nb-head{background:#111;color:#fff;padding:14px 16px;display:flex;justify-content:space-between;align-items:center}
    #noesis-bot .nb-head strong{font-size:15px;font-weight:600}
    #noesis-bot .nb-head button{background:none;border:none;color:#fff;font-size:22px;cursor:pointer;line-height:1}
    #noesis-bot .nb-msgs{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;background:#fafafa}
    #noesis-bot .nb-msg{max-width:82%;padding:10px 13px;border-radius:14px;font-size:14px;line-height:1.45;white-space:pre-wrap;word-wrap:break-word}
    #noesis-bot .nb-msg.bot{align-self:flex-start;background:#fff;border:1px solid #ececec;color:#222;border-bottom-left-radius:4px}
    #noesis-bot .nb-msg.user{align-self:flex-end;background:#111;color:#fff;border-bottom-right-radius:4px}
    #noesis-bot .nb-dots span{display:inline-block;width:6px;height:6px;margin:0 1px;border-radius:50%;background:#bbb;animation:nbb 1.4s infinite}
    #noesis-bot .nb-dots span:nth-child(2){animation-delay:.2s}#noesis-bot .nb-dots span:nth-child(3){animation-delay:.4s}
    @keyframes nbb{0%,80%,100%{opacity:.4}40%{opacity:1}}
    #noesis-bot .nb-foot{border-top:1px solid #eee;padding:10px 12px;background:#fff}
    #noesis-bot .nb-note{font-size:10.5px;color:#999;text-align:center;margin:0 0 8px}
    #noesis-bot .nb-note a{color:#666}
    #noesis-bot .nb-row{display:flex;gap:8px}
    #noesis-bot .nb-row input{flex:1;border:1px solid #ddd;border-radius:10px;padding:10px 12px;font-size:14px;outline:none}
    #noesis-bot .nb-row input:focus{border-color:#111}
    #noesis-bot .nb-row button{border:none;background:#111;color:#fff;border-radius:10px;padding:0 14px;cursor:pointer;font-size:14px}
  `;
  document.head.appendChild(style);

  const root = el(`
    <div id="noesis-bot">
      <button class="nb-toggle" aria-label="Abrir asistente">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      </button>
      <div class="nb-win" role="dialog" aria-label="Asistente Noesis">
        <div class="nb-head"><strong>Asistente Noesis</strong><button class="nb-close" aria-label="Cerrar">×</button></div>
        <div class="nb-msgs"></div>
        <div class="nb-foot">
          <p class="nb-note">Asistente de IA · <a href="/privacidad.html" target="_blank" rel="noopener">Privacidad</a></p>
          <div class="nb-row">
            <input type="text" placeholder="Escribe tu pregunta…" aria-label="Mensaje" />
            <button class="nb-send" aria-label="Enviar">→</button>
          </div>
        </div>
      </div>
    </div>
  `);
  document.body.appendChild(root);

  const msgsEl = root.querySelector('.nb-msgs');
  const input = root.querySelector('input');

  function addMsg(role, text) {
    const m = el(`<div class="nb-msg ${role === 'user' ? 'user' : 'bot'}"></div>`);
    m.textContent = text;
    msgsEl.appendChild(m);
    msgsEl.scrollTop = msgsEl.scrollHeight;
    return m;
  }

  function showTyping() {
    const m = el('<div class="nb-msg bot nb-dots"><span></span><span></span><span></span></div>');
    msgsEl.appendChild(m);
    msgsEl.scrollTop = msgsEl.scrollHeight;
    return m;
  }

  async function send() {
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    addMsg('user', text);
    messages.push({ role: 'user', content: text });
    const typing = showTyping();

    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
      });
      const data = await res.json();
      typing.remove();
      const reply = data.reply || 'No he podido responder. Inténtalo de nuevo.';
      addMsg('bot', reply);
      messages.push({ role: 'assistant', content: reply });
    } catch (_) {
      typing.remove();
      addMsg('bot', 'Error de conexión. Inténtalo de nuevo en un momento.');
    }
  }

  root.querySelector('.nb-toggle').addEventListener('click', () => {
    root.classList.toggle('open');
    if (root.classList.contains('open')) {
      input.focus();
      if (messages.length === 0) addMsg('bot', '¡Hola! Soy el asistente de Noesis. ¿En qué puedo ayudarte?');
    }
  });
  root.querySelector('.nb-close').addEventListener('click', () => root.classList.remove('open'));
  root.querySelector('.nb-send').addEventListener('click', send);
  input.addEventListener('keypress', (e) => { if (e.key === 'Enter') send(); });
})();
