(function () {
  var KEY = "openixPortal";
  function hasSession() {
    try {
      var raw = sessionStorage.getItem(KEY);
      if (!raw) {
        return false;
      }
      var o = JSON.parse(raw);
      return o && typeof o === "object" && o.user;
    } catch (e) {
      return false;
    }
  }
  if (hasSession()) {
    return;
  }
  var next = "portal.html";
  try {
    var parts = location.pathname.split("/");
    var last = parts[parts.length - 1];
    if (last && /\.html?$/i.test(last)) {
      next = last;
    }
  } catch (e2) {
    /* ignore */
  }
  location.replace("login.html?next=" + encodeURIComponent(next));
})();
