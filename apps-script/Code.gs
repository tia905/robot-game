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

var REKAP = "Jawaban", LOG = "Log";
var LOG_H = ["waktu", "lesson_id", "lesson", "nama", "kelas", "challenge", "no", "pertanyaan", "jawaban", "status", "skor"];
var FIX_H = ["waktu", "lesson_id", "lesson", "nama", "kelas", "level_game_selesai", "soal_benar", "soal_dinilai", "nilai_%"];
var FIX_N = FIX_H.length;

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
  if (v.length > 1) log.getRange(log.getLastRow() + 1, 1, v.length - 1, LOG_H.length).setValues(v.slice(1).map(function (r) { return r.slice(0, LOG_H.length); }));
  old.setName("Jawaban_lama");
}

function doGet(e) {
  if (e.parameter.action === "getLesson") {
    var r = sheet_("Lessons", ["id", "title", "json", "updated"]).getDataRange().getValues();
    for (var i = 1; i < r.length; i++) {
      if (String(r[i][0]) === e.parameter.id) return out_({ ok: true, lesson: JSON.parse(r[i][2]) });
    }
    return out_({ ok: false, error: "Lesson tidak ditemukan" });
  }
  return out_({ ok: true });
}

// ---- REKAP: 1 murid = 1 baris ----
function colKey_(it) {
  // Kolom per soal: "Game L1", "Quiz 2", dst.
  var ch = String(it.challenge || "");
  var isGame = /game/i.test(ch) && String(it.question || "").indexOf("Level") === 0;
  if (isGame) return "Game " + String(it.question).replace(/^Level\s*/i, "L") + (it.bonus ? " ⭐" : "");
  return ch + " #" + it.no;
}
function cell_(it) {
  var a = String(it.answer == null ? "" : it.answer);
  if (it.status === "benar") return a + "  ✔";
  if (it.status === "salah") return a + "  ✘";
  return a;
}
function upsertRekap_(d) {
  var s = sheet_(REKAP, FIX_H);
  var lastCol = Math.max(s.getLastColumn(), FIX_N);
  var head = s.getRange(1, 1, 1, lastCol).getValues()[0];
  var data = s.getLastRow() > 1 ? s.getRange(2, 1, s.getLastRow() - 1, lastCol).getValues() : [];
  var lid = String(d.lessonId), nm = String(d.name || "").trim(), kl = String(d.cls || "").trim();
  var row = -1;
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][1]) === lid && String(data[i][3]).trim().toLowerCase() === nm.toLowerCase() && String(data[i][4]).trim() === kl) { row = i; break; }
  }
  var cur = row >= 0 ? data[row].slice() : [];
  while (cur.length < lastCol) cur.push("");
  if (row < 0) { cur[1] = t_(lid); cur[2] = t_(d.lessonTitle); cur[3] = t_(nm); cur[4] = t_(kl); }
  cur[0] = new Date();
  // kolom dinamis
  d.items.forEach(function (it) {
    var key = colKey_(it), c = head.indexOf(key);
    if (c < 0) { head.push(key); c = head.length - 1; while (cur.length < head.length) cur.push(""); }
    while (cur.length < head.length) cur.push("");
    cur[c] = t_(cell_(it));
  });
  // hitung ringkasan dari isi sel
  var games = 0, ok = 0, graded = 0;
  for (var c2 = FIX_N; c2 < head.length; c2++) {
    var v = String(cur[c2] || "");
    if (!v) continue;
    if (/^Game L\d+/.test(String(head[c2]))) games++;
    else if (/✔\s*$/.test(v)) { ok++; graded++; }
    else if (/✘\s*$/.test(v)) graded++;
  }
  cur[5] = games; cur[6] = ok; cur[7] = graded; cur[8] = graded ? Math.round(ok / graded * 100) : "";
  // tulis header (kalau ada kolom baru) + baris
  while (head.length < cur.length) head.push("");
  s.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight("bold");
  if (row < 0) { s.appendRow(cur); } else { s.getRange(row + 2, 1, 1, cur.length).setValues([cur]); }
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
        return out_({ ok: true });
      }
    }
    s.appendRow(row);
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
    migrate_();
    var ls = sheet_(LOG, LOG_H);
    var vals = ls.getLastRow() > 1 ? ls.getRange(2, 1, ls.getLastRow() - 1, LOG_H.length).getValues() : [];
    vals.forEach(function (r) { if (r[0] instanceof Date) r[0] = r[0].toISOString(); });
    return out_({ ok: true, rows: vals });
  }
  if (d.action === "submit") {
    var lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      migrate_();
      var lg = sheet_(LOG, LOG_H), now = new Date();
      d.items.forEach(function (it) {
        lg.appendRow([now, t_(d.lessonId), t_(d.lessonTitle), t_(d.name), t_(d.cls), t_(it.challenge), it.no, t_(it.question), t_(it.answer), t_(it.status), it.score]);
      });
      upsertRekap_(d);
    } finally { lock.releaseLock(); }
    return out_({ ok: true });
  }
  return out_({ ok: false });
}
