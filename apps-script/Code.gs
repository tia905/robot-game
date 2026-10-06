// Tempel di Extensions > Apps Script pada Google Sheet kamu.
// Project Settings > Script properties: tambah ADMIN_KEY = kata sandi admin pilihanmu.
function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }
function sheet_(n, h) {
  var s = ss_().getSheetByName(n);
  if (!s) {
    s = ss_().insertSheet(n);
    s.appendRow(h);
    if (n === "Lessons") s.getRange("A:A").setNumberFormat("@");
  }
  return s;
}
function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
function admin_(k) { return k === PropertiesService.getScriptProperties().getProperty("ADMIN_KEY"); }
function t_(v) { v = String(v == null ? "" : v); return /^[=+\-@]/.test(v) ? "'" + v : v; }

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
  if (d.action === "submit") {
    var s2 = sheet_("Results", ["waktu", "lesson_id", "lesson", "nama", "kelas", "challenge", "pertanyaan", "jawaban"]);
    d.items.forEach(function (it) {
      s2.appendRow([new Date(), t_(d.lessonId), t_(d.lessonTitle), t_(d.name), t_(d.cls), t_(it.challenge), t_(it.question), t_(it.answer)]);
    });
    return out_({ ok: true });
  }
  return out_({ ok: false });
}
