// Tempel SELURUH isi file ini di Extensions > Apps Script pada Google Sheet kamu (timpa kode lama),
// lalu Deploy > Manage deployments > Edit (ikon pensil) > Version: "New version" > Deploy.
// Project Settings > Script properties: ADMIN_KEY = kata sandi admin pilihanmu.
//
// Sheet yang dipakai (rekap dipisah PER LESSON, nama tab: "<jenis> - <judul lesson>"):
//   Lessons                    : data lesson (otomatis)
//   Rekap - <lesson>           : REKAP jawaban -> 1 murid = 1 baris. Jawaban baru menimpa kolom yang sama.
//   Feedback - <lesson>        : feedback teman untuk lesson itu saja
//   Bintang - <lesson>         : data mentah bintang Gallery Walk lesson itu
//   Rekap Bintang - <lesson>   : analisis + peringkat + chart untuk guru (diperbarui dari halaman Feedback admin)
//   Log                        : catatan mentah semua jawaban (dipakai halaman Results). Boleh disembunyikan.
// Tab hanya dibuat saat ada data baru untuk lesson itu; data lama tidak dipindah / direkap ulang.

var REKAP = "Jawaban", REKAP_TAB = "Rekap", LOG = "Log", SEP = " | ";
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

// ---- TAB PER LESSON ----
// Nama tab: "<jenis> - <judul lesson>", mis. "Rekap - Project My Name Card" (sama seperti tab yang sudah ada).
function tabName_(prefix, title) {
  var t = String(title || "").replace(/[\[\]\*\?\/\\:]/g, " ").replace(/\s+/g, " ").trim();
  var base = prefix + " - ";
  return base + t.slice(0, Math.max(0, 100 - base.length)).trim();
}
// Ambil (atau buat) tab milik satu lesson. Tab lain tidak disentuh.
function lessonSheet_(prefix, id, title, header) {
  var name = tabName_(prefix, title || lessonTitle_(id)), s = ss_().getSheetByName(name);
  if (s) return s;
  s = ss_().insertSheet(name);
  s.appendRow(header); s.setFrozenRows(1); s.getRange(1, 1, 1, header.length).setFontWeight("bold");
  return s;
}
function lessonTitle_(id) {
  var sj = fbSetupJson_(id);
  if (sj) { try { var t = JSON.parse(sj).title; if (t) return String(t); } catch (e) {} }
  var lj = getLessonJson_(id);
  if (lj) { try { var t2 = JSON.parse(lj).title; if (t2) return String(t2); } catch (e) {} }
  return String(id);
}

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
  if (e.parameter.action === "getFbSetup") {
    var sj = fbSetupJson_(e.parameter.id);
    if (sj) return out_({ ok: true, setup: JSON.parse(sj) });
    return out_({ ok: false, error: "Feedback belum dibuka untuk lesson ini" });
  }
  if (e.parameter.action === "getFbMine") return out_(fbMine_(e.parameter.id, e.parameter.cls, e.parameter.no));
  if (e.parameter.action === "getStars") return out_(starsMine_(e.parameter.id, e.parameter.cls, e.parameter.no));
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
    if (p.type === "feedback") return; // challenge Feedback tidak punya kolom di rekap
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
  var s = lessonSheet_(REKAP_TAB, String(d.lessonId), d.lessonTitle, FIX_H);
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
    if (s.getName().indexOf(REKAP_TAB + " - ") !== 0 || e.range.getRow() < 2 || e.range.getLastColumn() <= FIX_N) return;
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
  ss_().getSheets().forEach(function (s) {
    if (s.getName().indexOf(REKAP_TAB + " - ") !== 0 || s.getLastRow() < 2) return;
    var W = s.getLastColumn(), head = s.getRange(1, 1, 1, W).getValues()[0].map(String);
    var rg = s.getRange(2, 1, s.getLastRow() - 1, W), v = rg.getValues();
    v.forEach(function (row) { recompute_(head, row); });
    rg.setValues(v);
  });
}
function onOpen() {
  SpreadsheetApp.getUi().createMenu("🤖 Robot Game").addItem("Hitung ulang semua nilai", "recomputeAll_").addToUi();
}

// ---- FEEDBACK TEMAN (peer feedback) ----
// FeedbackSetup : 1 baris per lesson (daftar murid + link project + pengaturan) -> diisi dari halaman feedback-admin.html
// Feedback      : 1 baris per (pengirim -> penerima). Kirim ulang = memperbarui baris yang sama.
//                 Guru bisa menyembunyikan feedback dengan mengetik x di kolom "sembunyikan (isi x)".
var FBS = "FeedbackSetup", FB = "Feedback";
var FB_H = ["waktu", "lesson_id", "kelas_penerima", "no_penerima", "nama_penerima", "kelas_pengirim", "no_pengirim", "nama_pengirim", "feedback", "sembunyikan (isi x)", "data (jangan diubah)"];
function fbSetupJson_(id) {
  var cache = CacheService.getScriptCache(), hit = cache.get("fbs_" + id);
  if (hit) return hit;
  var s = sheet_(FBS, ["id", "json", "updated"]), n = s.getLastRow();
  if (n < 2) return null;
  var v = s.getRange(2, 1, n - 1, 2).getValues();
  for (var i = 0; i < v.length; i++) {
    if (String(v[i][0]) === String(id)) {
      var j = String(v[i][1]);
      try { if (j.length < 90000) cache.put("fbs_" + id, j, 21600); } catch (err) {}
      return j;
    }
  }
  return null;
}
function fbFind_(projects, cls, no) {
  cls = String(cls == null ? "" : cls).trim(); no = String(no == null ? "" : no).trim();
  for (var i = 0; i < projects.length; i++) {
    if (String(projects[i].cls).trim() === cls && String(projects[i].no).trim() === no) return projects[i];
  }
  return null;
}
function fbHeader_(sh) {
  if (sh.getLastRow() >= 1 && String(sh.getRange(1, 11).getValue()) === "") sh.getRange(1, 11).setValue(FB_H[10]);
}
// Ringkasan jawaban jadi teks biasa (dibaca guru di Sheet)
function fbReadable_(answers) {
  return answers.map(function (x) {
    var q = x.q && (x.q.en || x.q.id) || "", a = x.a;
    if (a && typeof a === "object") a = a.en || a.id || "";
    if (x.t === "rating") a = a + "/5";
    return (q ? q + ": " : "") + a;
  }).join("\n");
}
function fbClean_(answers) {
  var out = [];
  (answers || []).slice(0, 12).forEach(function (x) {
    if (!x) return;
    var t = x.t === "rating" || x.t === "choice" ? x.t : "text";
    var q = { en: String(x.q && x.q.en || "").slice(0, 300), id: String(x.q && x.q.id || "").slice(0, 300) }, a = x.a;
    if (t === "rating") a = Math.max(1, Math.min(5, Math.round(Number(a) || 0)));
    else if (t === "choice") a = { en: String(a && a.en || "").slice(0, 200), id: String(a && a.id || "").slice(0, 200) };
    else a = String(a == null ? "" : a).slice(0, 600);
    out.push({ t: t, q: q, a: a });
  });
  return out;
}
function fbMine_(id, cls, no) {
  var sj = fbSetupJson_(id);
  if (!sj) return { ok: false, error: "Feedback belum dibuka untuk lesson ini" };
  var setup = JSON.parse(sj), s = lessonSheet_(FB, id, setup.title || lessonTitle_(id), FB_H), n = s.getLastRow(), items = [];
  if (n > 1) {
    s.getRange(2, 1, n - 1, FB_H.length).getValues().forEach(function (r) {
      if (String(r[1]) !== String(id) || String(r[2]).trim() !== String(cls || "").trim() || String(r[3]).trim() !== String(no || "").trim()) return;
      if (String(r[9]).trim()) return; // disembunyikan guru
      var ans = null;
      try { if (r[10]) ans = JSON.parse(String(r[10])); } catch (err) {}
      items.push({ t: r[0] instanceof Date ? r[0].toISOString() : String(r[0]), from: setup.showFrom ? String(r[7]) : "", text: String(r[8]), answers: ans });
    });
  }
  items.sort(function (a, b) { return a.t < b.t ? 1 : -1; });
  return { ok: true, items: items };
}

// ---- URUTAN ABSEN & GALLERY WALK (bintang) ----
// Urutan murid dalam satu kelas = urut nomor absen. "Absen berikutnya" = murid sesudahnya; yang terakhir kembali ke yang pertama.
function fbClassList_(projects, cls) {
  cls = String(cls == null ? "" : cls).trim();
  var a = projects.filter(function (p) { return String(p.cls).trim() === cls; });
  a.sort(function (x, y) {
    var nx = parseFloat(x.no), ny = parseFloat(y.no);
    if (!isNaN(nx) && !isNaN(ny) && nx !== ny) return nx - ny;
    return String(x.no) < String(y.no) ? -1 : String(x.no) > String(y.no) ? 1 : 0;
  });
  return a;
}
function fbNext_(projects, cls, no) {
  var a = fbClassList_(projects, cls), me = String(no == null ? "" : no).trim();
  for (var i = 0; i < a.length; i++) if (String(a[i].no).trim() === me) return a.length > 1 ? a[(i + 1) % a.length] : null;
  return null;
}
var STARS = "Stars";
var ST_H = ["waktu", "lesson_id", "kelas", "no_pemberi", "nama_pemberi", "no_penerima", "nama_penerima"];
function starTokens_(setup) { var n = Math.floor(Number(setup.starTokens)); return n >= 1 && n <= 50 ? n : 5; }
function starsList_(id, cls, no) {
  var s = lessonSheet_("Bintang", id, lessonTitle_(id), ST_H), n = s.getLastRow(), mine = [];
  if (n > 1) s.getRange(2, 1, n - 1, ST_H.length).getValues().forEach(function (r) {
    if (String(r[1]) === String(id) && String(r[2]).trim() === String(cls).trim() && String(r[3]).trim() === String(no).trim()) mine.push(String(r[5]).trim());
  });
  return mine;
}
function starsMine_(id, cls, no) {
  var sj = fbSetupJson_(id);
  if (!sj) return { ok: false, error: "Feedback belum dibuka untuk lesson ini" };
  var setup = JSON.parse(sj);
  return { ok: true, enabled: !!setup.stars, tokens: starTokens_(setup), mine: setup.stars ? starsList_(id, cls, no) : [] };
}


// ---- REKAP & ANALISIS BINTANG (untuk guru) ----
function fbCounts_(id) {
  var sh = lessonSheet_(FB, id, lessonTitle_(id), FB_H), n = sh.getLastRow(), got = {}, sent = {};
  if (n > 1) sh.getRange(2, 1, n - 1, 10).getValues().forEach(function (r) {
    if (String(r[1]) !== String(id) || String(r[9]).trim()) return;
    var a = String(r[2]).trim() + "|" + String(r[3]).trim(), b = String(r[5]).trim() + "|" + String(r[6]).trim();
    got[a] = (got[a] || 0) + 1; sent[b] = (sent[b] || 0) + 1;
  });
  return { got: got, sent: sent };
}
function round1_(x) { return Math.round(x * 10) / 10; }
function nameList_(a, max) { var n = a.map(function (p) { return p.name; }); return n.length > max ? n.slice(0, max).join(", ") + " dan " + (n.length - max) + " lainnya" : n.join(", "); }
function starReport_(id) {
  var sj = fbSetupJson_(id); if (!sj) return null;
  var setup = JSON.parse(sj), P = setup.projects || [], tokens = starTokens_(setup), title = setup.title || lessonTitle_(id);
  var sh = lessonSheet_("Bintang", id, title, ST_H), n = sh.getLastRow(), recv = {}, given = {}, total = 0;
  if (n > 1) sh.getRange(2, 1, n - 1, ST_H.length).getValues().forEach(function (r) {
    if (String(r[1]) !== String(id)) return;
    var cls = String(r[2]).trim(), from = cls + "|" + String(r[3]).trim(), to = cls + "|" + String(r[5]).trim();
    recv[to] = (recv[to] || 0) + 1; given[from] = (given[from] || 0) + 1; total++;
  });
  var fb = fbCounts_(id), order = [], classes = [], rows = [], notes = [];
  P.forEach(function (p) { var c = String(p.cls).trim(); if (order.indexOf(c) < 0) order.push(c); });
  order.forEach(function (cls) {
    var ps = fbClassList_(P, cls).map(function (p) {
      var k = cls + "|" + String(p.no).trim();
      return { cls: cls, no: String(p.no), name: String(p.name), stars: recv[k] || 0, given: given[k] || 0, fbGot: fb.got[k] || 0, fbSent: fb.sent[k] || 0 };
    });
    var tot = ps.reduce(function (a, p) { return a + p.stars; }, 0);
    var sorted = ps.slice().sort(function (a, b) { return b.stars - a.stars; }), rank = 0, prev = null;
    sorted.forEach(function (p, i) { if (p.stars !== prev) { rank = i + 1; prev = p.stars; } p.rank = rank; p.pct = tot ? round1_(p.stars / tot * 100) : 0; });
    var N = ps.length, givers = ps.filter(function (p) { return p.given > 0; }), full = ps.filter(function (p) { return p.given >= tokens; });
    var zero = ps.filter(function (p) { return p.stars === 0; }), noGive = ps.filter(function (p) { return p.given === 0; });
    var max = N ? sorted[0].stars : 0, champs = max > 0 ? sorted.filter(function (p) { return p.stars === max; }) : [];
    var c = { cls: cls, students: N, givers: givers.length, full: full.length, total: tot, avg: N ? round1_(tot / N) : 0, max: max, champs: nameList_(champs, 4), zero: zero.map(function (p) { return p.name; }), noGive: noGive.map(function (p) { return p.name; }) };
    classes.push(c);
    var L = [];
    if (!tot) L.push("Belum ada bintang yang diberikan di kelas ini.");
    else {
      L.push("Terbanyak: " + nameList_(champs, 4) + " (" + max + " ⭐)" + (champs.length > 1 ? " — seri." : "."));
      L.push("Partisipasi: " + givers.length + " dari " + N + " murid sudah memberi bintang (" + Math.round(givers.length / N * 100) + "%), " + full.length + " murid menghabiskan semua " + tokens + " token.");
      if (N >= 6 && tot >= 10) {
        var top3 = sorted.slice(0, 3).reduce(function (a, p) { return a + p.stars; }, 0), share = Math.round(top3 / tot * 100);
        L.push("3 project teratas mengumpulkan " + share + "% dari semua bintang" + (share >= 60 ? " — bintang terpusat di beberapa project." : " — sebaran cukup merata."));
      }
      if (zero.length) L.push(zero.length + " project belum mendapat bintang: " + nameList_(zero, 8) + ". Cocok diberi apresiasi / umpan balik khusus dari guru.");
    }
    if (noGive.length && tot) L.push("Belum memberi bintang: " + nameList_(noGive, 8) + ".");
    notes.push({ cls: cls, lines: L });
    sorted.forEach(function (p) { rows.push(p); });
  });
  return { ok: true, title: title, tokens: tokens, total: total, classes: classes, notes: notes, rows: rows, updated: new Date().toISOString() };
}
function writeStarSheet_(id, rep) {
  var name = tabName_("Rekap Bintang", rep.title), s = ss_().getSheetByName(name);
  if (!s) s = ss_().insertSheet(name);
  s.getCharts().forEach(function (ch) { s.removeChart(ch); });
  s.clear(); s.clearNotes();
  var W = 9, M = [], fmt = [];
  function add(arr, kind) { while (arr.length < W) arr.push(""); M.push(arr); fmt.push(kind || ""); return M.length; }
  add(["Rekap Gallery Walk — " + t_(rep.title)], "title");
  add(["Diperbarui " + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd MMM yyyy HH:mm") + " • token bintang per murid: " + rep.tokens + " • total bintang: " + rep.total], "sub");
  add([]);
  add(["RINGKASAN PER KELAS"], "sec");
  add(["Kelas", "Jumlah murid", "Murid memberi bintang", "Token habis", "Total ⭐", "Rata-rata ⭐/project", "⭐ tertinggi", "Terbanyak", "Belum dapat bintang"], "head");
  rep.classes.forEach(function (c) { add([t_(c.cls), c.students, c.givers, c.full, c.total, c.avg, c.max, t_(c.champs), c.zero.length], ""); });
  add([]);
  add(["CATATAN UNTUK GURU"], "sec");
  rep.notes.forEach(function (nt) { nt.lines.forEach(function (l, i) { add([t_(i === 0 ? nt.cls + ": " + l : "      " + l)], ""); }); });
  add([]);
  add(["PERINGKAT PROJECT (per kelas)"], "sec");
  add(["Kelas", "Peringkat", "No", "Nama", "⭐ diterima", "% bintang kelas", "Bintang diberikan", "Feedback diterima", "Feedback dikirim"], "head");
  var blocks = {}, first = M.length + 1;
  rep.rows.forEach(function (p) {
    var r = add([t_(p.cls), p.rank, t_(p.no), t_(p.name), p.stars, p.pct / 100, p.given, p.fbGot, p.fbSent], p.stars > 0 && p.rank === 1 ? "gold" : "");
    if (!blocks[p.cls]) blocks[p.cls] = { a: r, b: r }; else blocks[p.cls].b = r;
  });
  s.getRange(1, 1, M.length, W).setValues(M);
  fmt.forEach(function (k, i) {
    var r = s.getRange(i + 1, 1, 1, W);
    if (k === "title") r.setFontWeight("bold").setFontSize(15);
    else if (k === "sub") r.setFontColor("#5b6b8c");
    else if (k === "sec") r.setFontWeight("bold").setFontColor("#1B4F9C");
    else if (k === "head") r.setFontWeight("bold").setBackground("#e6edfa");
    else if (k === "gold") r.setBackground("#fff4cc");
  });
  if (rep.rows.length) s.getRange(first, 6, rep.rows.length, 1).setNumberFormat("0.0%");
  [90, 100, 80, 190, 90, 110, 110, 120, 120].forEach(function (w, i) { s.setColumnWidth(i + 1, w); });
  s.setFrozenRows(0);
  // chart batang per kelas (di sebelah kanan tabel)
  var top = 4;
  rep.classes.forEach(function (c) {
    var b = blocks[c.cls]; if (!b) return;
    var rows = b.b - b.a + 1, h = Math.max(220, rows * 24 + 70);
    s.insertChart(s.newChart().setChartType(Charts.ChartType.BAR).addRange(s.getRange(b.a, 4, rows, 2)).setNumHeaders(0)
      .setOption("title", "⭐ Bintang diterima — " + c.cls).setOption("legend", { position: "none" }).setOption("colors", ["#E8832A"])
      .setOption("width", 560).setOption("height", h).setOption("hAxis", { minValue: 0, format: "0" }).setOption("reverseCategories", true)
      .setPosition(top, 11, 0, 0).build());
    top += Math.ceil(h / 21) + 1;
  });
  return { gid: s.getSheetId(), tab: s.getName() };
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
  if (d.action === "saveFbSetup") {
    if (!admin_(d.key)) return out_({ ok: false, error: "Kunci admin salah" });
    var setup = d.setup || {};
    var sjson = JSON.stringify({ title: d.lessonTitle || "", prompt: String(setup.prompt || ""), showFrom: !!setup.showFrom, gallery: setup.gallery !== false, stars: !!setup.stars, starTokens: Math.max(1, Math.min(50, Math.floor(Number(setup.starTokens)) || 5)), assignNext: !!setup.assignNext, projects: setup.projects || [] });
    if (sjson.length > 49000) return out_({ ok: false, error: "Data terlalu besar (maks sekitar 350 murid per lesson)" });
    var fs = sheet_(FBS, ["id", "json", "updated"]), fr = fs.getDataRange().getValues(), frow = [String(d.lessonId), sjson, new Date()], saved = false;
    for (var fi = 1; fi < fr.length; fi++) {
      if (String(fr[fi][0]) === String(d.lessonId)) { fs.getRange(fi + 1, 1, 1, 3).setValues([frow]); saved = true; break; }
    }
    if (!saved) fs.appendRow(frow);
    CacheService.getScriptCache().remove("fbs_" + d.lessonId);
    return out_({ ok: true, count: (setup.projects || []).length });
  }
  if (d.action === "getFbAll") {
    if (!admin_(d.key)) return out_({ ok: false, error: "Kunci admin salah" });
    var as = lessonSheet_(FB, d.lessonId, lessonTitle_(d.lessonId), FB_H), an = as.getLastRow(), rows = [];
    fbHeader_(as);
    if (an > 1) {
      as.getRange(2, 1, an - 1, FB_H.length).getValues().forEach(function (r) {
        if (String(r[1]) !== String(d.lessonId)) return;
        if (r[0] instanceof Date) r[0] = r[0].toISOString();
        rows.push(r.slice(0, 10));
      });
    }
    return out_({ ok: true, rows: rows, gid: as.getSheetId(), tab: as.getName() });
  }
  if (d.action === "sendFeedback") {
    var fj = fbSetupJson_(d.lessonId);
    if (!fj) return out_({ ok: false, error: "Feedback belum dibuka untuk lesson ini" });
    var plist = JSON.parse(fj).projects || [];
    var from = fbFind_(plist, d.from && d.from.cls, d.from && d.from.no), to = fbFind_(plist, d.to && d.to.cls, d.to && d.to.no);
    var fans = d.answers && d.answers.length ? fbClean_(d.answers) : null;
    var ftext = fans ? fbReadable_(fans) : String(d.text || "").trim().slice(0, 600);
    var fdata = fans ? JSON.stringify(fans) : "";
    if (fans && fans.every(function (x) { return x.t === "text" ? !String(x.a).trim() : !x.a; })) ftext = "";
    if (!from || !to) return out_({ ok: false, error: "Data murid tidak ditemukan" });
    if (from === to) return out_({ ok: false, error: "Tidak bisa memberi feedback ke project sendiri" });
    var fsetup = JSON.parse(fj);
    if (fsetup.assignNext) {
      var must = fbNext_(plist, from.cls, from.no);
      if (!must || String(must.cls).trim() !== String(to.cls).trim() || String(must.no).trim() !== String(to.no).trim()) return out_({ ok: false, error: "Kamu hanya boleh memberi feedback ke " + (must ? must.no + ". " + must.name : "teman yang ditentukan guru") });
    }
    if (!ftext) return out_({ ok: false, error: "Feedback masih kosong" });
    var flock = LockService.getScriptLock();
    flock.waitLock(30000);
    try {
      var sh = lessonSheet_(FB, d.lessonId, fsetup.title || lessonTitle_(d.lessonId), FB_H), fn = sh.getLastRow(), at = -1;
      fbHeader_(sh);
      if (fn > 1) {
        var fv = sh.getRange(2, 1, fn - 1, 8).getValues();
        for (var k = 0; k < fv.length; k++) {
          var r = fv[k];
          if (String(r[1]) === String(d.lessonId) && String(r[2]).trim() === String(to.cls).trim() && String(r[3]).trim() === String(to.no).trim() &&
              String(r[5]).trim() === String(from.cls).trim() && String(r[6]).trim() === String(from.no).trim()) { at = k + 2; break; }
        }
      }
      if (at > 0) { sh.getRange(at, 1).setValue(new Date()); sh.getRange(at, 9).setValue(t_(ftext)); sh.getRange(at, 11).setValue(fdata); }
      else sh.appendRow([new Date(), t_(d.lessonId), t_(to.cls), t_(to.no), t_(to.name), t_(from.cls), t_(from.no), t_(from.name), t_(ftext), "", fdata]);
    } finally { flock.releaseLock(); }
    return out_({ ok: true });
  }
  if (d.action === "toggleStar") {
    var tj = fbSetupJson_(d.lessonId);
    if (!tj) return out_({ ok: false, error: "Feedback belum dibuka untuk lesson ini" });
    var tsetup = JSON.parse(tj), tlist = tsetup.projects || [];
    if (!tsetup.stars) return out_({ ok: false, error: "Pemberian bintang tidak aktif" });
    var tf = fbFind_(tlist, d.from && d.from.cls, d.from && d.from.no), tt = fbFind_(tlist, d.to && d.to.cls, d.to && d.to.no);
    if (!tf || !tt) return out_({ ok: false, error: "Data murid tidak ditemukan" });
    if (tf === tt) return out_({ ok: false, error: "Tidak bisa memberi bintang ke project sendiri" });
    if (String(tf.cls).trim() !== String(tt.cls).trim()) return out_({ ok: false, error: "Bintang hanya untuk teman sekelas" });
    var tlock = LockService.getScriptLock();
    tlock.waitLock(30000);
    try {
      var ts = lessonSheet_("Bintang", d.lessonId, tsetup.title || lessonTitle_(d.lessonId), ST_H), tn = ts.getLastRow(), tat = -1, used = 0, tv = tn > 1 ? ts.getRange(2, 1, tn - 1, ST_H.length).getValues() : [];
      tv.forEach(function (r, k) {
        if (String(r[1]) !== String(d.lessonId) || String(r[2]).trim() !== String(tf.cls).trim() || String(r[3]).trim() !== String(tf.no).trim()) return;
        used++;
        if (String(r[5]).trim() === String(tt.no).trim()) tat = k + 2;
      });
      if (d.on && tat < 0) {
        if (used >= starTokens_(tsetup)) return out_({ ok: false, error: "Bintangmu sudah habis. Tarik bintang dari project lain dulu kalau mau memindahkan." });
        ts.appendRow([new Date(), t_(d.lessonId), t_(tf.cls), t_(tf.no), t_(tf.name), t_(tt.no), t_(tt.name)]);
      } else if (!d.on && tat > 0) ts.deleteRow(tat);
    } finally { tlock.releaseLock(); }
    return out_({ ok: true, tokens: starTokens_(tsetup), mine: starsList_(d.lessonId, tf.cls, tf.no) });
  }
  if (d.action === "getStarsAll") {
    if (!admin_(d.key)) return out_({ ok: false, error: "Kunci admin salah" });
    var ss2 = lessonSheet_("Bintang", d.lessonId, lessonTitle_(d.lessonId), ST_H), sn = ss2.getLastRow(), srows = [];
    if (sn > 1) ss2.getRange(2, 1, sn - 1, ST_H.length).getValues().forEach(function (r) { if (String(r[1]) === String(d.lessonId)) srows.push(r.slice(2)); });
    return out_({ ok: true, rows: srows });
  }
  if (d.action === "getStarReport") {
    if (!admin_(d.key)) return out_({ ok: false, error: "Kunci admin salah" });
    var rep = starReport_(d.lessonId);
    if (!rep) return out_({ ok: false, error: "Feedback belum dibuka untuk lesson ini" });
    if (d.write !== false) {
      try { var wr = writeStarSheet_(d.lessonId, rep); rep.gid = wr.gid; rep.tab = wr.tab; } catch (err) { rep.sheetErr = String(err); }
    }
    return out_(rep);
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
