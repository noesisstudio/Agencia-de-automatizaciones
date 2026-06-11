(function(){"use strict";function w(){var p,a;const e=document.currentScript;if(!e)return{};const s=(p=e.getAttribute("data-api-url"))==null?void 0:p.trim(),c=(a=e.getAttribute("data-tenant-id"))==null?void 0:a.trim(),t={};return s&&(t.apiBaseUrl=s.replace(/\/$/,"")),c&&(t.tenantId=c),t}function y(e){return e.replace(/\/$/,"")}function v(e){var h;const s=y(e.apiBaseUrl),c=e.tenantId??"default",t=document.createElement("div");t.id="agencia-chatbot-root",document.body.appendChild(t);const p=t.attachShadow({mode:"open"}),a=document.createElement("style");a.textContent=`
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
  `;const n=document.createElement("div");n.className="panel",n.innerHTML=`
    <div class="head">Chat</div>
    <div class="msgs" id="msgs"></div>
    <div class="row">
      <input id="q" type="text" placeholder="Escribe un mensaje..." autocomplete="off" />
      <button class="send" id="send" type="button">Enviar</button>
    </div>
  `;const i=document.createElement("button");i.className="fab",i.type="button",i.setAttribute("aria-label","Abrir chat"),i.textContent="💬",p.append(a,i,n);const f=()=>n.querySelector("#msgs"),l=()=>n.querySelector("#q");function x(o,r){const d=document.createElement("div");d.className=`bubble ${r}`,d.textContent=o,f().appendChild(d),f().scrollTop=f().scrollHeight}let u=!1;function E(){u=!u,n.classList.toggle("open",u),u&&l().focus()}i.addEventListener("click",E);async function m(){const o=l().value.trim();if(o){l().value="",x(o,"user");try{const r=await fetch(`${s}/web/chat`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({question:o,tenant_id:c})});if(!r.ok)throw new Error(`HTTP ${r.status}`);const d=await r.json();x(d.answer??"Sin respuesta","bot")}catch{x("No se pudo conectar al servidor del chat.","bot")}}}(h=n.querySelector("#send"))==null||h.addEventListener("click",m),l().addEventListener("keydown",o=>{o.key==="Enter"&&m()})}function g(e){e.apiBaseUrl&&(document.getElementById("agencia-chatbot-root")||v(e))}window.AgenciaChatbot={init:g};const b=w();b.apiBaseUrl&&g({apiBaseUrl:b.apiBaseUrl,tenantId:b.tenantId})})();
