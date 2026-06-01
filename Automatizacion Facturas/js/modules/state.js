export const state = new Proxy(
  {
    user: null,
    token: localStorage.getItem("facturai_token") || "",
    section: "dashboard",
    stats: null,
    invoices: [],
    clients: [],
    products: [],
    folders: [],
    theme: localStorage.getItem("facturai_theme") || 
           (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"),
    loading: false
  },
  {
    set(target, prop, value) {
      target[prop] = value;
      if (prop === "token") {
        if (value) localStorage.setItem("facturai_token", value);
        else localStorage.removeItem("facturai_token");
      }
      if (prop === "theme") {
        localStorage.setItem("facturai_theme", value);
      }
      _listeners.forEach((fn) => fn(prop, value));
      return true;
    }
  }
);

const _listeners = new Set();

export function subscribe(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}
