(function () {
  function emptyProfile(username) {
    return {
      user: username || "demo",
      company: "Tu empresa",
      plan: "—",
      invoices: [],
      payments: [],
      summary: {
        totalInvoiced: 0,
        pending: 0,
        paid: 0,
      },
    };
  }

  async function load(username) {
    var user = (username || "demo").toLowerCase().replace(/[^a-z0-9_-]/gi, "");
    var url = "data/client-billing/" + user + ".json";
    try {
      var res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return emptyProfile(username);
      return await res.json();
    } catch (e) {
      return emptyProfile(username);
    }
  }

  window.OpenixBilling = {
    load: load,
    emptyProfile: emptyProfile,
  };
})();
