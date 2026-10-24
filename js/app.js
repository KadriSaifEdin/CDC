/* app.js — Application Gestion des Stages (SPA front-end de démonstration).
   Tous les rendus utilisent textContent / createElement : aucune donnée utilisateur en innerHTML. */
"use strict";
(function () {
  var DB = window.GSDB, T = window.GSI18n;
  var view = document.getElementById("view");
  var state = { view: "dashboard", userId: sessionStorage.getItem("gs_user") || null, offerId: null, filter: {} };
  var lastActivity = Date.now();

  /* ---------- helpers ---------- */
  function h(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function btn(label, fn, cls) { var b = h("button", "btn " + (cls || ""), label); b.type = "button"; b.addEventListener("click", fn); return b; }
  function db() { return DB.db; }
  function me() { return db().users.find(function (u) { return u.id === state.userId; }) || null; }
  function user(id) { return db().users.find(function (u) { return u.id === id; }) || { name: "—", email: "" }; }
  function offer(id) { return db().offers.find(function (o) { return o.id === id; }); }
  function save() { DB.save(); }
  function go(v) { state.view = v; render(); window.scrollTo(0, 0); }
  function tag(text, kind) { return h("span", "tag" + (kind ? " tag-" + kind : ""), text); }
  function field(label, input) { var w = document.createElement("div"); var l = h("label", "f", label); w.appendChild(l); w.appendChild(input); return w; }
  function inp(type, val, attrs) { var i = document.createElement("input"); i.type = type || "text"; if (val != null) i.value = val; if (attrs) Object.keys(attrs).forEach(function (k) { i.setAttribute(k, attrs[k]); }); return i; }
  function sel(options, val) { var s = document.createElement("select"); options.forEach(function (o) { var op = h("option", null, o.label || o); op.value = o.value != null ? o.value : o; if (op.value === val) op.selected = true; s.appendChild(op); }); return s; }
  function area(val, rows) { var t = document.createElement("textarea"); t.rows = rows || 3; t.value = val || ""; return t; }
  function modal(node) { var m = document.getElementById("modal"); var c = document.getElementById("modal-card"); c.textContent = ""; if (typeof node === "string") c.appendChild(h("p", null, node)); else c.appendChild(node); var close = btn("Fermer", function () { m.hidden = true; }, "btn-secondary"); c.appendChild(close); T.translateDOM(c); m.hidden = false; }
  function toast(msg, ok) { var d = h("div", ok === false ? "error" : "ok", msg); T.translateDOM(d); d.setAttribute("role", "alert"); view.prepend(d); setTimeout(function () { d.remove(); }, 4500); }
  function statusTag(s) { var kind = s === "acceptee" || s === "validee" || s === "publiee" ? "" : (s === "refusee" || s === "expiree" || s === "cloturee" ? "err" : "warn"); return tag(T.statusLabel(s), kind); }
  function download(name, content, mime) { var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([content], { type: mime })); a.download = name; a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000); }
  function pdfDoc(title, lines, filename) {
    if (!window.jspdf) { toast("jsPDF indisponible", false); return; }
    var doc = new window.jspdf.jsPDF();
    doc.setFillColor(13, 31, 22); doc.rect(0, 0, 210, 24, "F");
    doc.setTextColor(218, 241, 222); doc.setFontSize(15); doc.text(title, 14, 15);
    doc.setTextColor(20, 56, 31); doc.setFontSize(11);
    var y = 36; lines.forEach(function (ln) { doc.splitTextToSize(String(ln), 180).forEach(function (part) { if (y > 280) { doc.addPage(); y = 20; } doc.text(part, 14, y); y += 7; }); });
    doc.setFontSize(8); doc.text("Gestion des Stages — Université · " + DB.today(), 14, 290);
    doc.save(filename);
  }

  /* ---------- navigation par rôle ---------- */
  var ALL = ["admin", "universite", "admin_entreprise", "etudiant", "entreprise", "encadrant"];
  var NAV = [
    ["dashboard", ALL],
    ["offers", ALL],
    ["apps", ["admin", "universite", "admin_entreprise", "etudiant", "entreprise", "encadrant"]],
    ["conventions", ["admin", "universite", "admin_entreprise", "etudiant", "entreprise"]],
    ["stages", ALL],
    ["suivi", ALL],
    ["rapports", ["admin", "universite", "admin_entreprise", "etudiant", "entreprise", "encadrant"]],
    ["evals", ["admin", "universite", "admin_entreprise", "etudiant", "entreprise"]],
    ["messages", ALL],
    ["calendar", ALL],
    ["annonces", ALL],
    ["recherche", ALL],
    ["users", ["admin", "universite", "admin_entreprise"]],
    ["admin", ["admin", "universite"]],
    ["aide", ALL],
    ["profile", ALL]
  ];
  function isAdminLike(u) { return u && (u.role === "admin" || u.role === "universite"); }
  var ICONS = {
    dashboard: "M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z", offers: "M3 8h18v12H3z M9 8V5h6v3 M3 13h18",
    apps: "M6 2h9l5 5v15H6z M14 2v6h6 M9 13h8 M9 17h8", conventions: "M4 20h16 M5 16l9-9 3 3-9 9H5z", stages: "M5 21V4 M5 4h13l-2 4 2 4H5",
    suivi: "M3 12h4l3-8 4 16 3-8h4", rapports: "M4 4h12a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3z M4 17a3 3 0 0 1 3-3h12",
    evals: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z", messages: "M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-5.4A8 8 0 1 1 21 12z",
    calendar: "M4 5h16v16H4z M4 10h16 M8 3v4 M16 3v4", annonces: "M3 11v3h4l8 4V7L7 11z M18 9a4 4 0 0 1 0 6", recherche: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z M21 21l-5-5",
    users: "M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1 M9.5 4a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z M21 19v-1a4 4 0 0 0-3-3.8 M16 4.2a3.5 3.5 0 0 1 0 6.6",
    admin: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z", aide: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7 M12 17h.01",
    profile: "M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M4 21a8 8 0 0 1 16 0"
  };
  function icon(name) {
    var NS = "http://www.w3.org/2000/svg", s = document.createElementNS(NS, "svg");
    s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("width", "20"); s.setAttribute("height", "20"); s.setAttribute("fill", "none");
    s.setAttribute("stroke", "currentColor"); s.setAttribute("stroke-width", "1.8"); s.setAttribute("stroke-linecap", "round"); s.setAttribute("stroke-linejoin", "round"); s.setAttribute("aria-hidden", "true");
    var p = document.createElementNS(NS, "path"); p.setAttribute("d", ICONS[name] || ICONS.dashboard); s.appendChild(p); return s;
  }
  function renderNav() {
    var nav = document.getElementById("side-nav"); nav.textContent = "";
    var u = me(); if (!u) return;
    var unread = db().notifications.filter(function (n) { return n.userId === u.id && !n.read; }).length;
    var unreadMsg = db().messages.filter(function (m) { return m.toId === u.id && !m.read; }).length;
    NAV.forEach(function (item) {
      if (item[1].indexOf(u.role) < 0) return;
      var b = h("button", "nav-btn" + (state.view === item[0] ? " active" : "")); b.type = "button";
      b.appendChild(icon(item[0])); b.appendChild(h("span", null, T.t("nav_" + item[0])));
      var n = item[0] === "dashboard" ? unread : item[0] === "messages" ? unreadMsg : 0;
      if (n) b.appendChild(h("span", "badge", String(n)));
      b.addEventListener("click", function () { go(item[0]); });
      nav.appendChild(b);
    });
  }

  /* ---------- vues ---------- */
  var VIEWS = {};

  VIEWS.cdc = function (root) {
    root.classList.add("cdc-card");
    root.appendChild(h("h2", null, "CDC SUPPORTEUR"));
    var f = document.createElement("iframe");
    f.src = "cdc-supporteur.html"; f.title = "CDC SUPPORTEUR"; f.className = "cdc-frame"; f.loading = "lazy";
    root.appendChild(f);
  };

  VIEWS.dashboard = function (root) {
    var u = me();
    var hr = new Date().getHours();
    var greet = hr >= 5 && hr < 18 ? "Bonjour" : "Bonsoir";
    var wel = h("div", "welcome");
    wel.appendChild(h("h1", null, greet + ", " + u.name));
    wel.appendChild(h("p", null, "Rôle : " + T.roleLabel(u.role) + (u.extra ? " · " + u.extra : "")));
    wel.appendChild(h("p", "muted", new Date().toLocaleDateString(T.locale(), { weekday: "long", day: "numeric", month: "long", year: "numeric" })));
    var quick = h("div", "actions");
    var Q = {
      etudiant: [["Parcourir les offres", "offers"], ["Mes candidatures", "apps"], ["Messagerie", "messages"]],
      entreprise: [["Rédiger une offre", "offers"], ["Candidatures", "apps"], ["Messagerie", "messages"]],
      admin_entreprise: [["Rédiger une offre", "offers"], ["Candidatures", "apps"], ["Utilisateurs", "users"]],
      encadrant: [["Candidatures", "apps"], ["Suivi du stage", "suivi"], ["Messagerie", "messages"]],
      universite: [["Utilisateurs", "users"], ["Conventions", "conventions"], ["Administration", "admin"]],
      admin: [["Utilisateurs", "users"], ["Conventions", "conventions"], ["Administration", "admin"]]
    };
    (Q[u.role] || Q.etudiant).forEach(function (q, i) { quick.appendChild(btn(q[0], function () { go(q[1]); }, i ? "btn-secondary" : "")); });
    wel.appendChild(quick);
    root.appendChild(wel);

    function mineApp(a) {
      return isAdminLike(u) || a.studentId === u.id || a.companyId === u.id || a.supervisorId === u.id || (u.role === "admin_entreprise" && user(a.companyId).company === u.company);
    }
    function mineStage(id) { var s = db().stages.find(function (x) { return x.id === id; }); return !!s && s.supervisorId === u.id; }
    var apps = db().applications.filter(mineApp);
    var convs = db().conventions.filter(function (c) { return isAdminLike(u) || c.studentId === u.id || c.companyId === u.id || mineStage(c.stageId) || (u.role === "admin_entreprise" && user(c.companyId).company === u.company); });
    var reps = db().reports.filter(function (r) { var a = db().applications.find(function (x) { return x.id === r.appId; }); return isAdminLike(u) || r.studentId === u.id || (a && mineApp(a)); });
    var unreadMsg = db().messages.filter(function (m) { return m.toId === u.id && !m.read; }).length;
    var stats = h("div", "stat-grid");
    [["Offres publiées", db().offers.filter(function (o) { return o.status === "publiee"; }).length],
     ["Candidatures", apps.length],
     ["Acceptées", apps.filter(function (a) { return ["acceptee", "confirmee", "approuvee"].indexOf(a.status) >= 0; }).length],
     ["Conventions validées", convs.filter(function (c) { return c.status === "validee"; }).length],
     ["Rapports déposés", reps.length],
     ["Messages non lus", unreadMsg]
    ].forEach(function (s) { var d = h("div", "stat"); var b = h("b", null, "0"); d.appendChild(b); d.appendChild(h("span", null, s[0])); stats.appendChild(d); countUp(b, s[1]); });
    root.appendChild(stats);
    root.appendChild(h("h2", null, "Notifications"));
    var mine = db().notifications.filter(function (n) { return n.userId === u.id; }).slice(0, 10);
    if (!mine.length) root.appendChild(h("p", "muted", "Aucune notification."));
    mine.forEach(function (n) {
      var row = h("div", "item"); row.appendChild(h("p", null, (n.read ? "" : "● ") + n.text));
      row.appendChild(h("p", "muted", new Date(n.date).toLocaleString(T.locale())));
      if (!n.read) row.appendChild(btn("Marquer comme lue", function () { n.read = true; save(); render(); }, "btn-small btn-secondary"));
      root.appendChild(row);
    });
    var ann = db().announcements[0];
    if (ann) { root.appendChild(h("h2", null, "Dernière annonce")); var a = h("div", "item"); a.appendChild(h("h3", null, ann.title)); a.appendChild(h("p", null, ann.text)); root.appendChild(a); }
  };

  /* ----- 2. Offres (EF-6, EF-16, EF-21, RG-9, Tableau 4) ----- */
  function placesRestantes(o) {
    if (!o.places) return null;
    var taken = db().applications.filter(function (a) { return a.offerId === o.id && ["acceptee", "confirmee", "approuvee"].indexOf(a.status) >= 0; }).length;
    return Math.max(0, o.places - taken);
  }
  function sameCompany(u, o) { return u && (o.companyId === u.id || (u.company && o.company === u.company)); }

  VIEWS.offers = function (root) {
    var u = me();
    root.appendChild(h("h1", null, T.t("nav_offers")));
    var f = state.filter;
    var bar = h("div", "toolbar card");
    var q = inp("search", f.q || "", { placeholder: "Rechercher un titre…" });
    var fDom = sel(["", "Informatique", "Data", "Marketing", "Finance", "RH"], f.domain || "");
    var fCity = inp("text", f.city || "", { placeholder: "Ville" });
    var fDur = inp("text", f.duration || "", { placeholder: "Durée (ex : 2 mois)" });
    var fType = sel(["", "PFE", "Été", "Stage ouvrier"], f.type || "");
    var fMode = sel(["", "Présentiel", "À distance", "Hybride"], f.mode || "");
    bar.appendChild(field("Recherche", q)); bar.appendChild(field("Domaine", fDom)); bar.appendChild(field("Ville", fCity)); bar.appendChild(field("Durée", fDur)); bar.appendChild(field("Type", fType)); bar.appendChild(field("Mode de travail", fMode));
    bar.appendChild(btn("Filtrer", function () { state.filter = { q: q.value, domain: fDom.value, city: fCity.value, duration: fDur.value, type: fType.value, mode: fMode.value }; render(); }));
    bar.appendChild(btn("Réinitialiser les filtres", function () { state.filter = {}; render(); }, "btn-secondary"));
    root.appendChild(bar);

    if (u.role === "entreprise" || u.role === "admin_entreprise") root.appendChild(offerStepperForm(u));

    var list = db().offers.filter(function (o) {
      var pub = ["publiee", "fermee", "complet"].indexOf(o.status) >= 0;
      var visible = pub || isAdminLike(u) || sameCompany(u, o);
      if (!visible) return false;
      if (f.q && o.title.toLowerCase().indexOf(f.q.toLowerCase()) < 0) return false;
      if (f.domain && o.domain !== f.domain) return false;
      if (f.city && o.city.toLowerCase().indexOf(f.city.toLowerCase()) < 0) return false;
      if (f.duration && o.duration !== f.duration) return false;
      if (f.type && o.type !== f.type) return false;
      if (f.mode && o.mode !== f.mode) return false;
      return true;
    });
    list.sort(function (a, b) { return a.created < b.created ? 1 : -1; });
    if (!list.length) root.appendChild(h("p", "muted", "Aucune offre ne correspond."));
    list.forEach(function (o) { root.appendChild(offerCard(o)); });
  };

  /* Formulaire d'offre en stepper (NF-1.5/1.6) : 3 étapes validées, brouillon à tout moment. */
  function offerStepperForm(u) {
    var draft = {};
    try { draft = JSON.parse(sessionStorage.getItem("gs_offer_draft") || "{}"); } catch (e) {}
    var step = state.offerStep || 0;
    var form = h("div", "card");
    form.appendChild(h("h2", null, u.role === "admin_entreprise" ? "Rédiger une offre (admin entreprise : publication directe possible)" : "Rédiger une offre"));
    var stp = h("div", "mini-stepper");
    ["Infos", "Conditions", "Détails"].forEach(function (label, i) {
      var c = h("span", "mini-circle" + (i === step ? " current" : "") + (i < step ? " done" : ""), i < step ? "✓" : String(i + 1));
      if (i < step) c.addEventListener("click", function () { state.offerStep = i; render(); });
      stp.appendChild(c); stp.appendChild(h("span", "mini-label", label));
    });
    form.appendChild(stp);
    var fields = {};
    function F(label, input, key) { fields[key] = input; return field(label, input); }
    var saveDraft = function () {
      var d = {};
      Object.keys(fields).forEach(function (k) { d[k] = fields[k].value; });
      sessionStorage.setItem("gs_offer_draft", JSON.stringify(Object.assign({}, draft, d)));
      return Object.assign({}, draft, d);
    };
    if (step === 0) {
      form.appendChild(F("Titre *", inp("text", draft.title || ""), "title"));
      form.appendChild(F("Domaine", sel(["Informatique", "Data", "Marketing", "Finance", "RH"], draft.domain || "Informatique"), "domain"));
      form.appendChild(F("Type", sel(["PFE", "Été", "Stage ouvrier"], draft.type || "PFE"), "type"));
      form.appendChild(F("Niveau", sel(["Licence", "Master", "Ingénieur"], draft.niveau || "Licence"), "niveau"));
    } else if (step === 1) {
      form.appendChild(F("Ville *", inp("text", draft.city || ""), "city"));
      form.appendChild(F("Mode de travail", sel(["Présentiel", "À distance", "Hybride"], draft.mode || "Présentiel"), "mode"));
      form.appendChild(F("Durée", sel(["1 mois", "2 mois", "3 mois", "6 mois"], draft.duration || "2 mois"), "duration"));
      form.appendChild(F("Places *", inp("number", draft.places || 1, { min: "1", max: "50" }), "places"));
      var dl = inp("date", draft.deadline || ""); if (!draft.deadline) dl.value = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
      form.appendChild(F("Date limite de candidature *", dl, "deadline"));
      form.appendChild(F("Horaires", inp("text", draft.horaires || "", { placeholder: "Ex : 09:00 – 17:00" }), "horaires"));
    } else {
      form.appendChild(F("Compétences", inp("text", draft.skills || ""), "skills"));
      form.appendChild(F("Description / missions", area(draft.desc || "", 4), "desc"));
      form.appendChild(F("Documents requis", inp("text", draft.docs || "", { placeholder: "CV, lettre de motivation…" }), "docs"));
      form.appendChild(F("Conditions d'admission", inp("text", draft.conditions || ""), "conditions"));
    }
    var acts = h("div", "actions");
    if (step > 0) acts.appendChild(btn("Retour", function () { saveDraft(); state.offerStep = step - 1; render(); }, "btn-secondary"));
    acts.appendChild(btn("Enregistrer le brouillon", function () {
      var d = saveDraft();
      if (!d.title || !d.title.trim()) { toast("Le titre est obligatoire pour un brouillon.", false); return; }
      createOffer(u, d, "brouillon"); sessionStorage.removeItem("gs_offer_draft"); state.offerStep = 0;
    }, "btn-secondary"));
    if (step < 2) acts.appendChild(btn("Continuer", function () {
      var d = saveDraft();
      if (step === 0 && (!d.title || !d.title.trim())) { toast("Étape 1 : le titre est obligatoire avant Continuer (NF-1.6).", false); return; }
      if (step === 1 && (!d.city || !d.city.trim() || !d.deadline || !(Number(d.places) >= 1))) { toast("Étape 2 : ville, places (≥1) et date limite sont obligatoires avant Continuer.", false); return; }
      state.offerStep = step + 1; render();
    }));
    else {
      acts.appendChild(btn("Prévisualiser", function () { var d = saveDraft(); var box = h("div"); box.appendChild(h("h2", null, d.title || "(sans titre)")); box.appendChild(h("p", null, (d.company || "") + " " + (d.city || "") + " · " + (d.mode || "") + " · " + (d.duration || "") + " · Places : " + (d.places || 1))); box.appendChild(h("p", null, d.desc || "")); modal(box); }, "btn-secondary"));
      acts.appendChild(btn("Soumettre à la relecture (admin entreprise)", function () {
        var d = saveDraft();
        if (!d.title || !d.city || !d.deadline) { toast("Titre, ville et date limite sont obligatoires.", false); return; }
        createOffer(u, d, u.role === "admin_entreprise" ? "publiee" : "en_relecture");
        sessionStorage.removeItem("gs_offer_draft"); state.offerStep = 0;
      }));
    }
    form.appendChild(acts);
    return form;
  }
  function createOffer(u, d, status) {
    var o = { id: DB.uid("o"), companyId: u.id, company: u.company || u.name, title: d.title.trim(), domain: d.domain, city: d.city.trim(), duration: d.duration, type: d.type, niveau: d.niveau || "", mode: d.mode || "Présentiel", places: Math.max(1, Number(d.places) || 1), skills: d.skills || "", desc: d.desc || "", docs: d.docs || "", conditions: d.conditions || "", horaires: d.horaires || "", deadline: d.deadline, status: status, created: DB.today() };
    db().offers.unshift(o);
    DB.log("Offre " + (status === "brouillon" ? "enregistrée en brouillon" : status === "publiee" ? "publiée directement (admin entreprise)" : "soumise à relecture") + " : " + o.title, u.name);
    db().users.filter(function (x) { return x.role === "admin_entreprise" && x.company === o.company; }).forEach(function (a) { DB.notify(a.id, "Offre à relire : " + o.title + " (" + o.company + ")"); });
    save(); toast(status === "brouillon" ? "Brouillon enregistré." : status === "publiee" ? "Offre publiée." : "Offre soumise à la relecture de l'admin entreprise."); render();
  }

  function offerCard(o) {
    var u = me();
    var c = h("div", "card");
    var head = h("div"); head.appendChild(h("h2", null, o.title)); head.appendChild(statusTag(o.status));
    c.appendChild(head);
    var rest = placesRestantes(o);
    c.appendChild(h("p", "muted", o.company + " · " + o.city + " · " + o.domain + " · " + o.duration + " · " + o.type + (o.mode ? " · " + o.mode : "") + " · Limite : " + o.deadline + (rest != null ? " · Places restantes : " + rest + "/" + o.places : "")));
    c.appendChild(h("p", null, o.desc));
    if (o.reviewComment) c.appendChild(h("p", "muted", "Commentaire de relecture : " + o.reviewComment));
    var nApps = db().applications.filter(function (a) { return a.offerId === o.id; }).length;
    c.appendChild(h("p", "muted", nApps + " candidature(s)"));
    var acts = h("div", "actions");
    acts.appendChild(btn("Détail", function () { state.offerId = o.id; go("offerDetail"); }, "btn-secondary"));
    if (u.role === "etudiant") {
      var fav = (u.favorites || []).indexOf(o.id) >= 0;
      acts.appendChild(btn(fav ? "★ Retirer des favoris" : "☆ Favori", function () {
        u.favorites = u.favorites || [];
        var i = u.favorites.indexOf(o.id); if (i >= 0) u.favorites.splice(i, 1); else u.favorites.push(o.id);
        save(); render();
      }, "btn-secondary"));
      if (o.status === "publiee" && (rest == null || rest > 0)) acts.appendChild(btn("Postuler", function () { applyForm(o); }));
    }
    if (u.role === "admin_entreprise" && sameCompany(u, o) && o.status === "en_relecture") {
      acts.appendChild(btn("Publier (relecture admin entreprise)", function () { o.status = "publiee"; o.reviewer = u.name; delete o.reviewComment; DB.log("Offre relue et publiée : " + o.title, u.name); DB.notify(o.companyId, "Votre offre a été relue et publiée : " + o.title); save(); render(); }));
      acts.appendChild(btn("Renvoyer en brouillon avec commentaire", function () {
        var box = h("div"); box.appendChild(h("h2", null, "Renvoyer en brouillon : " + o.title));
        var cm = area("", 3); cm.setAttribute("placeholder", "Motif / corrections demandées…");
        box.appendChild(field("Commentaire de relecture", cm));
        box.appendChild(btn("Renvoyer", function () { o.status = "brouillon"; o.reviewComment = cm.value.trim(); DB.log("Offre renvoyée en brouillon : " + o.title, u.name); DB.notify(o.companyId, "Offre renvoyée en brouillon : " + o.title + (cm.value.trim() ? " — " + cm.value.trim() : "")); save(); document.getElementById("modal").hidden = true; render(); }));
        modal(box);
      }, "btn-danger"));
    }
    if ((u.role === "entreprise" && o.companyId === u.id) || (u.role === "admin_entreprise" && sameCompany(u, o))) {
      acts.appendChild(btn("Modifier", function () { editOfferForm(o); }, "btn-secondary"));
      if (o.status === "brouillon") acts.appendChild(btn("Soumettre à la relecture (admin entreprise)", function () { o.status = u.role === "admin_entreprise" ? "publiee" : "en_relecture"; DB.log("Offre soumise/publiée : " + o.title, u.name); save(); render(); }, "btn-secondary"));
      if (o.status === "publiee") acts.appendChild(btn("Fermer", function () { o.status = "fermee"; DB.log("Offre fermée : " + o.title, u.name); save(); render(); }, "btn-secondary"));
      if (o.status === "fermee" && o.deadline >= DB.today()) acts.appendChild(btn("Rouvrir", function () { o.status = "publiee"; DB.log("Offre rouverte : " + o.title, u.name); save(); render(); }, "btn-secondary"));
      if (o.status === "fermee" || o.status === "complet") acts.appendChild(btn("Archiver", function () { o.status = "archivee"; DB.log("Offre archivée : " + o.title, u.name); save(); render(); }, "btn-secondary"));
      if (o.status === "brouillon") acts.appendChild(btn("Supprimer", function () { if (confirm("Supprimer ce brouillon ?")) { db().offers = db().offers.filter(function (x) { return x.id !== o.id; }); DB.log("Offre supprimée : " + o.title, u.name); save(); render(); } }, "btn-danger"));
    }
    c.appendChild(acts);
    return c;
  }

  VIEWS.offerDetail = function (root) {
    var o = offer(state.offerId);
    if (!o) { root.appendChild(h("p", null, "Offre introuvable.")); return; }
    root.appendChild(h("h1", null, o.title));
    root.appendChild(statusTag(o.status));
    [["Entreprise", o.company], ["Domaine", o.domain], ["Ville", o.city], ["Durée", o.duration], ["Type", o.type], ["Mode de travail", o.mode || "—"], ["Niveau", o.niveau || "—"], ["Compétences", o.skills || "—"], ["Places", o.places != null ? String(o.places) : "—"], ["Horaires", o.horaires || "—"], ["Documents requis", o.docs || "—"], ["Conditions d'admission", o.conditions || "—"], ["Date limite", o.deadline], ["Publiée le", o.created]].forEach(function (r) {
      var p = h("p", null, ""); p.appendChild(h("strong", null, r[0] + " : ")); p.appendChild(document.createTextNode(r[1])); root.appendChild(p);
    });
    root.appendChild(h("p", null, o.desc));
    var acts = h("div", "actions");
    acts.appendChild(btn("← Retour aux offres", function () { go("offers"); }, "btn-secondary"));
    if (me().role === "etudiant" && o.status === "publiee") acts.appendChild(btn("Postuler", function () { applyForm(o); }));
    root.appendChild(acts);
    var apps = db().applications.filter(function (a) { return a.offerId === o.id; });
    root.appendChild(h("p", "muted", apps.length + " candidature(s) pour cette offre."));
  };

  function editOfferForm(o) {
    var box = h("div"); box.appendChild(h("h2", null, "Modifier l'offre"));
    var title = inp("text", o.title), city = inp("text", o.city), desc = area(o.desc), dl = inp("date", o.deadline);
    [field("Titre", title), field("Ville", city), field("Description", desc), field("Date limite", dl)].forEach(function (x) { box.appendChild(x); });
    box.appendChild(btn("Enregistrer", function () { o.title = title.value.trim() || o.title; o.city = city.value.trim() || o.city; o.desc = desc.value; o.deadline = dl.value || o.deadline; if (o.status === "fermee" && o.deadline >= DB.today()) o.status = "publiee"; else if (o.status === "en_relecture") o.status = "brouillon"; DB.log("Offre modifiée : " + o.title, me().name); save(); document.getElementById("modal").hidden = true; render(); }));
    modal(box);
  }

  /* ----- 3. Candidatures ----- */
  function applyForm(o) {
    var box = h("div"); box.appendChild(h("h2", null, "Postuler : " + o.title));
    var cv = inp("file"); cv.setAttribute("accept", ".pdf,.doc,.docx");
    var letter = area("", 5); letter.setAttribute("placeholder", "Lettre de motivation…");
    box.appendChild(field("CV (PDF)", cv)); box.appendChild(field("Lettre de motivation", letter));
    box.appendChild(btn("Envoyer la candidature", function () {
      var u = me();
      if (o.status !== "publiee") { toast("Candidature bloquée : l'offre n'est pas publiée (fermée, complète ou échue) — RG-1.", false); return; }
      if (o.deadline < DB.today()) { toast("Candidature bloquée : le délai de candidature est dépassé.", false); return; }
      var rest0 = placesRestantes(o); if (rest0 != null && rest0 <= 0) { toast("Candidature bloquée : l'offre est complète (places pourvues).", false); return; }
      if (cv.files && cv.files[0]) {
        var fn = cv.files[0].name.toLowerCase();
        if (!/\.(pdf|docx|jpg|png)$/.test(fn)) { toast("Fichier rejeté : formats acceptés PDF, DOCX, JPG, PNG (EN-5).", false); return; }
        if (cv.files[0].size > 10 * 1024 * 1024) { toast("Fichier rejeté : 10 Mo maximum par fichier (EN-5).", false); return; }
      }
      if (db().applications.some(function (a) { return a.offerId === o.id && a.studentId === u.id && a.status !== "annulee"; })) { toast("Tu as déjà postulé à cette offre.", false); return; }
      if (!letter.value.trim()) { toast("La lettre de motivation est obligatoire.", false); return; }
      var a = { id: DB.uid("a"), offerId: o.id, studentId: u.id, companyId: o.companyId, cvName: cv.files && cv.files[0] ? cv.files[0].name : "CV_non_fourni.pdf", letter: letter.value.trim(), status: "envoyee", interview: "", supervisorId: "", created: DB.today(), history: [{ s: "envoyee", d: DB.today() }] };
      db().applications.unshift(a); DB.log("Candidature de " + u.name + " → " + o.title, u.name); DB.notify(o.companyId, "Nouvelle candidature de " + u.name + " pour : " + o.title);
      save(); document.getElementById("modal").hidden = true; toast("Candidature envoyée."); go("apps");
    }));
    modal(box);
  }
  function setAppStatus(a, s) {
    a.status = s; a.history.push({ s: s, d: DB.today(), by: me() ? me().name : "système" });
    DB.log("Candidature " + a.id + " → " + s, me().name);
    DB.notify(a.studentId, "Ta candidature pour « " + (offer(a.offerId) || {}).title + " » est : " + s);
    save(); render();
  }
  VIEWS.apps = function (root) {
    var u = me();
    root.appendChild(h("h1", null, T.t("nav_apps")));
    var apps = db().applications.filter(function (a) {
      if (isAdminLike(u)) return true;
      if (u.role === "etudiant") return a.studentId === u.id;
      if (u.role === "entreprise") return a.companyId === u.id;
      if (u.role === "admin_entreprise") { var of = offer(a.offerId); return of && u.company && of.company === u.company; }
      if (u.role === "encadrant") return a.supervisorId === u.id;
      return false;
    });
    if (!apps.length) root.appendChild(h("p", "muted", "Aucune candidature."));
    apps.forEach(function (a) {
      var o = offer(a.offerId) || { title: "(offre supprimée)" };
      var c = h("div", "card");
      c.appendChild(h("h2", null, o.title)); c.appendChild(statusTag(a.status));
      c.appendChild(h("p", "muted", "Étudiant : " + user(a.studentId).name + " (" + (user(a.studentId).numero || "") + ") · Entreprise : " + (o.company || user(a.companyId).name) + " · CV : " + a.cvName + " · Le " + a.created));
      c.appendChild(h("p", null, "Lettre : " + a.letter));
      if (a.complementRequest) c.appendChild(h("p", null, "Pièces complémentaires demandées : " + a.complementRequest));
      if (a.extraDocs) c.appendChild(h("p", "muted", "Pièces complémentaires envoyées : " + a.extraDocs));
      if (a.univRequest) c.appendChild(h("p", null, "Complément demandé par l'encadrant universitaire : " + a.univRequest));
      if (a.internalNotes && (u.role === "entreprise" || u.role === "admin_entreprise")) c.appendChild(h("p", "muted", "Notes internes : " + a.internalNotes));
      if (a.interview) c.appendChild(h("p", null, "Entretien prévu : " + a.interview.replace("T", " à ") + (a.interviewMode ? " · " + a.interviewMode : "") + (a.interviewPlace ? " · " + a.interviewPlace : "")));
      if (a.interviewResult) c.appendChild(h("p", null, "Résultat de l'entretien : " + a.interviewResult));
      if (a.status === "acceptee" && a.acceptedAt) {
        var dl = new Date(a.acceptedAt); dl.setDate(dl.getDate() + 7);
        c.appendChild(h("p", null, "Confirmer dans les 7 jours, avant le " + dl.toISOString().slice(0, 10) + " (RG-4)."));
      }
      if (a.decisionMotif) c.appendChild(h("p", "muted", "Motif : " + a.decisionMotif));
      c.appendChild(h("p", "muted", "Historique : " + a.history.map(function (x) { return T.statusLabel(x.s) + " (" + x.d + (x.by ? ", " + x.by : "") + ")"; }).join(" → ")));
      var acts = h("div", "actions");

      /* Étudiant */
      if (u.role === "etudiant" && a.studentId === u.id) {
        if (["envoyee", "en_cours", "infos_demandees", "entretien_programme"].indexOf(a.status) >= 0)
          acts.appendChild(btn("Retirer ma candidature", function () { setAppStatus(a, "retiree"); }, "btn-danger"));
        if (a.status === "infos_demandees") {
          var f2 = inp("file");
          acts.appendChild(field("Pièces complémentaires", f2));
          acts.appendChild(btn("Envoyer les pièces", function () {
            a.extraDocs = f2.files && f2.files[0] ? f2.files[0].name : "pièces complémentaires";
            a.complementRequest = ""; setAppStatus(a, "en_cours");
            DB.notify(a.companyId, "Pièces complémentaires reçues de " + u.name + " pour : " + o.title);
          }));
        }
        if (a.status === "acceptee") acts.appendChild(btn("Confirmer mon stage (délai de 7 jours)", function () {
          a.confirmedAt = DB.today(); setAppStatus(a, "confirmee");
          /* RG-5 : une seule confirmation par période — les autres candidatures en cours sont retirées. */
          db().applications.forEach(function (b) {
            if (b.id !== a.id && b.studentId === u.id && ["envoyee", "en_cours", "infos_demandees", "entretien_programme", "acceptee"].indexOf(b.status) >= 0) {
              b.status = "retiree"; b.history.push({ s: "retiree", d: DB.today(), by: "système (RG-5)" });
              DB.notify(b.companyId, "Candidature retirée automatiquement (autre stage confirmé) : " + u.name);
            }
          });
          DB.notifyAdmins("Stage confirmé par " + u.name + " : " + o.title + ". Affecter un encadrant universitaire.");
          save(); render();
        }));
        if (a.univRequest) acts.appendChild(btn("Marquer le complément comme envoyé", function () { a.univRequest = ""; DB.notify(a.supervisorId, "Dossier complété par " + u.name + " : " + o.title); save(); render(); }, "btn-secondary"));
      }

      /* Entreprise (encadrant professionnel) */
      if (u.role === "entreprise" && a.companyId === u.id && ["annulee", "retiree", "refusee", "expiree", "approuvee", "non_approuvee"].indexOf(a.status) < 0) {
        if (a.status === "envoyee") acts.appendChild(btn("Mettre en cours d'examen", function () { setAppStatus(a, "en_cours"); }, "btn-secondary"));
        if (a.status === "en_cours" || a.status === "entretien_programme") {
          acts.appendChild(btn("Demander des pièces complémentaires", function () {
            var box = h("div"); box.appendChild(h("h2", null, "Pièces complémentaires"));
            var note = area("", 3); note.setAttribute("placeholder", "Pièces demandées…");
            box.appendChild(field("Détail de la demande", note));
            box.appendChild(btn("Envoyer la demande", function () { a.complementRequest = note.value.trim(); setAppStatus(a, "infos_demandees"); document.getElementById("modal").hidden = true; }));
            modal(box);
          }, "btn-secondary"));
          var dt = inp("datetime-local", "");
          var mode = sel(["Présentiel", "Visioconférence"]);
          var place = inp("text", "", { placeholder: "Lieu ou lien de visioconférence" });
          acts.appendChild(field("Planifier un entretien (candidature en examen — RG-12)", dt));
          acts.appendChild(field("Mode", mode)); acts.appendChild(field("Lieu ou lien de visioconférence", place));
          acts.appendChild(btn("Planifier", function () {
            if (!dt.value) { toast("Choisis une date d'entretien.", false); return; }
            a.interview = dt.value; a.interviewMode = mode.value; a.interviewPlace = place.value.trim();
            setAppStatus(a, "entretien_programme");
            DB.notify(a.studentId, "Entretien programmé le " + dt.value.replace("T", " à ") + " (" + mode.value + ") pour : " + o.title);
          }, "btn-secondary"));
          var res = inp("text", a.interviewResult || "", { placeholder: "Résultat de l'entretien" });
          acts.appendChild(field("Résultat de l'entretien", res));
          acts.appendChild(btn("Saisir le résultat", function () { a.interviewResult = res.value.trim(); DB.log("Résultat d'entretien : " + user(a.studentId).name, u.name); save(); render(); }, "btn-secondary"));
        }
        if (a.status !== "acceptee" && a.status !== "confirmee") acts.appendChild(btn("Accepter", function () {
          var rest = placesRestantes(o);
          if (rest != null && rest <= 0) { toast("Acceptation bloquée : plus de place disponible pour cette offre (RG-3).", false); return; }
          a.acceptedAt = DB.today(); setAppStatus(a, "acceptee");
          DB.notify(a.studentId, "Candidature acceptée pour « " + o.title + " » : confirme dans les 7 jours (RG-4).");
        }));
        if (a.status !== "refusee") acts.appendChild(btn("Refuser", function () {
          var box = h("div"); box.appendChild(h("h2", null, "Refuser la candidature"));
          var motif = area("", 2); box.appendChild(field("Motif (communiqué à l'étudiant)", motif));
          box.appendChild(btn("Confirmer le refus", function () { a.decisionMotif = motif.value.trim(); setAppStatus(a, "refusee"); document.getElementById("modal").hidden = true; }));
          modal(box);
        }, "btn-danger"));
        var ni = area(a.internalNotes || "", 2); ni.setAttribute("placeholder", "Notes internes (visibles par l'entreprise uniquement)…");
        c.appendChild(field("Notes internes", ni));
        c.appendChild(btn("Enregistrer les notes internes", function () { a.internalNotes = ni.value; save(); toast("Notes enregistrées."); }, "btn-secondary"));
      }

      /* Encadrant universitaire : approbation du dossier confirmé (EF-22.1) */
      if (u.role === "encadrant" && a.supervisorId === u.id && a.status === "confirmee") {
        acts.appendChild(btn("Approuver le dossier (créer le stage officiel)", function () {
          setAppStatus(a, "approuvee");
          var st = { id: DB.uid("s"), appId: a.id, studentId: a.studentId, companyId: a.companyId, supervisorId: u.id, status: "cree", start: "", end: "", subject: o.title, horaire: "09:00", workDays: "Lun–Ven", programme: "", created: DB.today() };
          db().stages.unshift(st);
          DB.notify(a.studentId, "Ton dossier est approuvé : le stage officiel est créé (" + o.title + ").");
          DB.notify(a.companyId, "Dossier approuvé par l'encadrant universitaire : " + user(a.studentId).name);
          DB.notifyAdmins("Stage officiel créé : " + user(a.studentId).name + " — " + o.title);
          DB.log("Stage officiel créé : " + user(a.studentId).name + " / " + o.title, u.name);
          save(); toast("Stage officiel créé. La convention peut être générée."); go("stages");
        }));
        acts.appendChild(btn("Rejeter le dossier", function () {
          var box = h("div"); box.appendChild(h("h2", null, "Rejeter le dossier"));
          var motif = area("", 2); box.appendChild(field("Motif", motif));
          box.appendChild(btn("Confirmer le rejet", function () { a.decisionMotif = motif.value.trim(); setAppStatus(a, "non_approuvee"); DB.notify(a.studentId, "Dossier non approuvé : " + (motif.value.trim() || "voir l'encadrant")); document.getElementById("modal").hidden = true; }));
          modal(box);
        }, "btn-danger"));
        acts.appendChild(btn("Demander de compléter le dossier", function () {
          var box = h("div"); box.appendChild(h("h2", null, "Demander de compléter"));
          var note = area("", 2); box.appendChild(field("Ce qui manque", note));
          box.appendChild(btn("Envoyer", function () { a.univRequest = note.value.trim(); DB.notify(a.studentId, "Complément demandé pour ton dossier : " + note.value.trim()); DB.log("Complément demandé : " + user(a.studentId).name, u.name); save(); document.getElementById("modal").hidden = true; render(); }));
          modal(box);
        }, "btn-secondary"));
      }
      if (u.role === "encadrant" && a.supervisorId === u.id && a.status !== "confirmee") c.appendChild(h("p", "muted", "Approbation : en attente de la confirmation de l'étudiant ou déjà traitée."));
      c.appendChild(acts); root.appendChild(c);
    });
  };

  /* ----- 4. Conventions (EF-10, EF-18.2, EF-31, Tableau 7) : par stage officiel,
     circuit étudiant → entreprise → administration universitaire ----- */
  function stageById(id) { return (db().stages || []).find(function (x) { return x.id === id; }); }
  function visibleStages(u) {
    return (db().stages || []).filter(function (st) {
      if (isAdminLike(u)) return true;
      if (u.role === "etudiant") return st.studentId === u.id;
      if (u.role === "entreprise") return st.companyId === u.id;
      if (u.role === "admin_entreprise") { var of = offer((db().applications.find(function (a) { return a.id === st.appId; }) || {}).offerId); return of && u.company && of.company === u.company; }
      if (u.role === "encadrant") return st.supervisorId === u.id;
      return false;
    });
  }
  VIEWS.conventions = function (root) {
    var u = me();
    root.appendChild(h("h1", null, T.t("nav_conventions")));
    root.appendChild(h("p", "muted", "Circuit de validation : étudiant, entreprise, puis administration. La convention est générée en PDF pour un stage officiel approuvé."));
    var stages = visibleStages(u);
    if (!stages.length) root.appendChild(h("p", "muted", "Aucun stage officiel pour le moment. Le stage est créé après acceptation, confirmation de l'étudiant (7 jours) et approbation de l'encadrant universitaire."));
    stages.forEach(function (st) {
      var card = h("div", "card");
      card.appendChild(h("h2", null, st.subject || "Stage"));
      card.appendChild(h("p", "muted", "Étudiant : " + user(st.studentId).name + " · Entreprise : " + user(st.companyId).name + " · Encadrant universitaire : " + (st.supervisorId ? user(st.supervisorId).name : "—") + " · Stage : "));
      card.lastChild.appendChild(statusTag(st.status));
      var conv = (db().conventions || []).find(function (c) { return c.stageId === st.id; });
      if (!conv) {
        var start = inp("date", st.start || ""), end = inp("date", st.end || ""), subj = inp("text", st.subject || ""), sup = inp("text", st.proSupervisor || "", { placeholder: "Encadrant professionnel (entreprise)" });
        [field("Date de début", start), field("Date de fin", end), field("Sujet", subj), field("Encadrant entreprise", sup)].forEach(function (x) { card.appendChild(x); });
        card.appendChild(btn("Générer la convention (PDF)", function () {
          if (!start.value || !end.value || end.value <= start.value) { toast("Dates valides obligatoires (fin après début).", false); return; }
          st.start = start.value; st.end = end.value; st.subject = subj.value.trim() || st.subject; st.proSupervisor = sup.value.trim();
          var c = { id: DB.uid("c"), numero: "CONV-" + new Date().getFullYear() + "-" + String((db().conventions || []).length + 1).padStart(3, "0"), stageId: st.id, appId: st.appId, studentId: st.studentId, companyId: st.companyId, start: start.value, end: end.value, subject: st.subject, companySupervisor: sup.value.trim(), status: "generee", validations: { etudiant: false, entreprise: false, admin: false }, created: DB.today(), createdAt: new Date().toISOString(), validatedAt: null };
          db().conventions.unshift(c);
          DB.notify(st.studentId, "Convention générée : " + c.subject + " — à valider en ligne.");
          DB.notify(st.companyId, "Convention générée : " + c.subject);
          DB.log("Convention générée " + c.numero + " : " + c.subject, u.name); save(); render();
        }));
        root.appendChild(card); return;
      }
      card.appendChild(h("p", null, "Convention " + conv.numero + " · Du " + conv.start + " au " + conv.end));
      card.appendChild(statusTag(conv.status));
      card.appendChild(h("p", "muted", "Validations — Étudiant : " + (conv.validations.etudiant ? "✓" : "…") + " · Entreprise : " + (conv.validations.entreprise ? "✓" : "…") + " · Administration : " + (conv.validations.admin ? "✓" : "…")));
      var acts = h("div", "actions");
      acts.appendChild(btn("Télécharger la convention (PDF)", function () {
        pdfDoc("Convention de stage " + conv.numero, ["Étudiant : " + user(conv.studentId).name + " (" + (user(conv.studentId).numero || "") + ")", "Entreprise : " + user(conv.companyId).name, "Sujet : " + conv.subject, "Période : du " + conv.start + " au " + conv.end, "Encadrant entreprise : " + (conv.companySupervisor || "—"), "Encadrant universitaire : " + (st.supervisorId ? user(st.supervisorId).name : "—"), "Statut : " + T.statusLabel(conv.status), "Validations : étudiant " + (conv.validations.etudiant ? "oui" : "non") + " · entreprise " + (conv.validations.entreprise ? "oui" : "non") + " · administration " + (conv.validations.admin ? "oui" : "non"), "Signatures : Étudiant ______ · Entreprise ______ · Université ______"], "convention-" + conv.numero + ".pdf");
        DB.log("Convention PDF téléchargée : " + conv.numero, u.name); save();
      }, "btn-secondary"));
      if (conv.status === "generee" || conv.status === "en_validation") {
        if (u.role === "etudiant" && st.studentId === u.id && !conv.validations.etudiant)
          acts.appendChild(btn("Valider la convention (étudiant)", function () { conv.validations.etudiant = true; conv.status = "en_validation"; DB.notify(conv.companyId, "Convention validée par l'étudiant : " + conv.subject); DB.log("Convention validée par l'étudiant : " + conv.numero, u.name); save(); render(); }));
        if (u.role === "entreprise" && st.companyId === u.id && conv.validations.etudiant && !conv.validations.entreprise)
          acts.appendChild(btn("Valider la convention (entreprise)", function () { conv.validations.entreprise = true; conv.status = "en_validation"; DB.notifyAdmins("Convention à valider (administration) : " + conv.subject); DB.notify(conv.studentId, "Convention validée par l'entreprise : " + conv.subject); DB.log("Convention validée par l'entreprise : " + conv.numero, u.name); save(); render(); }));
        if (isAdminLike(u) && conv.validations.entreprise && !conv.validations.admin)
          acts.appendChild(btn("Valider (université)", function () {
            conv.validations.admin = true; conv.status = "validee"; conv.validatedAt = new Date().toISOString();
            if (st.status === "cree") st.status = "convention_validee";
            DB.notify(conv.studentId, "Ta convention est validée : " + conv.subject);
            DB.notify(conv.companyId, "Convention validée par l'administration : " + conv.subject);
            DB.log("Convention validée par l'université : " + conv.numero, u.name); save(); render();
          }));
        acts.appendChild(btn("Refuser", function () { conv.status = "refusee"; DB.notify(conv.studentId, "Convention refusée : " + conv.subject + " — une nouvelle version doit être générée."); DB.log("Convention refusée : " + conv.numero, u.name); save(); render(); }, "btn-danger"));
      }
      if (conv.status === "refusee") acts.appendChild(btn("Régénérer une nouvelle version", function () { conv.validations = { etudiant: false, entreprise: false, admin: false }; conv.status = "generee"; conv.createdAt = new Date().toISOString(); conv.validatedAt = null; save(); render(); }, "btn-secondary"));
      if (conv.status === "validee" && conv.validatedAt) card.appendChild(h("p", "muted", "Validée le " + new Date(conv.validatedAt).toLocaleString(T.locale())));
      card.appendChild(acts); root.appendChild(card);
    });
  };

  /* ----- Stages officiels : organisation, présence, tâches, clôture (EF-11, EF-12, EF-19, EF-23, EF-33, RG-7/8/13/14) ----- */
  VIEWS.stages = function (root) {
    var u = me();
    root.appendChild(h("h1", null, T.t("nav_stages")));
    var holidays = (db().events || []).filter(function (e) { return e.type === "ferie"; });
    if (holidays.length) root.appendChild(h("p", "muted", "Jours fériés : " + holidays.map(function (x) { return x.date + " (" + x.title + ")"; }).join(" · ")));
    var stages = visibleStages(u);
    if (!stages.length) root.appendChild(h("p", "muted", "Aucun stage officiel. Il est créé après l'approbation du dossier par l'encadrant universitaire."));
    stages.forEach(function (st) {
      var card = h("div", "card");
      card.appendChild(h("h2", null, st.subject || "Stage"));
      card.appendChild(statusTag(st.status));
      card.appendChild(h("p", "muted", "Étudiant : " + user(st.studentId).name + " · Entreprise : " + user(st.companyId).name + " · Encadrant universitaire : " + (st.supervisorId ? user(st.supervisorId).name : "—") + (st.proSupervisor ? " · Encadrant professionnel : " + st.proSupervisor : "") + " · Période : " + (st.start || "—") + " → " + (st.end || "—")));
      if (st.readyDefense) card.appendChild(h("p", null, "Prêt pour la soutenance ✓ (RG-13)"));

      /* Administration universitaire : cycle de vie du stage */
      if (isAdminLike(u)) {
        var acts = h("div", "actions");
        if (st.status === "convention_validee") acts.appendChild(btn("Démarrer le stage (RG-7)", function () { st.status = "en_cours"; DB.notify(st.studentId, "Ton stage a commencé : " + st.subject); DB.log("Stage démarré : " + user(st.studentId).name, u.name); save(); render(); }));
        if (st.status === "en_cours") acts.appendChild(btn("Marquer comme terminé", function () { st.status = "termine"; save(); render(); }, "btn-secondary"));
        if (st.status !== "cloture" && st.status !== "annule") acts.appendChild(btn("Annuler le stage", function () { st.status = "annule"; DB.notify(st.studentId, "Stage annulé par l'administration : " + st.subject); save(); render(); }, "btn-danger"));
        card.appendChild(acts);
        /* Clôture (RG-14) : notes validées + procès-verbal enregistrés */
        var rep = (db().reports || []).filter(function (r) { return r.appId === st.appId; }).sort(function (a, b) { return b.version - a.version; })[0];
        var sous = (db().soutenances || []).find(function (x) { return x.appId === st.appId; });
        if (st.status !== "cloture" && (st.readyDefense || st.status === "termine")) {
          var pv = area(st.pv || "", 2); pv.setAttribute("placeholder", "Procès-verbal de soutenance…");
          var note = inp("number", rep && rep.grade != null ? rep.grade : "", { min: "0", max: "20", step: "0.25" });
          card.appendChild(field("Procès-verbal de soutenance", pv));
          card.appendChild(field("Note finale /20", note));
          card.appendChild(btn("Valider les notes et clôturer le dossier", function () {
            if (!sous) { toast("Clôture impossible : aucune soutenance planifiée pour ce dossier.", false); return; }
            if (!pv.value.trim()) { toast("Clôture impossible : le procès-verbal est obligatoire (RG-14).", false); return; }
            var g = Number(note.value); if (isNaN(g) || g < 0 || g > 20) { toast("Saisis une note finale entre 0 et 20.", false); return; }
            if (rep) rep.grade = g;
            st.pv = pv.value.trim(); st.finalGrade = g; st.status = "cloture";
            DB.notify(st.studentId, "Dossier clôturé. Note finale validée : " + g + "/20. Le procès-verbal est consultable.");
            DB.log("Dossier clôturé (note " + g + "/20, PV enregistré) : " + user(st.studentId).name, u.name);
            save(); render();
          }));
        }
        if (st.status === "cloture") { card.appendChild(h("p", null, "Note finale validée : " + st.finalGrade + "/20")); card.appendChild(h("p", "muted", "Procès-verbal : " + (st.pv || ""))); }
      }

      /* Entreprise : organisation du stage (EF-19.1) */
      if (u.role === "entreprise" && st.companyId === u.id) {
        var hor = inp("time", st.horaire || "09:00"), days = inp("text", st.workDays || "Lun–Ven"), prog = area(st.programme || "", 2), pro = inp("text", st.proSupervisor || "");
        card.appendChild(field("Horaire de début", hor)); card.appendChild(field("Jours de présence", days));
        card.appendChild(field("Programme du stage", prog)); card.appendChild(field("Encadrant professionnel désigné", pro));
        card.appendChild(btn("Enregistrer l'organisation", function () { st.horaire = hor.value || "09:00"; st.workDays = days.value; st.programme = prog.value; st.proSupervisor = pro.value.trim(); DB.notify(st.studentId, "Organisation de ton stage mise à jour (horaire, jours, programme)."); DB.log("Organisation du stage : " + user(st.studentId).name, u.name); save(); render(); }, "btn-secondary"));
      }
      if (st.programme) card.appendChild(h("p", "muted", "Programme : " + st.programme + " · Horaire : " + (st.horaire || "09:00") + " · Jours : " + (st.workDays || "—")));

      /* Encadrant universitaire : programme de suivi + prêt soutenance (EF-23.1, EF-26.2) */
      if (u.role === "encadrant" && st.supervisorId === u.id) {
        var sp = area(st.suiviProgramme || "", 2); sp.setAttribute("placeholder", "Phases du projet, réunions périodiques…");
        card.appendChild(field("Programme de suivi (encadrant)", sp));
        card.appendChild(btn("Enregistrer le programme de suivi", function () { st.suiviProgramme = sp.value; save(); render(); }, "btn-secondary"));
        if (!st.readyDefense) card.appendChild(btn("Déclarer le dossier prêt pour la soutenance", function () {
          var hasFinal = (db().reports || []).some(function (r) { return r.appId === st.appId && r.docStatus === "acceptee"; });
          var hasEval = (db().evaluations || []).some(function (e) { return e.appId === st.appId && e.kind === "entreprise_stagiaire"; });
          if (!hasFinal || !hasEval) { toast("Pas encore prêt (RG-13) : il faut le rapport final approuvé (statut Acceptée) et la fiche d'évaluation de l'entreprise.", false); return; }
          st.readyDefense = true; DB.notifyAdmins("Dossier prêt pour la soutenance : " + user(st.studentId).name); DB.log("Dossier prêt pour soutenance : " + user(st.studentId).name, u.name); save(); render();
        }));
      }
      if (st.suiviProgramme) card.appendChild(h("p", "muted", "Programme de suivi : " + st.suiviProgramme));

      /* Présence quotidienne (EF-11, RG-8) */
      card.appendChild(h("h3", null, "Registre de présence"));
      var recs = (db().attendance || []).filter(function (r) { return r.stageId === st.id; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; });
      var presentDays = recs.filter(function (r) { return r.status === "present" || r.status === "retard" || r.status === "excusee"; }).length;
      card.appendChild(h("p", "muted", "Présences enregistrées : " + presentDays + " jour(s) · Objectif du CDC : au moins 95 % des jours de stage."));
      recs.slice(0, 10).forEach(function (r) {
        var line = h("p", "muted", r.date + " · arrivée " + (r.inTime || "—") + " · départ " + (r.outTime || "—") + " · ");
        line.appendChild(statusTag(r.status));
        if (r.justification) line.appendChild(document.createTextNode(" · Justification : " + r.justification));
        card.appendChild(line);
        if ((u.role === "entreprise" && st.companyId === u.id) && r.status === "justifiee")
          card.lastChild.appendChild(btn("Valider la justification", function () { r.status = "excusee"; DB.notify(st.studentId, "Justification d'absence acceptée pour le " + r.date); save(); render(); }, "btn-small btn-secondary"));
      });
      if (u.role === "etudiant" && st.studentId === u.id && (st.status === "en_cours" || st.status === "convention_validee")) {
        var todayStr = DB.today();
        var isHoliday = holidays.some(function (x) { return x.date === todayStr; });
        var rec = recs.find(function (r) { return r.date === todayStr; });
        var pActs = h("div", "actions");
        if (isHoliday) pActs.appendChild(h("span", "muted", "Aujourd'hui est un jour férié : pas de pointage (RG-8)."));
        else if (!rec) pActs.appendChild(btn("Pointer mon arrivée", function () {
          var now = new Date(); var hhmm = String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
          var late = st.horaire && hhmm > st.horaire && (function () { var a = hhmm.split(":"), b = st.horaire.split(":"); return (Number(a[0]) * 60 + Number(a[1])) - (Number(b[0]) * 60 + Number(b[1])) > 15; })();
          db().attendance.unshift({ id: DB.uid("at"), stageId: st.id, studentId: u.id, date: todayStr, inTime: hhmm, outTime: "", status: late ? "retard" : "present", justification: "" });
          DB.log("Présence (arrivée " + hhmm + (late ? ", retard" : "") + ") : " + u.name, u.name); save(); render();
        }));
        else if (!rec.outTime) pActs.appendChild(btn("Pointer mon départ", function () {
          var now = new Date(); rec.outTime = String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
          DB.log("Présence (départ " + rec.outTime + ") : " + u.name, u.name); save(); render();
        }, "btn-secondary"));
        card.appendChild(pActs);
        var jd = inp("date", ""), jt = inp("text", "", { placeholder: "Motif de l'absence" });
        card.appendChild(field("Justifier une absence (72 h) — date", jd));
        card.appendChild(field("Justification", jt));
        card.appendChild(btn("Envoyer la justification", function () {
          if (!jd.value || !jt.value.trim()) { toast("Date et motif obligatoires.", false); return; }
          var ex = (db().attendance || []).find(function (r) { return r.stageId === st.id && r.date === jd.value; });
          if (ex) { ex.justification = jt.value.trim(); ex.status = "justifiee"; }
          else db().attendance.unshift({ id: DB.uid("at"), stageId: st.id, studentId: u.id, date: jd.value, inTime: "", outTime: "", status: "justifiee", justification: jt.value.trim() });
          DB.notify(st.companyId, "Justification d'absence de " + u.name + " pour le " + jd.value);
          save(); render();
        }, "btn-secondary"));
      }

      /* Tâches du stage (EF-12) */
      card.appendChild(h("h3", null, "Tâches"));
      st.tasks = st.tasks || [];
      st.tasks.forEach(function (tk, i) {
        var line = h("p", "muted", (tk.done ? "✓ " : "☐ ") + tk.title + (tk.due ? " · échéance " + tk.due : "") + " · avancement " + (tk.progress || 0) + " %");
        if (u.role === "etudiant" && st.studentId === u.id) line.appendChild(btn(tk.done ? "Rouvrir" : "Marquer en revue / terminée", function () { tk.done = !tk.done; tk.progress = tk.done ? 100 : tk.progress; save(); render(); }, "btn-small btn-secondary"));
        card.appendChild(line);
      });
      if (u.role === "entreprise" && st.companyId === u.id || u.role === "etudiant" && st.studentId === u.id) {
        var tt = inp("text", "", { placeholder: "Nouvelle tâche…" }), td = inp("date", "");
        card.appendChild(field("Tâche", tt)); card.appendChild(field("Échéance", td));
        card.appendChild(btn("Ajouter une tâche", function () { if (!tt.value.trim()) return; st.tasks.push({ title: tt.value.trim(), due: td.value, done: false, progress: 0 }); save(); render(); }, "btn-secondary"));
      }
      root.appendChild(card);
    });
  };

  /* ----- 5. Suivi ----- */
  function myStages(u) {
    return db().applications.filter(function (a) {
      if (["acceptee", "confirmee", "approuvee"].indexOf(a.status) < 0) return false;
      if (isAdminLike(u)) return true;
      if (u.role === "etudiant") return a.studentId === u.id;
      if (u.role === "entreprise") return a.companyId === u.id;
      if (u.role === "encadrant") return a.supervisorId === u.id;
      return false;
    });
  }
  VIEWS.suivi = function (root) {
    var u = me();
    root.appendChild(h("h1", null, T.t("nav_suivi")));
    var stages = myStages(u);
    if (u.role === "encadrant") root.appendChild(h("p", "muted", "Étudiants suivis : " + stages.length));
    if (!stages.length) root.appendChild(h("p", "muted", "Aucun stage en cours de suivi. (L'université affecte un encadrant académique à une candidature acceptée.)"));
    stages.forEach(function (a) {
      var o = offer(a.offerId) || {};
      var card = h("div", "card");
      card.appendChild(h("h2", null, (o.title || "Stage") + " — " + user(a.studentId).name));
      card.appendChild(h("p", "muted", "Entreprise : " + user(a.companyId).name + " · Encadrant académique : " + (a.supervisorId ? user(a.supervisorId).name : "non affecté") + " · Avancement : " + (a.progress || 0) + " %"));
      var prog = h("div", "progress"); var fill = h("div"); fill.style.width = (a.progress || 0) + "%"; prog.appendChild(fill); card.appendChild(prog);
      var acts = h("div", "actions");
      if (isAdminLike(u)) {
        var sups = db().users.filter(function (x) { return x.role === "encadrant"; });
        var s = sel([{ value: "", label: "— Choisir un encadrant —" }].concat(sups.map(function (x) { return { value: x.id, label: x.name }; })), a.supervisorId || "");
        acts.appendChild(field("Affecter un encadrant académique", s));
        acts.appendChild(btn("Affecter", function () { if (!s.value) { toast("Choisis un encadrant.", false); return; } a.supervisorId = s.value; DB.notify(s.value, "Nouvel étudiant à suivre : " + user(a.studentId).name); DB.notify(a.studentId, "Ton encadrant académique : " + user(s.value).name); DB.log("Encadrant affecté : " + user(s.value).name + " → " + user(a.studentId).name, u.name); save(); render(); }, "btn-secondary"));
      }
      if (u.role === "etudiant") {
        var p = inp("number", a.progress || 0, { min: "0", max: "100" });
        acts.appendChild(field("Avancement %", p));
        acts.appendChild(btn("Mettre à jour l'avancement", function () { a.progress = Math.max(0, Math.min(100, Number(p.value) || 0)); save(); render(); }, "btn-secondary"));
        var task = inp("text", "", { placeholder: "Nouvelle tâche…" });
        acts.appendChild(field("Tâche", task));
        acts.appendChild(btn("Ajouter une tâche", function () { if (!task.value.trim()) return; a.tasks = a.tasks || []; a.tasks.push({ text: task.value.trim(), done: false }); save(); render(); }, "btn-secondary"));
        var jt = area("", 2); jt.setAttribute("placeholder", "Entrée du journal de bord…");
        card.appendChild(field("Journal de bord — nouvelle entrée", jt));
        card.appendChild(btn("Ajouter au journal", function () { if (!jt.value.trim()) { toast("Écris une entrée de journal.", false); return; } db().journals.unshift({ id: DB.uid("j"), appId: a.id, studentId: u.id, text: jt.value.trim(), date: DB.today() }); DB.log("Journal de bord : " + user(a.studentId).name, u.name); save(); render(); }));
      }
      if (a.tasks && a.tasks.length) {
        var ul = h("ul"); a.tasks.forEach(function (tk, i) { var li = h("li", null, (tk.done ? "✓ " : "☐ ") + tk.text); if (u.role === "etudiant") li.appendChild(btn(tk.done ? "Rouvrir" : "Terminer", function () { tk.done = !tk.done; save(); render(); }, "btn-small btn-secondary")); ul.appendChild(li); }); card.appendChild(ul);
      }
      var entries = db().journals.filter(function (j) { return j.appId === a.id; });
      if (entries.length) { card.appendChild(h("h3", null, "Journal de bord")); entries.slice(0, 8).forEach(function (j) { card.appendChild(h("p", "muted", j.date + " — " + j.text)); }); }
      /* Commentaires de l'encadrant + évaluation mi-parcours entreprise */
      var comments = (a.supervisorComments || []);
      if (comments.length) { card.appendChild(h("h3", null, "Commentaires de l'encadrant")); comments.forEach(function (cm) { card.appendChild(h("p", "muted", cm.date + " — " + cm.text)); }); }
      if (u.role === "encadrant" && a.supervisorId === u.id) {
        var cmIn = area("", 2); cmIn.setAttribute("placeholder", "Commentaire de suivi…");
        card.appendChild(field("Ton commentaire", cmIn));
        card.appendChild(btn("Publier le commentaire", function () { if (!cmIn.value.trim()) return; a.supervisorComments = a.supervisorComments || []; a.supervisorComments.push({ text: cmIn.value.trim(), date: DB.today(), by: u.id }); DB.notify(a.studentId, "Nouveau commentaire de ton encadrant."); save(); render(); }));
      }
      if (a.midterm) card.appendChild(h("p", null, "Évaluation mi-parcours (entreprise) : " + a.midterm.note + "/20 — " + a.midterm.text));
      if (u.role === "entreprise" && a.companyId === u.id) {
        var mn = inp("number", "", { min: "0", max: "20" }); var mt = inp("text", "", { placeholder: "Appréciation mi-parcours" });
        card.appendChild(field("Note mi-parcours /20", mn)); card.appendChild(field("Appréciation", mt));
        card.appendChild(btn("Enregistrer l'évaluation mi-parcours", function () { a.midterm = { note: mn.value, text: mt.value }; DB.notify(a.studentId, "Évaluation de mi-parcours reçue : " + mn.value + "/20"); DB.log("Mi-parcours : " + user(a.studentId).name, u.name); save(); render(); }, "btn-secondary"));
      }
      card.appendChild(acts); root.appendChild(card);
    });
  };

  /* ----- 6. Rapport et soutenance ----- */
  VIEWS.rapports = function (root) {
    var u = me();
    root.appendChild(h("h1", null, T.t("nav_rapports")));
    var stages = myStages(u);
    if (u.role === "etudiant") {
      var form = h("div", "card"); form.appendChild(h("h2", null, "Déposer le rapport (PDF)"));
      if (!stages.length) form.appendChild(h("p", "muted", "Aucun stage accepté pour le moment."));
      else {
        var appSel = sel(stages.map(function (a) { return { value: a.id, label: (offer(a.offerId) || {}).title + " — " + user(a.companyId).name }; }));
        var file = inp("file"); file.setAttribute("accept", ".pdf");
        form.appendChild(field("Stage", appSel)); form.appendChild(field("Fichier PDF", file));
        form.appendChild(btn("Déposer (nouvelle version)", function () {
          if (!file.files || !file.files[0]) { toast("Choisis un fichier PDF.", false); return; }
          var mine = db().reports.filter(function (r) { return r.appId === appSel.value; });
          var r = { id: DB.uid("r"), appId: appSel.value, studentId: u.id, fileName: file.files[0].name, version: mine.length + 1, date: DB.today(), grade: null, docStatus: "en_attente" };
          db().reports.unshift(r); var a = db().applications.find(function (x) { return x.id === appSel.value; });
          if (a && a.supervisorId) DB.notify(a.supervisorId, "Nouveau rapport v" + r.version + " de " + u.name);
          DB.log("Rapport v" + r.version + " déposé par " + u.name, u.name); save(); toast("Rapport v" + r.version + " déposé."); render();
        }));
      }
      root.appendChild(form);
    }
    var reps = db().reports.filter(function (r) {
      if (isAdminLike(u)) return true;
      if (u.role === "etudiant") return r.studentId === u.id;
      var a = db().applications.find(function (x) { return x.id === r.appId; });
      if (!a) return false;
      if (u.role === "encadrant") return a.supervisorId === u.id;
      if (u.role === "entreprise") return a.companyId === u.id;
      return false;
    });
    if (!reps.length) root.appendChild(h("p", "muted", "Aucun rapport déposé."));
    reps.forEach(function (r) {
      var a = db().applications.find(function (x) { return x.id === r.appId; });
      var card = h("div", "card");
      card.appendChild(h("h2", null, r.fileName + " — v" + r.version));
      card.appendChild(h("p", "muted", "Étudiant : " + user(r.studentId).name + " · Déposé le " + r.date + (r.grade != null ? " · Note finale : " + r.grade + "/20" : " · Note : non saisie"))); var ds = h("p", null, "État du document : "); ds.appendChild(statusTag(r.docStatus || "en_attente")); card.appendChild(ds);
      var cmts = db().reportComments.filter(function (c) { return c.reportId === r.id; });
      cmts.forEach(function (c) { card.appendChild(h("p", "muted", "Correction/commentaire (" + c.date + ") : " + c.text)); });
      var acts = h("div", "actions");
      if (u.role === "encadrant" && a && a.supervisorId === u.id) {
        var dsActs = h("div", "actions");
        dsActs.appendChild(btn("Accepter le document", function () { r.docStatus = "acceptee"; DB.notify(r.studentId, "Ton rapport v" + r.version + " est accepté."); save(); render(); }));
        dsActs.appendChild(btn("À corriger", function () { r.docStatus = "a_corriger"; DB.notify(r.studentId, "Ton rapport v" + r.version + " est à corriger."); save(); render(); }, "btn-secondary"));
        dsActs.appendChild(btn("Refuser le document", function () { r.docStatus = "refusee"; DB.notify(r.studentId, "Ton rapport v" + r.version + " est refusé."); save(); render(); }, "btn-danger"));
        card.appendChild(dsActs);
        var cm = area("", 2); cm.setAttribute("placeholder", "Commentaire / correction…");
        card.appendChild(field("Commentaire de l'encadrant", cm));
        card.appendChild(btn("Envoyer le commentaire", function () { if (!cm.value.trim()) return; db().reportComments.push({ id: DB.uid("rc"), reportId: r.id, text: cm.value.trim(), date: DB.today(), by: u.id }); DB.notify(r.studentId, "Nouveau commentaire sur ton rapport v" + r.version); save(); render(); }, "btn-secondary"));
        var when = inp("datetime-local"); var room = inp("text", "", { placeholder: "Salle / lien" }); var jury = inp("text", "", { placeholder: "Jury (noms des enseignants)" });
        card.appendChild(field("Planifier la soutenance", when)); card.appendChild(field("Salle", room)); card.appendChild(field("Jury de soutenance", jury));
        card.appendChild(btn("Planifier la soutenance", function () { if (!when.value) { toast("Choisis une date.", false); return; } db().soutenances.unshift({ id: DB.uid("s"), reportId: r.id, appId: r.appId, when: when.value, room: room.value, jury: jury.value.trim(), by: u.id }); DB.notify(r.studentId, "Soutenance planifiée le " + when.value.replace("T", " à ") + " · Jury : " + jury.value.trim()); DB.log("Soutenance planifiée : " + user(r.studentId).name, u.name); save(); render(); }));
        var grade = inp("number", r.grade != null ? r.grade : "", { min: "0", max: "20", step: "0.25" });
        card.appendChild(field("Note finale /20", grade));
        card.appendChild(btn("Saisir la note finale", function () { var g = Number(grade.value); if (isNaN(g) || g < 0 || g > 20) { toast("Note entre 0 et 20.", false); return; } r.grade = g; DB.notify(r.studentId, "Ta note finale de stage : " + g + "/20"); DB.log("Note finale " + g + "/20 : " + user(r.studentId).name, u.name); save(); render(); }));
      }
      if (isAdminLike(u)) {
        var when2 = inp("datetime-local"); var room2 = inp("text", "", { placeholder: "Salle / lien" }); var jury2 = inp("text", "", { placeholder: "Jury (noms des enseignants)" });
        card.appendChild(field("Planifier la soutenance (université)", when2)); card.appendChild(field("Salle", room2)); card.appendChild(field("Jury de soutenance", jury2));
        card.appendChild(btn("Planifier", function () { if (!when2.value) { toast("Choisis une date.", false); return; } db().soutenances.unshift({ id: DB.uid("s"), reportId: r.id, appId: r.appId, when: when2.value, room: room2.value, jury: jury2.value.trim(), by: u.id }); DB.notify(r.studentId, "Soutenance planifiée le " + when2.value.replace("T", " à ")); save(); render(); }, "btn-secondary"));
      }
      if (u.role === "etudiant" && r.grade != null) card.appendChild(h("p", null, "Ta note finale : " + r.grade + "/20"));
      card.appendChild(acts); root.appendChild(card);
    });
    var sous = db().soutenances.filter(function (s) {
      if (isAdminLike(u) || u.role === "encadrant") return true;
      var a = db().applications.find(function (x) { return x.id === s.appId; });
      return a && (a.studentId === u.id || a.companyId === u.id);
    });
    if (sous.length) { root.appendChild(h("h2", null, "Soutenances planifiées")); sous.forEach(function (s) { root.appendChild(h("p", "muted", s.when.replace("T", " à ") + " · " + (s.room || "") + (s.jury ? " · Jury : " + s.jury : "") + " · Étudiant : " + user((db().applications.find(function (x) { return x.id === s.appId; }) || {}).studentId).name)); }); }
  };

  /* ----- 7. Évaluations ----- */
  VIEWS.evals = function (root) {
    var u = me();
    root.appendChild(h("h1", null, T.t("nav_evals")));
    var stages = myStages(u);
    stages.forEach(function (a) {
      var o = offer(a.offerId) || {};
      var card = h("div", "card");
      card.appendChild(h("h2", null, (o.title || "Stage") + " — " + user(a.studentId).name + " / " + user(a.companyId).name));
      var mine = db().evaluations.filter(function (e) { return e.appId === a.id; });
      mine.forEach(function (e) { card.appendChild(h("p", "muted", (e.kind === "entreprise_stagiaire" ? "Entreprise → stagiaire" : "Étudiant → entreprise") + " : " + e.note + "/20 — " + e.text + (e.criteria ? " · Critères : " + Object.keys(e.criteria).map(function (k) { return k + " " + e.criteria[k]; }).join(", ") : ""))); });
      if (u.role === "entreprise" && a.companyId === u.id) {
        var critNames = ["Discipline", "Compétences techniques", "Autonomie", "Communication", "Qualité du travail"];
        var critInputs = critNames.map(function (cn) { var i = inp("number", "", { min: "0", max: "20" }); card.appendChild(field("Critères d'évaluation — " + cn + " /20", i)); return i; });
        var tx = area("", 2);
        card.appendChild(field("Appréciation", tx));
        card.appendChild(btn("Enregistrer l'évaluation", function () {
          var vals = critInputs.map(function (i) { return Number(i.value); });
          if (vals.some(function (v) { return isNaN(v) || v < 0 || v > 20; })) { toast("Chaque critère doit être noté entre 0 et 20.", false); return; }
          var avg = Math.round(vals.reduce(function (x, y) { return x + y; }, 0) / vals.length * 100) / 100;
          var crit = {}; critNames.forEach(function (cn, i) { crit[cn] = vals[i]; });
          db().evaluations.push({ id: DB.uid("e"), appId: a.id, kind: "entreprise_stagiaire", note: avg, criteria: crit, text: tx.value, by: u.id, date: DB.today() });
          DB.notify(a.studentId, "L'entreprise a déposé ton évaluation. Moyenne : " + avg + "/20");
          DB.log("Évaluation entreprise (moyenne " + avg + "/20) : " + user(a.studentId).name, u.name);
          save(); toast("Évaluation enregistrée. Moyenne : " + avg + "/20"); render();
        }));
        card.appendChild(btn("Générer l'attestation de stage (PDF)", function () {
          pdfDoc("Attestation de stage", ["L'entreprise " + user(a.companyId).name + " atteste que " + user(a.studentId).name, "a effectué un stage : " + (o.title || "") + ".", "Évaluation de l'entreprise : " + (mine.length ? mine[mine.length - 1].note + "/20" : "—"), "Fait le " + DB.today() + ".", "Signature de l'entreprise : ______"], "attestation-" + a.id + ".pdf");
          DB.log("Attestation générée : " + user(a.studentId).name, u.name); save();
        }, "btn-secondary"));
      }
      if (u.role === "etudiant" && a.studentId === u.id) {
        var n2 = inp("number", "", { min: "0", max: "20" }); var tx2 = area("", 2);
        card.appendChild(field("Évaluer l'entreprise — note /20", n2)); card.appendChild(field("Ton retour", tx2));
        card.appendChild(btn("Enregistrer mon évaluation", function () { db().evaluations.push({ id: DB.uid("e"), appId: a.id, kind: "etudiant_entreprise", note: n2.value, text: tx2.value, by: u.id, date: DB.today() }); DB.notify(a.companyId, "Un étudiant a évalué ton entreprise."); save(); render(); }));
      }
      root.appendChild(card);
    });
    if (!stages.length) root.appendChild(h("p", "muted", "Aucun stage accepté à évaluer."));
    if (isAdminLike(u)) db().evaluations.forEach(function (e) { root.appendChild(h("p", "muted", e.date + " · " + e.kind + " · " + e.note + "/20 · " + e.text)); });
  };

  /* ----- 8. Communication : messagerie PRIVÉE (pas d'annuaire, destinataire saisi à la main) ----- */
  function findRecipient(q) {
    q = (q || "").trim().toLowerCase(); if (!q) return null;
    return db().users.find(function (x) { return x.active && x.id !== state.userId && (x.email.toLowerCase() === q || (x.numero && x.numero.toLowerCase() === q)); }) || null;
  }
  VIEWS.messages = function (root) {
    var u = me();
    u.archivedThreads = u.archivedThreads || []; u.pinnedThreads = u.pinnedThreads || [];
    root.appendChild(h("h1", null, T.t("nav_messages")));
    var note = h("div", "privacy-note"); note.appendChild(h("span", null, "🔒"));
    note.appendChild(h("span", null, "Messagerie privée : toi seul(e) et ton interlocuteur voyez vos échanges. Il n'y a pas d'annuaire : pour écrire à quelqu'un, saisis son email ou son numéro universitaire."));
    root.appendChild(note);

    var convs = {};
    db().messages.forEach(function (m) {
      if (m.archived || (m.fromId !== u.id && m.toId !== u.id)) return;
      var other = m.fromId === u.id ? m.toId : m.fromId;
      (convs[other] = convs[other] || []).push(m);
    });
    function last(id) { return convs[id].reduce(function (a, b) { return a.date > b.date ? a : b; }); }
    function unread(id) { return (convs[id] || []).filter(function (m) { return m.toId === u.id && !m.read; }).length; }
    var ids = Object.keys(convs).filter(function (id) { return state.showArchived ? u.archivedThreads.indexOf(id) >= 0 : (u.archivedThreads.indexOf(id) < 0 || unread(id)); });
    ids.sort(function (a, b) {
      var pa = u.pinnedThreads.indexOf(a) >= 0 ? 1 : 0, pb = u.pinnedThreads.indexOf(b) >= 0 ? 1 : 0;
      return pa !== pb ? pb - pa : (last(a).date < last(b).date ? 1 : -1);
    });
    var nArch = Object.keys(convs).filter(function (id) { return u.archivedThreads.indexOf(id) >= 0 && !unread(id); }).length;

    var wrap = h("div", "chat");
    var left = h("div", "conv-col");
    var nw = h("div", "card");
    nw.appendChild(h("h2", null, "Nouvelle conversation"));
    var to = inp("text", "", { placeholder: "Email ou numéro universitaire", autocomplete: "off", spellcheck: "false" });
    nw.appendChild(field("Destinataire", to));
    var startConv = function () {
      var r = findRecipient(to.value);
      if (!r) { toast("Aucun utilisateur actif ne correspond à cet identifiant. Vérifie l'email ou le numéro.", false); return; }
      state.thread = r.id; state.showArchived = false; render();
    };
    to.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); startConv(); } });
    nw.appendChild(btn("Écrire", startConv));
    left.appendChild(nw);
    if (!ids.length) left.appendChild(h("p", "muted", state.showArchived ? "Aucune conversation archivée." : "Aucune conversation."));
    ids.forEach(function (id) {
      var o = user(id), lm = convs[id] && last(id), n = unread(id);
      var c = h("button", "conv" + (state.thread === id ? " on" : "")); c.type = "button";
      var t1 = h("b", null, (u.pinnedThreads.indexOf(id) >= 0 ? "📌 " : "") + o.name);
      c.appendChild(t1);
      c.appendChild(h("small", null, (lm.fromId === u.id ? "Moi : " : "") + lm.text));
      if (n) c.appendChild(h("span", "badge", String(n)));
      c.addEventListener("click", function () { state.thread = id; render(); });
      left.appendChild(c);
    });
    if (nArch || state.showArchived) left.appendChild(btn(state.showArchived ? "← Conversations actives" : "Archivées (" + nArch + ")", function () { state.showArchived = !state.showArchived; render(); }, "btn-small btn-secondary"));
    wrap.appendChild(left);

    var other = state.thread ? db().users.find(function (x) { return x.id === state.thread && x.id !== u.id; }) : null;
    var th = h("div", "thread");
    if (!other) {
      var em = h("div", "empty");
      em.appendChild(h("p", null, "✉️"));
      em.appendChild(h("b", null, "Choisis une conversation"));
      em.appendChild(h("p", "muted", "ou démarre-en une nouvelle avec l'email ou le numéro universitaire de ton interlocuteur."));
      th.appendChild(em);
    } else {
      var msgs = (convs[other.id] || []).slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
      var changed = false;
      msgs.forEach(function (m) { if (m.toId === u.id && !m.read) { m.read = true; changed = true; } });
      if (changed) { save(); renderNav(); }
      var head = h("div", "thread-head");
      var who = h("div"); who.appendChild(h("b", null, other.name)); who.appendChild(document.createTextNode(" ")); who.appendChild(tag(T.roleLabel(other.role), "soft"));
      head.appendChild(who);
      var ha = h("div", "actions");
      var pinned = u.pinnedThreads.indexOf(other.id) >= 0;
      ha.appendChild(btn(pinned ? "Désépingler" : "Épingler", function () { if (pinned) u.pinnedThreads.splice(u.pinnedThreads.indexOf(other.id), 1); else u.pinnedThreads.push(other.id); save(); render(); }, "btn-small btn-secondary"));
      var archived = u.archivedThreads.indexOf(other.id) >= 0;
      ha.appendChild(btn(archived ? "Désarchiver" : "Archiver", function () { if (archived) u.archivedThreads.splice(u.archivedThreads.indexOf(other.id), 1); else { u.archivedThreads.push(other.id); state.thread = null; } save(); render(); }, "btn-small btn-secondary"));
      head.appendChild(ha); th.appendChild(head);
      var bub = h("div", "bubbles"); bub.id = "bubbles";
      if (!msgs.length) bub.appendChild(h("p", "muted", "Aucun message pour l'instant : écris le premier."));
      msgs.forEach(function (m) {
        var b = h("div", "bubble " + (m.fromId === u.id ? "me" : "them"), m.text);
        b.appendChild(h("small", null, new Date(m.date).toLocaleString(T.locale()) + (m.fromId === u.id ? (m.read ? " · lu" : " · envoyé") : "")));
        bub.appendChild(b);
      });
      th.appendChild(bub);
      var comp = h("div", "composer");
      var text = area("", 2); text.id = "composer-text"; text.setAttribute("placeholder", "Écris ton message… (Entrée pour envoyer)"); text.setAttribute("maxlength", "2000");
      var send = function () {
        var v = text.value.trim();
        if (!v) { toast("Message vide.", false); return; }
        db().messages.unshift({ id: DB.uid("m"), fromId: u.id, toId: other.id, text: v, date: new Date().toISOString(), read: false });
        var ai = other.archivedThreads && other.archivedThreads.indexOf(u.id); if (ai >= 0) other.archivedThreads.splice(ai, 1);
        var mi = u.archivedThreads.indexOf(other.id); if (mi >= 0) u.archivedThreads.splice(mi, 1);
        DB.notify(other.id, "Nouveau message de " + u.name); DB.log("Message privé : " + u.name + " → " + other.name, u.name); save(); render();
      };
      text.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } });
      comp.appendChild(text); comp.appendChild(btn("Envoyer", send));
      th.appendChild(comp);
      setTimeout(function () { var b2 = document.getElementById("bubbles"); if (b2) b2.scrollTop = b2.scrollHeight; var t2 = document.getElementById("composer-text"); if (t2) t2.focus({ preventScroll: true }); }, 0);
    }
    wrap.appendChild(th);
    root.appendChild(wrap);
  };

  VIEWS.calendar = function (root) {
    var u = me();
    root.appendChild(h("h1", null, T.t("nav_calendar")));
    if (isAdminLike(u)) {
      var evForm = h("div", "card"); evForm.appendChild(h("h2", null, "Calendrier académique — ajouter un événement"));
      var et = sel([{ value: "ferie", label: "Jour férié" }, { value: "echeance", label: "Échéance officielle" }, { value: "reunion", label: "Réunion" }]);
      var eti = inp("text", "", { placeholder: "Intitulé" }); var ed = inp("date", "");
      evForm.appendChild(field("Type", et)); evForm.appendChild(field("Intitulé", eti)); evForm.appendChild(field("Date", ed));
      evForm.appendChild(btn("Ajouter au calendrier académique", function () {
        if (!eti.value.trim() || !ed.value) { toast("Intitulé et date obligatoires.", false); return; }
        db().events = db().events || []; db().events.unshift({ id: DB.uid("ev"), type: et.value, title: eti.value.trim(), date: ed.value, by: u.name });
        db().users.forEach(function (x) { if (x.id !== u.id) DB.notify(x.id, "Calendrier académique : " + eti.value.trim() + " le " + ed.value); });
        DB.log("Événement académique ajouté : " + eti.value.trim(), u.name); save(); render();
      }));
      root.appendChild(evForm);
    }
    (db().events || []).forEach(function (e) { eventsExtra(e); });
    function eventsExtra(e) { var c = h("div", "item"); c.appendChild(h("p", null, e.date + " — " + (e.type === "ferie" ? "Jour férié" : e.type === "echeance" ? "Échéance" : "Réunion") + " : " + e.title)); root.appendChild(c); }
    var events = [];
    db().offers.filter(function (o) { return o.status === "publiee"; }).forEach(function (o) { events.push({ d: o.deadline, label: "Date limite offre : " + o.title }); });
    db().applications.forEach(function (a) { if (a.interview && (isAdminLike(u) || a.studentId === u.id || a.companyId === u.id)) events.push({ d: a.interview.slice(0, 10), label: "Entretien : " + user(a.studentId).name + " — " + ((offer(a.offerId) || {}).title || "") }); });
    db().soutenances.forEach(function (s) { events.push({ d: s.when.slice(0, 10), label: "Soutenance : " + s.when.replace("T", " à ") + " " + (s.room || "") }); });
    db().conventions.forEach(function (c) { if (isAdminLike(u) || c.studentId === u.id || c.companyId === u.id) { events.push({ d: c.start, label: "Début de stage : " + c.subject }); events.push({ d: c.end, label: "Fin de stage : " + c.subject }); } });
    events.sort(function (a, b) { return a.d < b.d ? -1 : 1; });
    if (!events.length) root.appendChild(h("p", "muted", "Aucune échéance."));
    events.forEach(function (e) { var c = h("div", "item"); c.appendChild(h("p", null, e.d + " — " + e.label)); root.appendChild(c); });
  };

  VIEWS.annonces = function (root) {
    var u = me();
    root.appendChild(h("h1", null, T.t("nav_annonces")));
    if (isAdminLike(u)) {
      var form = h("div", "card"); form.appendChild(h("h2", null, "Publier une annonce de l'université"));
      var title = inp("text"), text = area("", 3);
      form.appendChild(field("Titre", title)); form.appendChild(field("Texte", text));
      form.appendChild(btn("Publier", function () { if (!title.value.trim() || !text.value.trim()) { toast("Titre et texte obligatoires.", false); return; } db().announcements.unshift({ id: DB.uid("an"), title: title.value.trim(), text: text.value.trim(), date: DB.today(), by: u.name }); db().users.forEach(function (x) { if (x.id !== u.id) DB.notify(x.id, "Annonce : " + title.value.trim()); }); DB.log("Annonce publiée : " + title.value.trim(), u.name); save(); render(); }));
      root.appendChild(form);
    }
    db().announcements.forEach(function (a) { var c = h("div", "card"); c.appendChild(h("h2", null, a.title)); c.appendChild(h("p", null, a.text)); c.appendChild(h("p", "muted", a.date + " · " + a.by)); root.appendChild(c); });
  };

  /* ----- 1 & 9. Utilisateurs / Administration ----- */
  /* ----- Recherche globale (EF-3.1/3.2) ----- */
  VIEWS.recherche = function (root) {
    var u = me();
    root.appendChild(h("h1", null, "Recherche globale"));
    var q = inp("search", state.searchQ || "", { placeholder: "Offre, entreprise, étudiant, stage, document, message…" });
    root.appendChild(field("Mot-clé", q));
    root.appendChild(btn("Rechercher", function () { state.searchQ = q.value.trim(); render(); }));
    var term = (state.searchQ || "").toLowerCase();
    if (!term) { root.appendChild(h("p", "muted", "Saisis un mot-clé : la recherche couvre les offres, les utilisateurs, les entreprises, les stages, les documents et tes messages, selon tes droits.")); return; }
    function hit(txt) { return String(txt || "").toLowerCase().indexOf(term) >= 0; }
    var found = 0;
    var offs = db().offers.filter(function (o) { return (o.status === "publiee" || isAdminLike(u) || sameCompany(u, o)) && (hit(o.title) || hit(o.company) || hit(o.domain) || hit(o.city)); });
    if (offs.length) { root.appendChild(h("h2", null, "Offres")); offs.forEach(function (o) { found++; var c = h("div", "item"); c.appendChild(h("p", null, o.title + " — " + o.company)); c.appendChild(btn("Détail", function () { state.offerId = o.id; go("offerDetail"); }, "btn-small btn-secondary")); root.appendChild(c); }); }
    if (isAdminLike(u) || u.role === "encadrant" || u.role === "admin_entreprise") {
      var us = db().users.filter(function (x) { return hit(x.name) || hit(x.email) || hit(x.numero); });
      if (us.length) { root.appendChild(h("h2", null, "Utilisateurs et entreprises")); us.forEach(function (x) { found++; root.appendChild(h("p", "muted", x.name + " · " + T.roleLabel(x.role) + " · " + x.email + (x.numero ? " · N° " + x.numero : ""))); }); }
    }
    var sts = visibleStages(u).filter(function (st) { return hit(st.subject) || hit(user(st.studentId).name); });
    if (sts.length) { root.appendChild(h("h2", null, "Stages")); sts.forEach(function (st) { found++; root.appendChild(h("p", "muted", st.subject + " · " + user(st.studentId).name + " · " + T.statusLabel(st.status))); }); }
    var docs = (db().reports || []).filter(function (r) { return hit(r.fileName) && (isAdminLike(u) || r.studentId === u.id || (myStages().some(function (a) { return a.id === r.appId; }))); });
    if (docs.length) { root.appendChild(h("h2", null, "Documents")); docs.forEach(function (r) { found++; root.appendChild(h("p", "muted", r.fileName + " v" + r.version + " · " + user(r.studentId).name)); }); }
    var ms = db().messages.filter(function (m) { return (m.fromId === u.id || m.toId === u.id) && hit(m.text); });
    if (ms.length) { root.appendChild(h("h2", null, "Messages")); ms.forEach(function (m) { found++; root.appendChild(h("p", "muted", user(m.fromId).name + " : " + m.text)); }); }
    if (!found) root.appendChild(h("p", "muted", "Aucun résultat. Essaie un autre mot-clé."));
  };

  /* ----- Aide en ligne (EF-5.4 / NF-4.5) ----- */
  VIEWS.aide = function (root) {
    var u = me();
    root.appendChild(h("h1", null, "Aide"));
    var sections = [
      ["Parcours d'un stage (10 phases)", "Comptes et accès → publication des offres (relecture par l'admin entreprise) → candidature → examen et entretien → acceptation → confirmation de l'étudiant sous 7 jours → approbation par l'encadrant universitaire (stage officiel créé) → convention (étudiant, entreprise, administration) → organisation et présence quotidienne → évaluation → soutenance et clôture."],
      ["Étudiant", "Inscris-toi avec ton numéro universitaire (liste officielle). Cherche une offre, postule (CV PDF/DOCX/JPG/PNG, 10 Mo max), suis le statut, confirme sous 7 jours après acceptation, valide ta convention, pointe ta présence chaque jour, justifie une absence sous 72 h, dépose tes rapports et consulte ta note après clôture."],
      ["Entreprise", "Rédige une offre en 3 étapes (stepper), elle part en brouillon puis en relecture chez ton admin entreprise. Examine les candidatures, demande des pièces, planifie les entretiens (présentiel ou visio), accepte dans la limite des places, organise le stage (horaire, jours, programme), évalue avec la grille de 5 critères."],
      ["Admin entreprise", "Relis les offres de ton entreprise (publier ou renvoyer en brouillon avec commentaire), crée les comptes de tes employés, supervise offres et stages de ton entreprise."],
      ["Encadrant universitaire", "Après la confirmation de l'étudiant et l'affectation par l'administration, approuve ou rejette le dossier (le stage officiel est alors créé), définis ton programme de suivi, relis les rapports (Accepter / À corriger / Refuser), déclare le dossier prêt pour la soutenance quand le rapport final est approuvé et l'évaluation entreprise reçue."],
      ["Admin université", "Importe la liste officielle des étudiants, crée les comptes (encadrants, entreprises), affecte les encadrants, gère le calendrier académique (jours fériés), valide les conventions en dernier, planifie les soutenances (jury, sans conflit), enregistre les procès-verbaux et clôture les dossiers."],
      ["Sécurité", "Mots de passe : 8 caractères minimum avec une lettre et un chiffre. 5 échecs de connexion bloquent l'accès 15 minutes. La session expire après 30 minutes d'inactivité et tes brouillons sont restaurés à la reconnexion. Lien de réinitialisation valable 1 heure."]
    ];
    sections.forEach(function (sec) { var c = h("div", "card"); c.appendChild(h("h2", null, sec[0])); c.appendChild(h("p", null, sec[1])); root.appendChild(c); });
    root.appendChild(h("p", "muted", "StageFlow — conforme au cahier des charges v1.1 (IEEE/ANSI 830). Rôle connecté : " + T.roleLabel(u.role) + "."));
  };

  VIEWS.users = function (root) {
    var u = me();
    root.appendChild(h("h1", null, T.t("nav_users") + (u.role === "admin_entreprise" ? " — équipe de mon entreprise" : " — rôles et permissions")));

    /* Import de la liste officielle des étudiants (EF-27.1) — administration universitaire */
    if (isAdminLike(u)) {
      var imp = h("div", "card"); imp.appendChild(h("h2", null, "Importer la liste officielle des étudiants"));
      imp.appendChild(h("p", "muted", (db().officialStudents || []).length + " étudiant(s) dans la liste officielle. Format CSV (point-virgule) : numero;nom;filiere;niveau;promotion — un par ligne. L'inscription d'un étudiant exige un numéro présent dans cette liste (RG-11)."));
      var csv = area("", 4); csv.setAttribute("placeholder", "E-1005;Nom Prénom;Licence Informatique;2;2027");
      var fileImp = inp("file"); fileImp.setAttribute("accept", ".csv,.txt");
      imp.appendChild(field("Coller le CSV", csv)); imp.appendChild(field("…ou choisir un fichier CSV", fileImp));
      imp.appendChild(btn("Modèle d'import (CSV)", function () { download("modele-liste-etudiants.csv", "numero;nom;filiere;niveau;promotion\r\nE-1005;Nom Prénom;Licence Informatique;2;2027", "text/csv;charset=utf-8"); }, "btn-secondary"));
      imp.appendChild(btn("Importer", function () {
        var doImport = function (text) {
          var added = 0;
          text.split(/\r?\n/).forEach(function (line) {
            var parts = line.split(";").map(function (x) { return x.trim(); });
            if (parts.length < 2 || !parts[0] || parts[0].toLowerCase() === "numero") return;
            if ((db().officialStudents || []).some(function (o) { return o.numero.toUpperCase() === parts[0].toUpperCase(); })) return;
            db().officialStudents.push({ numero: parts[0], name: parts[1], filiere: parts[2] || "", niveau: parts[3] || "", promo: parts[4] || "" }); added++;
          });
          DB.log("Liste officielle importée : +" + added + " étudiant(s)", u.name); save(); toast(added + " étudiant(s) ajouté(s) à la liste officielle."); render();
        };
        if (fileImp.files && fileImp.files[0]) { var rd = new FileReader(); rd.addEventListener("load", function () { doImport(String(rd.result)); }); rd.readAsText(fileImp.files[0]); }
        else if (csv.value.trim()) doImport(csv.value);
        else toast("Colle un CSV ou choisis un fichier.", false);
      }));
      (db().officialStudents || []).slice(0, 12).forEach(function (o) { imp.appendChild(h("p", "muted", o.numero + " · " + o.name + " · " + o.filiere + " · niveau " + o.niveau + " · promo " + o.promo)); });
      root.appendChild(imp);
      /* Structure : départements / spécialités / promotions (EF-27.3) */
      var struct = h("div", "card"); struct.appendChild(h("h2", null, "Structure de l'université"));
      struct.appendChild(h("p", "muted", "Filières présentes dans la liste officielle : " + Array.from(new Set((db().officialStudents || []).map(function (o) { return o.filiere; }))).join(" · ") + " · Promotions : " + Array.from(new Set((db().officialStudents || []).map(function (o) { return o.promo; }))).join(" · ")));
      root.appendChild(struct);
    }

    /* Création de comptes (EF-1.5, EF-21.1) */
    var form = h("div", "card"); form.appendChild(h("h2", null, u.role === "admin_entreprise" ? "Créer un compte employé (mon entreprise)" : "Créer un compte (encadrant, université, entreprise, admin entreprise)"));
    var roleOptions = u.role === "admin_entreprise"
      ? [{ value: "entreprise", label: "Entreprise (encadrant professionnel)" }]
      : [{ value: "encadrant", label: "Encadrant universitaire" }, { value: "universite", label: "Admin université" }, { value: "entreprise", label: "Entreprise (encadrant professionnel)" }, { value: "admin_entreprise", label: "Admin entreprise" }, { value: "admin", label: "Administrateur" }];
    var role = sel(roleOptions);
    var name = inp("text"), email = inp("email"), pass = inp("password"), extra = inp("text");
    var company = inp("text", u.role === "admin_entreprise" ? (u.company || "") : "", { placeholder: "Nom de l'entreprise (pour entreprise / admin entreprise)" });
    [field("Rôle", role), field("Nom", name), field("Email", email), field("Mot de passe (8+, lettre + chiffre)", pass), field("Département / info", extra), field("Entreprise", company)].forEach(function (x) { form.appendChild(x); });
    form.appendChild(btn("Créer", function () {
      if (!name.value.trim() || !email.value.trim() || !validPassword(pass.value)) { toast("Nom, email et mot de passe valides obligatoires (8 caractères, une lettre et un chiffre).", false); return; }
      if ((role.value === "entreprise" || role.value === "admin_entreprise") && !company.value.trim()) { toast("Le nom de l'entreprise est obligatoire pour ce rôle.", false); return; }
      if (db().users.some(function (x) { return x.email === email.value.trim().toLowerCase(); })) { toast("Email déjà utilisé.", false); return; }
      DB.hash(pass.value).then(function (hp) {
        db().users.push({ id: DB.uid("u"), role: role.value, name: name.value.trim(), email: email.value.trim().toLowerCase(), pass: hp, extra: extra.value, company: (role.value === "entreprise" || role.value === "admin_entreprise") ? company.value.trim() : undefined, active: true, favorites: [] });
        DB.log("Compte créé : " + role.value + " / " + email.value, u.name); save(); toast("Compte créé."); render();
      });
    }));
    root.appendChild(form);

    var listUsers = db().users.filter(function (x) {
      if (u.role === "admin_entreprise") return x.id === u.id || (x.company && x.company === u.company);
      return true;
    });
    listUsers.forEach(function (x) {
      var c = h("div", "item");
      c.appendChild(h("p", null, x.name + " — " + T.roleLabel(x.role) + " · " + x.email + (x.numero ? " · N° " + x.numero : "") + (x.company ? " · " + x.company : "") + " · " + (x.extra || "")));
      c.appendChild(x.active ? tag("actif") : x.pendingApproval && !x.pendingConfirm ? tag("en attente de validation", "warn") : x.pendingConfirm ? tag("email non confirmé", "warn") : tag("désactivé", "err"));
      if (!x.active && x.pendingApproval && !x.pendingConfirm && x.id !== u.id && (isAdminLike(u) || (u.role === "admin_entreprise" && x.company && x.company === u.company))) {
        var ap = h("div", "actions");
        ap.appendChild(btn("Approuver le compte", function () { x.active = true; x.pendingApproval = false; DB.log("Compte approuvé : " + x.email, u.name); toast("Compte approuvé : " + x.name); save(); render(); }));
        ap.appendChild(btn("Refuser et supprimer", function () { if (confirm("Refuser et supprimer cette demande de compte ?")) { db().users = db().users.filter(function (y) { return y.id !== x.id; }); DB.log("Demande de compte refusée : " + x.email, u.name); save(); render(); } }, "btn-danger"));
        c.appendChild(ap);
      }
      if (x.id !== u.id && isAdminLike(u)) {
        var acts = h("div", "actions");
        acts.appendChild(btn(x.active ? "Désactiver" : "Activer", function () { x.active = !x.active; DB.log("Compte " + (x.active ? "activé" : "désactivé") + " : " + x.email, u.name); save(); render(); }, "btn-secondary"));
        var roleSel = sel(["etudiant", "entreprise", "admin_entreprise", "encadrant", "universite", "admin"], x.role);
        acts.appendChild(field("Changer le rôle", roleSel));
        acts.appendChild(btn("Appliquer le rôle", function () { x.role = roleSel.value; DB.log("Rôle de " + x.email + " → " + x.role, u.name); save(); render(); }, "btn-secondary"));
        c.appendChild(acts);
      }
      root.appendChild(c);
    });
  };

  VIEWS.admin = function (root) {
    var u = me();
    root.appendChild(h("h1", null, T.t("nav_admin") + " — statistiques"));
    var totalApps = db().applications.length;
    var acc = db().applications.filter(function (a) { return a.status === "acceptee"; }).length;
    var rate = totalApps ? Math.round(acc / totalApps * 100) : 0;
    var stats = h("div", "stat-grid");
    [["Stages (candidatures acceptées)", acc], ["Offres publiées", db().offers.filter(function (o) { return o.status === "publiee"; }).length],
     ["Offres en attente de validation", db().offers.filter(function (o) { return o.status === "en_attente"; }).length],
     ["Taux d'acceptation", rate + " %"], ["Utilisateurs", db().users.length],
     ["Entreprises partenaires", db().users.filter(function (x) { return x.role === "entreprise" && x.partner; }).length],
     ["Conventions validées", db().conventions.filter(function (c) { return c.status === "validee"; }).length],
     ["Délai moyen de traitement (démo)", "3 jours"]
    ].forEach(function (s) { var d = h("div", "stat"); d.appendChild(h("b", null, String(s[1]))); d.appendChild(h("span", null, s[0])); stats.appendChild(d); });
    root.appendChild(stats);
    root.appendChild(h("h2", null, "Entreprises partenaires"));
    db().users.filter(function (x) { return x.role === "entreprise"; }).forEach(function (x) {
      var c = h("div", "item"); c.appendChild(h("p", null, x.name + " · " + x.email + " · " + (x.extra || "")));
      c.appendChild(x.partner ? tag("partenaire") : tag("non partenaire", "warn"));
      c.appendChild(btn(x.partner ? "Retirer le partenariat" : "Marquer partenaire", function () { x.partner = !x.partner; DB.log("Partenariat " + x.name + " → " + x.partner, u.name); save(); render(); }, "btn-small btn-secondary"));
      root.appendChild(c);
    });
    root.appendChild(h("h2", null, "Critères de succès du CDC (mesurés 6 mois après la mise en service)"));
    var convsDone = db().conventions.filter(function (c) { return c.status === "validee" && c.createdAt && c.validatedAt; });
    var avgH = convsDone.length ? Math.round(convsDone.reduce(function (sum, c) { return sum + (new Date(c.validatedAt) - new Date(c.createdAt)) / 3600000; }, 0) / convsDone.length) : 0;
    var att = db().attendance || [];
    var presRate = att.length ? Math.round(att.filter(function (r) { return ["present", "retard", "excusee"].indexOf(r.status) >= 0; }).length / att.length * 100) : 0;
    var crit = h("div", "stat-grid");
    [["Validation d'une convention (cible : moins de 48 h)", convsDone.length ? avgH + " h en moyenne" : "aucune convention validée"],
     ["Candidatures suivies dans la plateforme (cible : 100 %)", "100 %"],
     ["Présences enregistrées (cible : au moins 95 %)", presRate + " %"],
     ["Génération du PDF (cible : moins de 5 s)", "côté client, instantané (démo)"]
    ].forEach(function (x2) { var d2 = h("div", "stat"); d2.appendChild(h("b", null, String(x2[1]))); d2.appendChild(h("span", null, x2[0])); crit.appendChild(d2); });
    root.appendChild(crit);
    var acts = h("div", "actions");
    acts.appendChild(btn("Exporter le rapport (PDF)", function () {
      pdfDoc("Rapport d'administration — Gestion des Stages", ["Stages acceptés : " + acc, "Candidatures totales : " + totalApps, "Taux d'acceptation : " + rate + " %", "Offres publiées : " + db().offers.filter(function (o) { return o.status === "publiee"; }).length, "Conventions validées : " + db().conventions.filter(function (c) { return c.status === "validee"; }).length, "Rapports déposés : " + db().reports.length, "Utilisateurs : " + db().users.length], "rapport-admin.pdf");
    }));
    acts.appendChild(btn("Exporter (Excel/CSV)", function () {
      var rows = [["Type", "Titre/Nom", "Statut", "Date"]];
      db().offers.forEach(function (o) { rows.push(["Offre", o.title, o.status, o.created]); });
      db().applications.forEach(function (a) { rows.push(["Candidature", user(a.studentId).name, a.status, a.created]); });
      db().conventions.forEach(function (c) { rows.push(["Convention", c.subject, c.status, c.created]); });
      var csv = "\uFEFF" + rows.map(function (r) { return r.map(function (x) { return '"' + String(x).replace(/"/g, '""') + '"'; }).join(";"); }).join("\r\n");
      download("export-stages.csv", csv, "text/csv;charset=utf-8");
      DB.log("Export CSV par admin", u.name); save();
    }, "btn-secondary"));
    root.appendChild(acts);
    root.appendChild(h("h2", null, "Base de données locale SQLite"));
    var sqlCard = h("div", "item");
    sqlCard.appendChild(h("p", null, "Base SQLite locale (sql.js / SQLite WASM, fichier stages.db) : " + (window.GSSQL ? window.GSSQL.statusText() : "—")));
    sqlCard.appendChild(h("p", "muted", "Tables : users, offers, applications, conventions, reports (+ table records complète). La base est régénérée à chaque sauvegarde et conservée dans ce navigateur."));
    if (window.GSSQL && window.GSSQL.ready()) {
      var counts = window.GSSQL.counts(db());
      sqlCard.appendChild(h("p", null, "Requête SQL (SELECT COUNT) — users : " + counts.users + " · offers : " + counts.offers + " · applications : " + counts.applications + " · conventions : " + counts.conventions + " · reports : " + counts.reports + " · stages : " + (counts.stages || 0) + " · attendance : " + (counts.attendance || 0)));
    }
    sqlCard.appendChild(btn("Exporter la base SQLite (.db)", function () {
      var bytes = window.GSSQL ? window.GSSQL.exportBytes(db()) : null;
      if (!bytes) { toast("Base SQLite non disponible (WASM non chargé).", false); return; }
      var a2 = document.createElement("a"); a2.href = URL.createObjectURL(new Blob([bytes], { type: "application/x-sqlite3" })); a2.download = "stages.db"; a2.click(); setTimeout(function () { URL.revokeObjectURL(a2.href); }, 2000);
      DB.log("Base SQLite exportée (stages.db)", u.name); save();
    }, "btn-secondary"));
    root.appendChild(sqlCard);
    root.appendChild(h("h2", null, "Journal d'activité (logs)"));
    db().logs.slice(0, 40).forEach(function (l) { root.appendChild(h("p", "muted", new Date(l.date).toLocaleString(T.locale()) + " · " + l.by + " · " + l.action)); });
  };

  /* ----- 1. Profil ----- */
  VIEWS.profile = function (root) {
    var u = me();
    root.appendChild(h("h1", null, T.t("nav_profile")));
    var name = inp("text", u.name), extra = inp("text", u.extra || "");
    root.appendChild(field("Nom", name)); root.appendChild(field("Filière / Secteur / Département", extra));
    root.appendChild(h("p", "muted", "Email : " + u.email + " · Rôle : " + T.roleLabel(u.role)));
    root.appendChild(btn("Enregistrer le profil", function () { u.name = name.value.trim() || u.name; u.extra = extra.value; DB.log("Profil modifié : " + u.email, u.name); save(); toast("Profil enregistré."); render(); }));
    root.appendChild(h("h2", null, "Changer le mot de passe"));
    var np = inp("password");
    root.appendChild(field("Nouveau mot de passe (8+, lettre + chiffre)", np));
    root.appendChild(btn("Changer", function () { if (!validPassword(np.value)) { toast("8 caractères minimum, avec une lettre et un chiffre.", false); return; } DB.hash(np.value).then(function (hp) { u.pass = hp; DB.log("Mot de passe changé : " + u.email, u.name); save(); toast("Mot de passe changé."); }); }, "btn-secondary"));
    root.appendChild(h("h2", null, "Préférences de notification email"));
    root.appendChild(h("p", "muted", "Les notifications dans la plateforme restent toujours actives. Choisis, par type d'événement, de recevoir ou non l'email (EF-4.3)."));
    u.emailPrefs = u.emailPrefs || { statut: true, entretien: true, message: true, echeance: true };
    [["statut", "Changements de statut"], ["entretien", "Entretiens et rendez-vous"], ["message", "Nouveaux messages"], ["echeance", "Échéances"]].forEach(function (pr) {
      var lab = h("label", "option");
      var cb = document.createElement("input"); cb.type = "checkbox"; cb.checked = !!u.emailPrefs[pr[0]];
      cb.addEventListener("change", function () { u.emailPrefs[pr[0]] = cb.checked; save(); toast("Préférence enregistrée."); });
      lab.appendChild(cb); lab.appendChild(h("span", null, pr[1] + " — recevoir l'email"));
      root.appendChild(lab);
    });
    if (u.role === "etudiant") {
      root.appendChild(h("h2", null, "Mes offres favorites"));
      (u.favorites || []).forEach(function (id) { var o = offer(id); if (o) root.appendChild(offerCard(o)); });
      if (!(u.favorites || []).length) root.appendChild(h("p", "muted", "Aucun favori. Utilise ☆ Favori sur une offre."));
    }
  };

  /* ---------- rendu principal ---------- */
  function render() {
    var u = me();
    document.getElementById("auth-view").hidden = !!u;
    document.getElementById("app-view").hidden = !u;
    document.getElementById("btn-logout").hidden = !u;
    document.getElementById("btn-cdc").hidden = !u;
    document.getElementById("btn-cdc").classList.toggle("active", !!u && state.view === "cdc");
    var chip = document.getElementById("user-chip");
    chip.hidden = !u; if (u) chip.textContent = u.name + " · " + T.roleLabel(u.role);
    if (!u) {
      view.textContent = ""; document.getElementById("side-nav").textContent = ""; document.getElementById("modal").hidden = true;
      T.translateDOM(document.getElementById("auth-view")); heroCounters();
      return;
    }
    DB.refreshOfferExpiry();
    db().applications.forEach(function (a) {
      if (a.status === "acceptee" && a.acceptedAt) {
        var dl = new Date(a.acceptedAt); dl.setDate(dl.getDate() + 7);
        if (dl.toISOString().slice(0, 10) < DB.today()) {
          a.status = "expiree"; a.history.push({ s: "expiree", d: DB.today(), by: "système (RG-4)" });
          DB.notify(a.studentId, "Confirmation expirée (7 jours dépassés) : la place est libérée.");
          DB.log("Candidature expirée (RG-4) : " + user(a.studentId).name, "système");
        }
      }
    });
    renderNav();
    view.textContent = "";
    var card = h("section", "card");
    (VIEWS[state.view] || VIEWS.dashboard)(card);
    view.appendChild(card);
    T.translateDOM(view);
  }
  window.GSApp = { render: render };

  /* ---------- authentification ---------- */
  function validPassword(pw) { return typeof pw === "string" && pw.length >= 8 && /[A-Za-zÀ-ÿ]/.test(pw) && /\d/.test(pw); }
  function attempts() { try { return JSON.parse(localStorage.getItem("gs_attempts") || "{}"); } catch (e) { return {}; } }
  function recordFail(key) {
    var all = attempts(); var rec = all[key] || { count: 0, lockUntil: 0 };
    rec.count++; if (rec.count >= 5) { rec.lockUntil = Date.now() + 15 * 60 * 1000; rec.count = 0; }
    all[key] = rec; localStorage.setItem("gs_attempts", JSON.stringify(all)); return rec;
  }
  function clearFails(key) { var all = attempts(); delete all[key]; localStorage.setItem("gs_attempts", JSON.stringify(all)); }
  function authMsg(text, isError) { var m = document.getElementById("auth-msg"); m.textContent = text || ""; m.hidden = !text; m.className = isError ? "error" : "ok"; if (text) T.translateDOM(m); }
  function emptyPrefs() { return { statut: true, entretien: true, message: true, echeance: true }; }

  function showAuthTab(name) {
    ["login", "register", "reset"].forEach(function (k) { document.getElementById("form-" + k).hidden = k !== name; });
    document.querySelectorAll("[data-authtab]").forEach(function (b) { var on = b.getAttribute("data-authtab") === name; b.classList.toggle("on", on); b.setAttribute("aria-selected", String(on)); });
    authMsg("");
  }
  document.querySelectorAll("[data-authtab]").forEach(function (b) { b.addEventListener("click", function () { showAuthTab(b.getAttribute("data-authtab")); }); });

  /* choix du type de compte (étudiant / entreprise / université) */
  var regRole = "etudiant";
  var ROLE_CFG = {
    etudiant: { name: "Nom complet", extra: "Filière", hint: "Réservé aux étudiants figurant dans la liste officielle importée par l'université. Démo : numéro E-1003 (Sara Mansour)." },
    entreprise: { name: "Nom du responsable", extra: "Secteur d'activité", hint: "Après confirmation de ton email, ton espace entreprise est actif et tu peux publier des offres. Une raison sociale déjà inscrite est rattachée après validation." },
    universite: { name: "Nom complet", extra: "Service / département", hint: "Pour des raisons de sécurité, un compte université est activé après validation par un administrateur existant." }
  };
  function setRegRole(r) {
    regRole = ROLE_CFG[r] ? r : "etudiant";
    var form = document.getElementById("form-register");
    form.querySelectorAll(".role-opt").forEach(function (b) { var on = b.getAttribute("data-role") === regRole; b.classList.toggle("on", on); b.setAttribute("aria-checked", String(on)); });
    form.querySelectorAll("[data-for]").forEach(function (d) { d.hidden = d.getAttribute("data-for") !== regRole; });
    document.getElementById("lbl-reg-name").textContent = ROLE_CFG[regRole].name;
    document.getElementById("lbl-reg-extra").textContent = ROLE_CFG[regRole].extra;
    document.getElementById("reg-hint").textContent = ROLE_CFG[regRole].hint;
    var old = document.getElementById("btn-confirm-email"); if (old) old.remove();
    authMsg("");
    T.translateDOM(form);
  }
  document.querySelectorAll(".role-opt").forEach(function (b) { b.addEventListener("click", function () { setRegRole(b.getAttribute("data-role")); }); });
  document.querySelectorAll("[data-pick-btn]").forEach(function (b) {
    b.addEventListener("click", function () { showAuthTab("register"); setRegRole(b.getAttribute("data-pick-btn")); window.scrollTo({ top: 0, behavior: "smooth" }); });
  });
  setRegRole("etudiant");

  /* afficher / masquer le mot de passe, comptes démo, force du mot de passe */
  document.querySelectorAll(".pw-toggle").forEach(function (b) {
    b.addEventListener("click", function () { var i = document.getElementById(b.getAttribute("data-toggle")); var show = i.type === "password"; i.type = show ? "text" : "password"; b.setAttribute("aria-pressed", String(show)); });
  });
  document.querySelectorAll("[data-demo]").forEach(function (b) {
    b.addEventListener("click", function () { var p = b.getAttribute("data-demo").split("|"); document.getElementById("login-email").value = p[0]; document.getElementById("login-pass").value = p[1]; authMsg(""); document.getElementById("login-pass").focus(); });
  });
  document.getElementById("reg-pass").addEventListener("input", function (e) {
    var v = e.target.value, s = 0;
    if (v.length >= 8) s++; if (/[A-Za-zÀ-ÿ]/.test(v) && /\d/.test(v)) s++; if (v.length >= 12 || /[^A-Za-z0-9]/.test(v)) s++;
    var m = document.getElementById("pw-meter"); m.style.width = (v ? [20, 45, 75, 100][s] : 0) + "%"; m.style.background = s <= 1 ? "#B3261E" : s === 2 ? "#E65100" : "#2E6B3F";
  });

  document.getElementById("form-login").addEventListener("submit", function (e) {
    e.preventDefault();
    var ident = document.getElementById("login-email").value.trim();
    var pw = document.getElementById("login-pass").value;
    if (!ident || !pw) { authMsg("Saisis ton identifiant et ton mot de passe.", true); return; }
    var key = ident.toLowerCase();
    var rec = attempts()[key];
    if (rec && rec.lockUntil > Date.now()) { authMsg("Connexion bloquée 15 minutes après 5 échecs (EF-1.10). Réessaie à " + new Date(rec.lockUntil).toLocaleTimeString(T.locale()) + ".", true); return; }
    DB.hash(pw).then(function (hp) {
      var u = db().users.find(function (x) { return x.email.toLowerCase() === key || (x.numero && x.numero.toLowerCase() === key); });
      if (!u || u.pass !== hp) { var r = recordFail(key); authMsg(r.lockUntil > Date.now() ? "5 échecs consécutifs : connexion bloquée pendant 15 minutes." : "Identifiant ou mot de passe incorrect.", true); DB.log("Échec de connexion : " + ident, "système"); save(); return; }
      if (!u.active) { authMsg(u.pendingApproval && !u.pendingConfirm ? "Compte en attente de validation par l'administration : tu pourras te connecter dès qu'il sera approuvé." : u.pendingConfirm ? "Compte créé mais email non confirmé : clique le lien de confirmation reçu par email (démo : voir l'inscription)." : "Compte suspendu par l'administration.", true); return; }
      clearFails(key);
      state.userId = u.id; sessionStorage.setItem("gs_user", u.id); lastActivity = Date.now();
      document.getElementById("form-login").reset(); state.thread = null; state.offerStep = 0;
      DB.log("Connexion : " + u.email, u.name); save(); authMsg(""); state.view = "dashboard"; render(); window.scrollTo(0, 0);
    });
  });

  document.getElementById("form-register").addEventListener("submit", function (e) {
    e.preventDefault();
    var role = regRole;
    var numero = document.getElementById("reg-numero").value.trim().toUpperCase();
    var company = document.getElementById("reg-company").value.trim();
    var name = document.getElementById("reg-name").value.trim();
    var email = document.getElementById("reg-email").value.trim().toLowerCase();
    var extra = document.getElementById("reg-extra").value.trim();
    var pw = document.getElementById("reg-pass").value;
    var official = null;
    if (role === "etudiant") {
      if (!numero) { authMsg("Le numéro universitaire est obligatoire pour un compte étudiant.", true); return; }
      official = (db().officialStudents || []).find(function (o) { return o.numero.toUpperCase() === numero; });
      if (!official) { authMsg("Inscription refusée : le numéro universitaire « " + numero + " » ne figure pas dans la liste officielle (EN-7).", true); return; }
      if (db().users.some(function (x) { return x.numero && x.numero.toUpperCase() === numero; })) { authMsg("Inscription refusée : un compte existe déjà pour ce numéro universitaire.", true); return; }
    }
    if (role === "entreprise" && !company) { authMsg("La raison sociale de l'entreprise est obligatoire.", true); return; }
    if (role !== "etudiant" && !name) { authMsg("Le nom complet est obligatoire.", true); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { authMsg("Saisis une adresse email valide.", true); return; }
    if (db().users.some(function (x) { return x.email.toLowerCase() === email; })) { authMsg("Un compte existe déjà avec cet email.", true); return; }
    if (!validPassword(pw)) { authMsg("Mot de passe : 8 caractères minimum, avec au moins une lettre et un chiffre (EF-1.6).", true); return; }
    DB.hash(pw).then(function (hp) {
      var u;
      if (role === "etudiant") {
        u = { id: DB.uid("u"), role: "etudiant", numero: numero, name: name || official.name, email: email, pass: hp, extra: extra || (official.filiere + " · " + official.niveau), active: false, pendingConfirm: true, favorites: [], emailPrefs: emptyPrefs() };
      } else if (role === "entreprise") {
        var exists = db().users.some(function (x) { return x.company && x.company.toLowerCase() === company.toLowerCase(); });
        var known = exists ? db().users.find(function (x) { return x.company && x.company.toLowerCase() === company.toLowerCase(); }).company : company;
        u = { id: DB.uid("u"), role: exists ? "entreprise" : "admin_entreprise", name: name, email: email, pass: hp, extra: extra || "Entreprise", company: known, active: false, pendingConfirm: true, pendingApproval: exists, partner: false, emailPrefs: emptyPrefs() };
      } else {
        u = { id: DB.uid("u"), role: "universite", name: name, email: email, pass: hp, extra: extra || "Administration universitaire", active: false, pendingConfirm: true, pendingApproval: true, emailPrefs: emptyPrefs() };
      }
      db().users.push(u);
      DB.log("Inscription " + role + " : " + (numero || company || email) + " / " + email, u.name);
      save();
      authMsg("Compte créé pour " + (official ? official.name : u.name) + ". Un lien de confirmation a été envoyé à " + email + " (EF-1.4). Démo sans serveur email : clique le bouton de confirmation ci-dessous pour simuler le clic sur le lien.");
      var form = document.getElementById("form-register");
      var old = document.getElementById("btn-confirm-email"); if (old) old.remove();
      var b = btn("Confirmer mon email (lien démo)", function () {
        u.pendingConfirm = false;
        DB.log("Email confirmé : " + u.email, u.name);
        if (u.pendingApproval) {
          DB.notifyAdmins("Nouveau compte à valider : " + u.name + " (" + T.roleLabel(u.role) + (u.company ? " · " + u.company : "") + ")");
          db().users.filter(function (x) { return x.role === "admin_entreprise" && u.company && x.company === u.company; }).forEach(function (x) { DB.notify(x.id, "Nouveau collaborateur à valider : " + u.name); });
          save(); b.remove(); document.getElementById("form-register").reset();
          showAuthTab("login");
          authMsg("Email confirmé. Ton compte est en attente de validation par l'administration : tu pourras te connecter dès qu'il sera approuvé.");
          return;
        }
        u.active = true; DB.notifyAdmins("Nouveau compte actif : " + u.name + " (" + T.roleLabel(u.role) + ")");
        state.userId = u.id; sessionStorage.setItem("gs_user", u.id); lastActivity = Date.now();
        save(); document.getElementById("form-register").reset(); state.view = "dashboard"; render(); window.scrollTo(0, 0);
      });
      b.id = "btn-confirm-email"; b.classList.add("btn-wide"); form.appendChild(b);
      T.translateDOM(form);
    });
  });

  document.getElementById("form-reset").addEventListener("submit", function (e) {
    e.preventDefault();
    var email = document.getElementById("reset-email").value.trim().toLowerCase();
    var token = document.getElementById("reset-token").value.trim().toUpperCase();
    var pw = document.getElementById("reset-pass").value;
    var u = db().users.find(function (x) { return x.email.toLowerCase() === email; });
    if (!u) { authMsg("Aucun compte avec cet email.", true); return; }
    db().resetTokens = db().resetTokens || [];
    if (!token) {
      var code = Math.random().toString(36).slice(2, 8).toUpperCase();
      db().resetTokens = db().resetTokens.filter(function (t) { return t.email !== email; });
      db().resetTokens.push({ email: email, token: code, expires: Date.now() + 60 * 60 * 1000 });
      DB.log("Lien de réinitialisation envoyé : " + email, u.name); save();
      authMsg("Lien de réinitialisation envoyé à " + email + ", valable 1 heure. Démo sans serveur email : ton code est « " + code + " ». Saisis-le ci-dessus avec ton nouveau mot de passe, puis reclique.");
      return;
    }
    var rec = db().resetTokens.find(function (t) { return t.email === email && t.token === token; });
    if (!rec) { authMsg("Code incorrect : demande un nouveau lien.", true); return; }
    if (rec.expires < Date.now()) { authMsg("Lien expiré (1 heure dépassée) : demande un nouveau lien.", true); return; }
    if (!validPassword(pw)) { authMsg("Mot de passe : 8 caractères minimum, avec au moins une lettre et un chiffre.", true); return; }
    DB.hash(pw).then(function (hp) {
      u.pass = hp;
      db().resetTokens = db().resetTokens.filter(function (t) { return t.email !== email; });
      DB.log("Mot de passe réinitialisé : " + email, u.name); save();
      document.getElementById("form-reset").reset(); showAuthTab("login");
      authMsg("Mot de passe réinitialisé. Tu peux te connecter.");
    });
  });

  /* Déconnexion : on vide TOUT l'espace connecté et on revient à la page de connexion. */
  function logout(msg) {
    var cur = me();
    if (cur) { DB.log("Déconnexion : " + cur.email, cur.name); save(); }
    state.userId = null; state.view = "dashboard"; state.thread = null; state.offerId = null; state.offerStep = 0; state.filter = {}; state.showArchived = false;
    sessionStorage.removeItem("gs_user"); sessionStorage.removeItem("gs_offer_draft");
    ["login-pass", "reg-pass", "reset-pass"].forEach(function (id) { var el = document.getElementById(id); if (el) el.value = ""; });
    render(); showAuthTab("login");
    if (msg) authMsg(msg);
    window.scrollTo(0, 0);
  }
  document.getElementById("btn-cdc").addEventListener("click", function () { go("cdc"); });
  document.getElementById("btn-logout").addEventListener("click", function () { logout("Tu as été déconnecté(e). À bientôt !"); });

  /* ---------- page d'accueil vivante : compteurs, mot qui tourne, apparition au scroll ---------- */
  function countUp(el, to) {
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !to) { el.textContent = String(to); return; }
    var t0 = performance.now(), dur = 900;
    (function f(t) { var p = Math.min(1, (t - t0) / dur); el.textContent = String(Math.round(to * (1 - Math.pow(1 - p, 3)))); if (p < 1) requestAnimationFrame(f); })(t0);
  }
  function heroCounters() {
    var d = db(); if (!d) return;
    var rot = document.getElementById("rotator"); if (rot) rot.textContent = (WORDS[T.lang] || WORDS.fr)[wi % 4];
    var vals = {
      offers: d.offers.filter(function (o) { return o.status === "publiee"; }).length,
      students: (d.officialStudents || []).length,
      companies: Array.from(new Set(d.users.filter(function (x) { return x.company; }).map(function (x) { return x.company; }))).length
    };
    document.querySelectorAll("[data-count]").forEach(function (el) { countUp(el, vals[el.getAttribute("data-count")] || 0); });
  }
  var wi = 0;
  var WORDS = { fr: ["soutenance", "convention", "candidature", "réussite"], ar: ["المناقشة", "الاتفاقية", "الترشح", "النجاح"] };
  var rotEl = document.getElementById("rotator");
  setInterval(function () {
    if (!rotEl || document.getElementById("auth-view").hidden) return;
    rotEl.classList.add("out");
    setTimeout(function () { var w = WORDS[T.lang] || WORDS.fr; wi = (wi + 1) % w.length; rotEl.textContent = w[wi]; rotEl.classList.remove("out"); }, 350);
  }, 2600);
  var revealIO = ("IntersectionObserver" in window) ? new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); revealIO.unobserve(en.target); } }); }, { threshold: 0.15 }) : null;
  document.querySelectorAll(".reveal").forEach(function (el) { if (revealIO) revealIO.observe(el); else el.classList.add("in"); });

  /* ---------- transversal : langue, mode sombre, autosave, session, ripple ---------- */
  document.getElementById("lang-select").addEventListener("change", function (e) { T.setLang(e.target.value); });
  var darkBtn = document.getElementById("btn-dark");
  function applyDark(on) { document.body.classList.toggle("dark", on); darkBtn.setAttribute("aria-pressed", String(on)); sessionStorage.setItem("gs_dark", on ? "1" : "0"); }
  darkBtn.addEventListener("click", function () { applyDark(!document.body.classList.contains("dark")); });
  applyDark(sessionStorage.getItem("gs_dark") === "1");
  var fontBtn = document.getElementById("btn-font");
  var fontSizes = ["100%", "112.5%", "125%"];
  function applyFont() { var i = Number(sessionStorage.getItem("gs_font") || 0); document.documentElement.style.fontSize = fontSizes[i]; if (fontBtn) fontBtn.textContent = "A" + "+".repeat(i + 1); }
  if (fontBtn) fontBtn.addEventListener("click", function () { var i = (Number(sessionStorage.getItem("gs_font") || 0) + 1) % fontSizes.length; sessionStorage.setItem("gs_font", String(i)); applyFont(); });
  applyFont();

  /* Sauvegarde automatique des formulaires (brouillons en session uniquement) */
  document.querySelectorAll("form[data-autosave]").forEach(function (form) {
    var key = "gs_draft_" + form.getAttribute("data-autosave");
    try { var draft = JSON.parse(sessionStorage.getItem(key) || "null"); if (draft) Object.keys(draft).forEach(function (id) { var el = document.getElementById(id); if (el) el.value = draft[id]; }); } catch (e) {}
    form.addEventListener("input", function () {
      var data = {}; form.querySelectorAll("input,select,textarea").forEach(function (el) { if (el.id && el.type !== "password") data[el.id] = el.value; });
      sessionStorage.setItem(key, JSON.stringify(data));
    });
    form.addEventListener("submit", function () { sessionStorage.removeItem(key); });
  });

  ["click", "keydown", "touchstart"].forEach(function (ev) { document.addEventListener(ev, function () { lastActivity = Date.now(); }, { passive: true }); });
  setInterval(function () {
    if (state.userId && Date.now() - lastActivity > 30 * 60 * 1000) {
      logout("Session expirée après 30 minutes d'inactivité. Tes saisies en cours sont sauvegardées et seront restaurées à la reconnexion.");
    }
  }, 30000);

  document.addEventListener("click", function (e) {
    var b = e.target.closest ? e.target.closest(".btn") : null; if (!b) return;
    var r = document.createElement("span"); r.className = "ripple";
    var rect = b.getBoundingClientRect(); var size = Math.max(rect.width, rect.height);
    r.style.width = r.style.height = size + "px"; r.style.left = (e.clientX - rect.left - size / 2) + "px"; r.style.top = (e.clientY - rect.top - size / 2) + "px";
    b.appendChild(r); setTimeout(function () { r.remove(); }, 500);
  });
  document.getElementById("modal").addEventListener("click", function (e) { if (e.target.id === "modal") e.target.hidden = true; });
  document.getElementById("btn-wipe").addEventListener("click", function () {
    if (!confirm("Effacer toutes les données de démonstration et revenir aux comptes démo ?")) return;
    DB.wipe(); location.reload();
  });

  /* ---------- démarrage ---------- */
  T.apply();
  function hideSplash() { var sp = document.getElementById("splash"); if (sp) { sp.classList.add("done"); setTimeout(function () { sp.remove(); }, 700); } }
  DB.load().then(function () { DB.refreshOfferExpiry(); render(); hideSplash(); }).catch(function () { hideSplash(); });
})();
