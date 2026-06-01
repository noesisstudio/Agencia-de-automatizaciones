(function () {
  var cfg = window.OPENIX || {};
  var url = String(cfg.chatApiBaseUrl || "").trim();
  if (!url) {
    return;
  }
  var s = document.createElement("script");
  s.src = "js/chatbot-widget.js";
  s.async = true;
  s.setAttribute("data-api-url", url);
  if (cfg.chatTenantId) {
    s.setAttribute("data-tenant-id", String(cfg.chatTenantId));
  }
  document.body.appendChild(s);
})();
