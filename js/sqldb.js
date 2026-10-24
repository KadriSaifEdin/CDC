/* sqldb.js — Vraie base de données locale SQLite (sql.js 1.8.0, SQLite compilé en WASM, fichiers locaux).
   - Les données de l'application sont écrites dans des tables SQLite réelles :
     users, offers, applications, conventions, reports (colonnes typées, requêtables en SQL)
     + records(collection, id, data) qui conserve chaque enregistrement complet en JSON.
   - Le fichier SQLite (format .db standard, ouvrable dans "DB Browser for SQLite") est
     conservé dans ce navigateur (localStorage, encodé en base64) et restauré au démarrage.
   - Export manuel du fichier stages.db depuis la vue Administration.
   Repli honnête : si le WASM ne peut pas se charger (ex. ouverture en file:// selon le navigateur),
   l'application continue avec son stockage JSON local, et l'état SQLite est affiché « indisponible ». */
"use strict";
window.GSSQL = (function () {
  var STORE_KEY = "gs_sqlite_v1";
  var COLLECTIONS = ["users", "offers", "applications", "conventions", "journals", "reportComments", "reports", "soutenances", "evaluations", "messages", "announcements", "notifications", "logs", "officialStudents", "stages", "attendance", "events", "resetTokens"];
  var SQL = null, isReady = false, state = "chargement…";

  function init() {
    if (!window.initSqlJs) { state = "indisponible (sql.js non chargé)"; return Promise.resolve(false); }
    var load = window.initSqlJs({ locateFile: function (f) { return "js/vendor/" + f; } });
    var timeout = new Promise(function (res) { setTimeout(function () { res(null); }, 6000); });
    return Promise.race([load, timeout]).then(function (sql) {
      if (!sql) { state = "indisponible (délai de chargement du WASM)"; return false; }
      SQL = sql; isReady = true; state = "active"; return true;
    }).catch(function () { state = "indisponible (erreur WASM)"; return false; });
  }

  function esc(v) { return v == null ? null : String(v); }
  function build(dbObj) {
    if (!isReady) return null;
    var sq = new SQL.Database();
    sq.run("CREATE TABLE records (collection TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY (collection, id));");
    sq.run("CREATE TABLE users (id TEXT PRIMARY KEY, role TEXT, name TEXT, email TEXT, active INTEGER);");
    sq.run("CREATE TABLE offers (id TEXT PRIMARY KEY, company_id TEXT, title TEXT, domain TEXT, city TEXT, duration TEXT, type TEXT, deadline TEXT, status TEXT);");
    sq.run("CREATE TABLE applications (id TEXT PRIMARY KEY, offer_id TEXT, student_id TEXT, company_id TEXT, status TEXT, created TEXT);");
    sq.run("CREATE TABLE conventions (id TEXT PRIMARY KEY, student_id TEXT, company_id TEXT, subject TEXT, status TEXT, start_date TEXT, end_date TEXT);");
    sq.run("CREATE TABLE reports (id TEXT PRIMARY KEY, app_id TEXT, student_id TEXT, file_name TEXT, version INTEGER, grade REAL);");
    sq.run("CREATE TABLE stages (id TEXT PRIMARY KEY, app_id TEXT, student_id TEXT, company_id TEXT, supervisor_id TEXT, status TEXT, start_date TEXT, end_date TEXT);");
    sq.run("CREATE TABLE attendance (id TEXT PRIMARY KEY, stage_id TEXT, student_id TEXT, date TEXT, status TEXT);");
    COLLECTIONS.forEach(function (col) {
      (dbObj[col] || []).forEach(function (r, idx) {
        /* Certaines collections n'ont pas d'id (liste officielle : clé = numéro) — clé toujours unique. */
        sq.run("INSERT INTO records VALUES (?, ?, ?);", [col, String(r.id || r.numero || ("row" + idx)), JSON.stringify(r)]);
      });
    });
    (dbObj.users || []).forEach(function (u) { sq.run("INSERT INTO users VALUES (?,?,?,?,?);", [u.id, u.role, u.name, u.email, u.active ? 1 : 0]); });
    (dbObj.offers || []).forEach(function (o) { sq.run("INSERT INTO offers VALUES (?,?,?,?,?,?,?,?,?);", [o.id, o.companyId, o.title, o.domain, o.city, o.duration, o.type, o.deadline, o.status]); });
    (dbObj.applications || []).forEach(function (a) { sq.run("INSERT INTO applications VALUES (?,?,?,?,?,?);", [a.id, a.offerId, a.studentId, a.companyId, a.status, a.created]); });
    (dbObj.conventions || []).forEach(function (c) { sq.run("INSERT INTO conventions VALUES (?,?,?,?,?,?,?);", [c.id, c.studentId, c.companyId, c.subject, c.status, c.start, c.end]); });
    (dbObj.reports || []).forEach(function (r) { sq.run("INSERT INTO reports VALUES (?,?,?,?,?,?);", [r.id, r.appId, r.studentId, r.fileName, r.version, r.grade]); });
    (dbObj.stages || []).forEach(function (st) { sq.run("INSERT INTO stages VALUES (?,?,?,?,?,?,?,?);", [st.id, st.appId, st.studentId, st.companyId, st.supervisorId, st.status, st.start, st.end]); });
    (dbObj.attendance || []).forEach(function (at) { sq.run("INSERT INTO attendance VALUES (?,?,?,?,?);", [at.id, at.stageId, at.studentId, at.date, at.status]); });
    return sq;
  }

  function bytesToB64(bytes) {
    var bin = "", chunk = 0x8000;
    for (var i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    return btoa(bin);
  }
  function b64ToBytes(b64) {
    var bin = atob(b64), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  function sync(dbObj) {
    if (!isReady || !dbObj) return;
    try {
      var sq = build(dbObj); if (!sq) return;
      var bytes = sq.export(); sq.close();
      localStorage.setItem(STORE_KEY, bytesToB64(bytes));
    } catch (e) { if (window.console) console.error("GSSQL sync:", e); }
  }
  function restore() {
    if (!isReady) return null;
    try {
      var b64 = localStorage.getItem(STORE_KEY);
      if (!b64) return null;
      var sq = new SQL.Database(b64ToBytes(b64));
      var res = sq.exec("SELECT collection, data FROM records ORDER BY rowid;");
      sq.close();
      if (!res.length) return null;
      var obj = {};
      COLLECTIONS.forEach(function (c) { obj[c] = []; });
      res[0].values.forEach(function (row) {
        try { var rec = JSON.parse(row[1]); if (obj[row[0]]) obj[row[0]].push(rec); } catch (e) {}
      });
      return obj.users && obj.users.length ? obj : null;
    } catch (e) { return null; }
  }
  function counts(dbObj) {
    var out = { users: 0, offers: 0, applications: 0, conventions: 0, reports: 0 };
    if (!isReady || !dbObj) return out;
    try {
      var sq = build(dbObj);
      ["users", "offers", "applications", "conventions", "reports"].forEach(function (t) {
        var r = sq.exec("SELECT COUNT(*) FROM " + t + ";");
        out[t] = r.length ? r[0].values[0][0] : 0;
      });
      sq.close();
    } catch (e) {}
    return out;
  }
  function exportBytes(dbObj) {
    if (!isReady || !dbObj) return null;
    try { var sq = build(dbObj); var bytes = sq.export(); sq.close(); return bytes; } catch (e) { return null; }
  }
  return {
    init: init, sync: sync, restore: restore, counts: counts, exportBytes: exportBytes,
    ready: function () { return isReady; },
    statusText: function () { return state; }
  };
})();
