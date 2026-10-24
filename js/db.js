/* db.js — Base de démonstration dans le navigateur.
   ATTENTION (honnêteté) : ceci simule un backend. En production, les comptes, mots de
   passe (argon2/bcrypt), permissions et l'isolation des données doivent être côté serveur.
   Ici le mot de passe est haché en SHA-256 (jamais stocké en clair dans la base). */
"use strict";
window.GSDB = (function () {
  var KEY = "gs_db_v1";
  var db = null;
  function uid(p) { return p + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4); }
  function today() { return new Date().toISOString().slice(0, 10); }
  function plusDays(d) { var x = new Date(); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); }

  function hash(pw) {
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode("gs::" + pw)).then(function (buf) {
      return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
    });
  }
  var sqlTimer = null;
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {}
    if (window.GSSQL) { clearTimeout(sqlTimer); sqlTimer = setTimeout(function () { window.GSSQL.sync(db); }, 250); }
  }
  function log(action, by) {
    db.logs.unshift({ id: uid("log"), date: new Date().toISOString(), action: action, by: by || "système" });
    db.logs = db.logs.slice(0, 300);
  }
  function notify(userId, text) {
    db.notifications.unshift({ id: uid("not"), userId: userId, text: text, date: new Date().toISOString(), read: false });
  }
  function admins() { return db.users.filter(function (u) { return (u.role === "admin" || u.role === "universite") && u.active; }); }
  function notifyAdmins(text) { admins().forEach(function (a) { notify(a.id, text); }); }

  function seed() {
    return Promise.all([hash("admin1234"), hash("encad1234"), hash("etud1234"), hash("entr1234"), hash("etud1234"), hash("univ1234"), hash("aent1234")]).then(function (h) {
      db = {
        users: [
          { id: "u-admin", role: "universite", name: "Admin Université", email: "admin@univ.tn", pass: h[0], extra: "Administration universitaire — service des stages", active: true },
          { id: "u-univ", role: "universite", name: "Université — Service des Stages", email: "universite@univ.tn", pass: h[5], extra: "Service des stages de l'université", active: true },
          { id: "u-enc", role: "encadrant", name: "Dr. Leïla Ben Salah", email: "encadrant@univ.tn", pass: h[1], extra: "Informatique", active: true },
          { id: "u-etu", role: "etudiant", numero: "E-1001", name: "Yasmine Trabelsi", email: "etudiant@univ.tn", pass: h[2], extra: "Licence Informatique", active: true, favorites: [], emailPrefs: { statut: true, entretien: true, message: true, echeance: true } },
          { id: "u-ent", role: "entreprise", name: "Ahmed Gharbi (TechNova)", email: "entreprise@tech.tn", pass: h[3], extra: "Encadrant professionnel", company: "TechNova", active: true, partner: true },
          { id: "u-aent", role: "admin_entreprise", name: "Admin TechNova", email: "admin@technova.tn", pass: h[6], extra: "Admin entreprise", company: "TechNova", active: true, partner: true },
          { id: "u-etu2", role: "etudiant", numero: "E-1002", name: "Karim Haddad", email: "karim@univ.tn", pass: h[4], extra: "Master Data", active: true, favorites: [], emailPrefs: { statut: true, entretien: true, message: true, echeance: true } },
          { id: "u-ent2", role: "entreprise", name: "DataCorp", email: "contact@datacorp.tn", pass: h[3], extra: "Data", company: "DataCorp", active: true, partner: true }
        ],
        offers: [
          { id: "o1", companyId: "u-ent", company: "TechNova", title: "Développeur Web Full-Stack", domain: "Informatique", city: "Tunis", duration: "2 mois", type: "PFE", places: 2, mode: "Hybride", niveau: "Licence", skills: "JavaScript, API REST", desc: "Développement d'une application web (front + API).", deadline: plusDays(30), status: "publiee", reviewer: "Admin TechNova", created: today() },
          { id: "o2", companyId: "u-ent2", company: "DataCorp", title: "Data Analyst", domain: "Data", city: "Sfax", duration: "3 mois", type: "Été", places: 1, mode: "Présentiel", niveau: "Master", skills: "SQL, Python, Power BI", desc: "Analyse de données et tableaux de bord.", deadline: plusDays(15), status: "publiee", reviewer: "DataCorp", created: today() },
          { id: "o3", companyId: "u-ent", company: "TechNova", title: "Stage Marketing Digital", domain: "Marketing", city: "Sousse", duration: "1 mois", type: "Été", places: 1, mode: "À distance", niveau: "Licence", skills: "Réseaux sociaux, SEO", desc: "Campagnes réseaux sociaux.", deadline: plusDays(20), status: "en_relecture", created: today() },
          { id: "o4", companyId: "u-ent2", company: "DataCorp", title: "Ancienne offre (délai dépassé)", domain: "Data", city: "Tunis", duration: "2 mois", type: "PFE", places: 1, mode: "Présentiel", niveau: "Master", skills: "SQL", desc: "Offre de démonstration dont le délai est dépassé : elle sera fermée automatiquement.", deadline: plusDays(-5), status: "publiee", created: today() }
        ],
        applications: [
          { id: "a1", offerId: "o1", studentId: "u-etu", companyId: "u-ent", cvName: "CV_Yasmine.pdf", letter: "Motivée par le développement web…", status: "acceptee", acceptedAt: today(), interview: "", interviewMode: "", interviewResult: "", history: [{ s: "envoyee", d: today() }, { s: "acceptee", d: today() }], supervisorId: "", created: today() },
          { id: "a2", offerId: "o2", studentId: "u-etu2", companyId: "u-ent2", cvName: "CV_Karim.pdf", letter: "Passionné de data…", status: "approuvee", acceptedAt: today(), confirmedAt: today(), interview: "", interviewMode: "", interviewResult: "", history: [{ s: "envoyee", d: today() }, { s: "acceptee", d: today() }, { s: "confirmee", d: today() }, { s: "approuvee", d: today() }], supervisorId: "u-enc", created: today() }
        ],
        officialStudents: [
          { numero: "E-1001", name: "Yasmine Trabelsi", filiere: "Licence Informatique", niveau: "3", promo: "2026" },
          { numero: "E-1002", name: "Karim Haddad", filiere: "Master Data", niveau: "2", promo: "2026" },
          { numero: "E-1003", name: "Sara Mansour", filiere: "Licence Informatique", niveau: "2", promo: "2027" },
          { numero: "E-1004", name: "Mohamed Ali Ben Romdhane", filiere: "Licence Réseaux", niveau: "3", promo: "2026" }
        ],
        stages: [
          { id: "s1", appId: "a2", studentId: "u-etu2", companyId: "u-ent2", supervisorId: "u-enc", status: "cree", start: plusDays(-7), end: plusDays(53), subject: "Analyse de données et tableaux de bord", horaire: "09:00", workDays: "Lun–Ven", programme: "", created: today() }
        ],
        attendance: [], events: [
          { id: "ev1", type: "ferie", title: "Jour férié (démo)", date: plusDays(10), by: "Admin Université" }
        ],
        resetTokens: [],
        conventions: [], journals: [], reportComments: [],
        reports: [], soutenances: [], evaluations: [], messages: [], announcements: [
          { id: "an1", title: "Ouverture des stages d'été", text: "Les demandes de convention pour l'été sont ouvertes.", date: today(), by: "Admin Université" }
        ],
        notifications: [], logs: []
      };
      log("Base de démonstration initialisée", "système");
      save();
      return db;
    });
  }
  function load() {
    var start = (window.GSSQL ? window.GSSQL.init() : Promise.resolve(false));
    return start.then(function () {
      if (window.GSSQL && window.GSSQL.ready()) {
        var fromSql = window.GSSQL.restore();
        if (fromSql && fromSql.users) { db = fromSql; return migrate(); }
      }
      try { var raw = localStorage.getItem(KEY); if (raw) { db = JSON.parse(raw); return migrate(); } } catch (e) {}
      return seed();
    });
  }
  function migrate() {
    /* Migration StageFlow (CDC v1.1) : collections et comptes CDC ajoutés aux anciennes bases. */
    var changed = false;
    ["officialStudents", "stages", "attendance", "events", "resetTokens"].forEach(function (k) { if (!Array.isArray(db[k])) { db[k] = []; changed = true; } });
    if (!db.officialStudents.length) {
      db.officialStudents = [
        { numero: "E-1001", name: "Yasmine Trabelsi", filiere: "Licence Informatique", niveau: "3", promo: "2026" },
        { numero: "E-1002", name: "Karim Haddad", filiere: "Master Data", niveau: "2", promo: "2026" },
        { numero: "E-1003", name: "Sara Mansour", filiere: "Licence Informatique", niveau: "2", promo: "2027" },
        { numero: "E-1004", name: "Mohamed Ali Ben Romdhane", filiere: "Licence Réseaux", niveau: "3", promo: "2026" }
      ]; changed = true;
    }
    var finish = function () { if (changed) log("Migration StageFlow appliquée", "système"); save(); return db; };
    if (db.users.some(function (u) { return u.role === "admin_entreprise"; })) return Promise.resolve(finish());
    return hash("aent1234").then(function (hp) {
      db.users.push({ id: "u-aent", role: "admin_entreprise", name: "Admin TechNova", email: "admin@technova.tn", pass: hp, extra: "Admin entreprise", company: "TechNova", active: true, partner: true });
      changed = true; return finish();
    });
  }
  function refreshOfferExpiry() {
    var changed = false;
    db.offers.forEach(function (o) {
      if (o.status === "publiee" && o.deadline < today()) { o.status = "fermee"; changed = true; log("Offre fermée automatiquement (délai dépassé) : " + o.title, "système"); }
      if (o.status === "publiee" && o.places) {
        var taken = db.applications.filter(function (a) { return a.offerId === o.id && ["acceptee", "confirmee", "approuvee"].indexOf(a.status) >= 0; }).length;
        if (taken >= o.places) { o.status = "complet"; changed = true; log("Offre complète (places pourvues) : " + o.title, "système"); }
      }
    });
    if (changed) save();
  }
  return {
    load: load, save: save, hash: hash, uid: uid, today: today, plusDays: plusDays, log: log, notify: notify, notifyAdmins: notifyAdmins,
    refreshOfferExpiry: refreshOfferExpiry,
    get db() { return db; },
    wipe: function () { localStorage.removeItem(KEY); try { localStorage.removeItem("gs_sqlite_v1"); } catch (e) {} sessionStorage.clear(); }
  };
})();
