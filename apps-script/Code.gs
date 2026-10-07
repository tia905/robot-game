// Tempel SELURUH isi file ini di Extensions > Apps Script pada Google Sheet kamu (timpa kode lama),
// lalu Deploy > Manage deployments > Edit (ikon pensil) > Version: "New version" > Deploy.
// Project Settings > Script properties: ADMIN_KEY = kata sandi admin pilihanmu.
//
// Sheet yang dipakai:
//   Lessons : data lesson (otomatis)
//   Jawaban : REKAP -> 1 murid = 1 baris (nama + kelas + lesson). Jawaban baru menimpa kolom yang sama, tidak bikin baris baru.
//   Log     : catatan mentah semua jawaban (dipakai halaman Results). Boleh disembunyikan.
// Sheet "Jawaban" lama (1 jawaban = 1 baris) otomatis di-rename jadi "Jawaban_lama" dan datanya
// dipindah ke "Log" sekali saja.

var REKAP = "Jawaban", LOG = "Log", SEP = " | ";
var LOG_H = ["waktu", "lesson_id", "lesson", "nama", "kelas", "challenge", "no", "pertanyaan", "jawaban", "status", "skor", "percobaan"];
var FIX_H = ["waktu", "lesson_id", "lesson", "nama", "kelas"];
var FIX_N = FIX_H.length;
var LEGACY = ["level_game_selesai", "soal_benar", "soal_dinilai", "nilai_%"];

function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }
function sheet_(n, h) {
  var s = ss_().getSheetByName(n);
  if (!s) {
    s = ss_().insertSheet(n);
    s.appendRow(h);
    s.setFrozenRows(1);
    if (n === "Lessons") s.getRange("A:A").setNumberFormat("@");
  }
  return s;
}
function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
function admin_(k) { return k === PropertiesService.getScriptProperties().getProperty("ADMIN_KEY"); }
function t_(v) { v = String(v == null ? "" : v); return /^[=+\-@]/.test(v) ? "'" + v : v; }

// Migrasi sekali: sheet "Jawaban" format lama (kolom H = "pertanyaan") -> jadi Log
function migrate_() {
  var cache = CacheService.getScriptCache();
  if (cache.get("migrated")) return;
  migrate2_();
  cache.put("migrated", "1", 21600);
}
function migrate2_() {
  var old = ss_().getSheetByName(REKAP);
  if (!old || old.getLastColumn() < 8) return;
  if (String(old.getRange(1, 8).getValue()) !== "pertanyaan") return;
  var log = ss_().getSheetByName(LOG);
  if (!log) {
    log = ss_().insertSheet(LOG);
    log.appendRow(LOG_H);
    log.setFrozenRows(1);
  }
  var v = old.getDataRange().getValues();
  if (v.length > 1) log.getRange(log.getLastRow() + 1, 1, v.length - 1, LOG_H.length).setValues(v.slice(1).map(function (r) { r = r.slice(0, 11); while (r.length < LOG_H.length) r.push(""); return r; }));
  old.setName("Jawaban_lama");
}

function fixLogHeader_() {
  var lg = ss_().getSheetByName(LOG);
  if (lg && lg.getLastRow() >= 1 && String(lg.getRange(1, 12).getValue()) === "") lg.getRange(1, 12).setValue("percobaan");
}

// Lesson di-cache 6 jam supaya murid membuka lesson dengan cepat (tanpa membaca Sheet).
function getLessonJson_(id) {
  var cache = CacheService.getScriptCache(), hit = cache.get("lesson_" + id);
  if (hit) return hit;
  var s = sheet_("Lessons", ["id", "title", "json", "updated"]), n = s.getLastRow();
  if (n < 2) return null;
  var ids = s.getRange(2, 1, n - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) {
      var json = String(s.getRange(i + 2, 3).getValue());
      try { if (json.length < 90000) cache.put("lesson_" + id, json, 21600); } catch (err) {}
      return json;
    }
  }
  return null;
}

function doGet(e) {
  if (e.parameter.action === "getLesson") {
    var json = getLessonJson_(e.parameter.id);
    if (json) return out_({ ok: true, lesson: JSON.parse(json) });
    return out_({ ok: false, error: "Lesson tidak ditemukan" });
  }
  return out_({ ok: true });
}

// ---- REKAP: 1 murid = 1 baris, nilai dihitung PER QUIZ dan PER GAME ----
// Kolom per challenge (label = judul challenge):
//   Quiz : "<label> | benar", "dinilai", "cek manual", "nilai %", lalu "#1", "#2", ...
//   Game : "<label> | level selesai", "bonus ⭐", "nilai %", lalu "L1", "L2", ... (bonus: "L9 ⭐")
// Soal uraian / isian tanpa kunci = TIDAK dihitung otomatis -> masuk "cek manual".
// Nilai manual: ketik ✔ atau ✘ di akhir isi sel jawaban -> nilai terhitung ulang otomatis.
function wantedCols_(plan) {
  var out = [];
  (plan || []).forEach(function (p) {
    var L = String(p.label);
    if (p.type === "game") {
      out.push(L + SEP + "level selesai");
      if (p.bonus > 0) out.push(L + SEP + "bonus ⭐");
      out.push(L + SEP + "nilai %");
      for (var i = 1; i <= p.reg; i++) out.push(L + SEP + "L" + i);
      for (var j = 1; j <= p.bonus; j++) out.push(L + SEP + "L" + (p.reg + j) + " ⭐");
    } else {
      out.push(L + SEP + "benar", L + SEP + "dinilai", L + SEP + "cek manual", L + SEP + "nilai %");
      for (var k = 1; k <= p.n; k++) out.push(L + SEP + "#" + k);
    }
  });
  return out;
}
function colKey_(it) {
  var L = String(it.challenge || "");
  var game = it.kind ? it.kind === "game" : it.status === "selesai";
  return game ? L + SEP + "L" + it.no + (it.bonus ? " ⭐" : "") : L + SEP + "#" + it.no;
}
// Isi sel dibuat SINGKAT. Jawaban lengkap ada di catatan sel (arahkan kursor ke sel / klik kanan > lihat catatan)
// dan di sheet "Log".
var OK_BG = "#d9f2d6", NO_BG = "#fbd9d6", TXT_BG = "#fff4d6";
function cell_(it) {
  var a = String(it.answer == null ? "" : it.answer), n = Number(it.attempt) > 1 ? " (" + it.attempt + "x)" : "";
  var kind = it.kind ? it.kind : (it.status === "selesai" ? "game" : "quiz");
  if (kind === "game") {
    var m = a.match(/(\d+)\s*blok/i);
    return { v: "✔" + (m ? " " + m[1] + " blok" : ""), note: a, bg: OK_BG };
  }
  if (it.status === "benar") return { v: "✔" + n, note: "Jawaban: " + a, bg: OK_BG };
  if (it.status === "salah") return { v: "✘" + n, note: "Jawaban: " + a, bg: NO_BG };
  // uraian / isian tanpa kunci: tampilkan awalnya saja, perlu dicek manual
  var flat = a.replace(/\s*\n\s*/g, " · ");
  return { v: flat.length > 40 ? flat.slice(0, 40) + "…" : flat, note: a, bg: TXT_BG };
}
function bgOf_(v) {
  v = String(v == null ? "" : v);
  if (!v) return null;
  if (/✔(\s*\(\d+x\))?\s*$/.test(v) || /^✔/.test(v)) return OK_BG;
  if (/✘(\s*\(\d+x\))?\s*$/.test(v)) return NO_BG;
  return TXT_BG;
}
function groupOf_(h) {
  var p = String(h).split(SEP);
  return p.length < 2 ? null : { lab: p.slice(0, -1).join(SEP), col: p[p.length - 1] };
}
// Tambah kolom yang belum ada (tidak mengacak kolom lama). Return header terbaru.
function ensureCols_(s, wanted) {
  var lastRow = s.getLastRow();
  var head = s.getRange(1, 1, 1, Math.max(s.getLastColumn(), FIX_N)).getValues()[0].map(String);
  while (head.length > FIX_N && head[head.length - 1] === "") head.pop();
  var hasLegacy = LEGACY.some(function (n) { return head.indexOf(n) >= 0; });
  var missing = wanted.filter(function (w, i) { return head.indexOf(w) < 0 && wanted.indexOf(w) === i; });
  if (!missing.length && !hasLegacy) return head;
  var data = lastRow > 1 ? s.getRange(2, 1, lastRow - 1, head.length).getValues() : [];
  LEGACY.forEach(function (n) {
    var i = head.indexOf(n);
    if (i >= 0) { head.splice(i, 1); data.forEach(function (r) { r.splice(i, 1); }); }
  });
  missing.forEach(function (name) {
    var g = groupOf_(name), at = -1;
    for (var i = FIX_N; i < head.length; i++) { var h = groupOf_(head[i]); if (h && g && h.lab === g.lab) at = i; }
    var idx = at < 0 ? head.length : at + 1;
    head.splice(idx, 0, name);
    data.forEach(function (r) { r.splice(idx, 0, ""); });
  });
  var oldW = Math.max(s.getLastColumn(), head.length);
  if (oldW > head.length) s.getRange(1, head.length + 1, Math.max(lastRow, 1), oldW - head.length).clearContent();
  s.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight("bold");
  if (data.length) s.getRange(2, 1, data.length, head.length).setValues(data);
  missing.forEach(function (name) {
    var g = groupOf_(name), c = head.indexOf(name) + 1;
    s.setColumnWidth(c, g && /^(#|L)\d+/.test(g.col) ? 84 : 96);
  });
  s.setFrozenColumns(FIX_N);
  return head;
}
// Hitung ulang ringkasan nilai dari isi sel (per quiz & per game)
function recompute_(head, row) {
  var G = {};
  head.forEach(function (h, i) {
    var g = groupOf_(h); if (!g) return;
    var o = G[g.lab] = G[g.lab] || { q: [], l: [], lb: [], sum: {} };
    if (/^#\d+$/.test(g.col)) o.q.push(i);
    else if (/^L\d+ ⭐$/.test(g.col)) o.lb.push(i);
    else if (/^L\d+$/.test(g.col)) o.l.push(i);
    else o.sum[g.col] = i;
  });
  function put(o, c, v) { if (o.sum[c] !== undefined) row[o.sum[c]] = v; }
  Object.keys(G).forEach(function (lab) {
    var o = G[lab];
    if (o.q.length) {
      var ok = 0, gr = 0, man = 0;
      o.q.forEach(function (i) {
        var v = String(row[i] == null ? "" : row[i]);
        if (!v) return;
        if (/✔(\s*\(\d+x\))?\s*$/.test(v)) { ok++; gr++; }
        else if (/✘(\s*\(\d+x\))?\s*$/.test(v)) gr++;
        else man++;
      });
      put(o, "benar", ok); put(o, "dinilai", gr); put(o, "cek manual", man);
      put(o, "nilai %", gr ? Math.round(ok / gr * 100) : "");
    } else if (o.l.length || o.lb.length) {
      var d = 0, b = 0;
      o.l.forEach(function (i) { if (String(row[i] == null ? "" : row[i])) d++; });
      o.lb.forEach(function (i) { if (String(row[i] == null ? "" : row[i])) b++; });
      put(o, "level selesai", d); put(o, "bonus ⭐", b);
      put(o, "nilai %", o.l.length ? Math.round(d / o.l.length * 100) : "");
    }
  });
}
function upsertRekap_(d) {
  var s = sheet_(REKAP, FIX_H);
  var wanted = wantedCols_(d.plan);
  d.items.forEach(function (it) { wanted.push(colKey_(it)); });
  var head = ensureCols_(s, wanted), W = head.length, n = s.getLastRow();
  var lid = String(d.lessonId), nm = String(d.name || "").trim(), kl = String(d.cls || "").trim();
  // cari baris murid dengan membaca kolom identitas saja (cepat)
  var rowNum = -1;
  if (n > 1) {
    var idc = s.getRange(2, 2, n - 1, 4).getValues();
    for (var i = 0; i < idc.length; i++) {
      if (String(idc[i][0]) === lid && String(idc[i][2]).trim().toLowerCase() === nm.toLowerCase() && String(idc[i][3]).trim() === kl) { rowNum = i + 2; break; }
    }
  }
  var cur = rowNum > 0 ? s.getRange(rowNum, 1, 1, W).getValues()[0] : [];
  while (cur.length < W) cur.push("");
  if (rowNum < 0) { cur[1] = t_(lid); cur[2] = t_(d.lessonTitle); cur[3] = t_(nm); cur[4] = t_(kl); }
  cur[0] = new Date();
  var cells = d.items.map(function (it) { var c = cell_(it); cur[head.indexOf(colKey_(it))] = t_(c.v); return { col: head.indexOf(colKey_(it)) + 1, c: c }; });
  recompute_(head, cur);
  if (rowNum < 0) { s.appendRow(cur); rowNum = s.getLastRow(); } else s.getRange(rowNum, 1, 1, W).setValues([cur]);
  cells.forEach(function (x) { s.getRange(rowNum, x.col).setNote(x.c.note).setBackground(x.c.bg); });
}

// Dipanggil otomatis saat guru mengedit sel di sheet "Jawaban" (mis. mengetik ✔ / ✘ untuk nilai manual)
function onEdit(e) {
  try {
    var s = e.range.getSheet();
    if (s.getName() !== REKAP || e.range.getRow() < 2 || e.range.getLastColumn() <= FIX_N) return;
    var W = s.getLastColumn(), head = s.getRange(1, 1, 1, W).getValues()[0].map(String);
    for (var r = e.range.getRow(); r <= e.range.getLastRow(); r++) {
      var rg = s.getRange(r, 1, 1, W), row = rg.getValues()[0];
      recompute_(head, row); rg.setValues([row]);
      for (var c = Math.max(e.range.getColumn(), FIX_N + 1); c <= e.range.getLastColumn(); c++) {
        var g = groupOf_(head[c - 1]);
        if (g && /^(#\d+|L\d+)/.test(g.col)) s.getRange(r, c).setBackground(bgOf_(row[c - 1]));
      }
    }
  } catch (err) {}
}
function recomputeAll_() {
  var s = ss_().getSheetByName(REKAP); if (!s || s.getLastRow() < 2) return;
  var W = s.getLastColumn(), head = s.getRange(1, 1, 1, W).getValues()[0].map(String);
  var rg = s.getRange(2, 1, s.getLastRow() - 1, W), v = rg.getValues();
  v.forEach(function (row) { recompute_(head, row); });
  rg.setValues(v);
}
function onOpen() {
  SpreadsheetApp.getUi().createMenu("🤖 Robot Game").addItem("Hitung ulang semua nilai", "recomputeAll_").addToUi();
}

function doPost(e) {
  var d = JSON.parse(e.postData.contents);
  if (d.action === "saveLesson") {
    if (!admin_(d.key)) return out_({ ok: false, error: "Kunci admin salah" });
    var s = sheet_("Lessons", ["id", "title", "json", "updated"]);
    var r = s.getDataRange().getValues();
    var row = [String(d.lesson.id), d.lesson.title, JSON.stringify(d.lesson), new Date()];
    for (var i = 1; i < r.length; i++) {
      if (String(r[i][0]) === String(d.lesson.id)) {
        s.getRange(i + 1, 1, 1, 4).setValues([row]);
        CacheService.getScriptCache().remove("lesson_" + d.lesson.id);
        return out_({ ok: true });
      }
    }
    s.appendRow(row);
    CacheService.getScriptCache().remove("lesson_" + d.lesson.id);
    return out_({ ok: true });
  }
  if (d.action === "upload") {
    if (!admin_(d.key)) return out_({ ok: false, error: "Kunci admin salah" });
    var f = DriveApp.createFile(Utilities.newBlob(Utilities.base64Decode(d.data), "image/jpeg", (d.name || "img") + ".jpg"));
    f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return out_({ ok: true, url: "https://drive.google.com/thumbnail?id=" + f.getId() + "&sz=w1000" });
  }
  if (d.action === "translate") {
    // Terjemahan otomatis EN -> ID (Google Translate bawaan Apps Script, gratis)
    if (!admin_(d.key)) return out_({ ok: false, error: "Kunci admin salah" });
    var res = (d.texts || []).slice(0, 60).map(function (t) {
      try { return t ? LanguageApp.translate(String(t), "en", "id") : ""; } catch (err) { return ""; }
    });
    return out_({ ok: true, texts: res });
  }
  if (d.action === "getResults") {
    if (!admin_(d.key)) return out_({ ok: false, error: "Kunci admin salah" });
    migrate_(); fixLogHeader_();
    var ls = sheet_(LOG, LOG_H);
    var vals = ls.getLastRow() > 1 ? ls.getRange(2, 1, ls.getLastRow() - 1, LOG_H.length).getValues() : [];
    vals.forEach(function (r) { if (r[0] instanceof Date) r[0] = r[0].toISOString(); });
    return out_({ ok: true, rows: vals });
  }
  if (d.action === "submit") {
    var lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      migrate_(); fixLogHeader_();
      var lg = sheet_(LOG, LOG_H), now = new Date();
      d.items.forEach(function (it) {
        lg.appendRow([now, t_(d.lessonId), t_(d.lessonTitle), t_(d.name), t_(d.cls), t_(it.challenge), it.no, t_(it.question), t_(it.answer), t_(it.status), it.score, it.attempt || 1]);
      });
      upsertRekap_(d);
    } finally { lock.releaseLock(); }
    return out_({ ok: true });
  }
  return out_({ ok: false });
}
