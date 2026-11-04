// ISI DUA BARIS INI SETELAH DEPLOY APPS SCRIPT (lihat apps-script/Code.gs)
const API_URL = "https://script.google.com/macros/s/AKfycbzcaR7mv3ojjSM4hGzbWD7jRMM9HpR3Z0w3ga9jX1h_kl3hJCaqt9lZKgYOY_Fn7SpM/exec"; // <- tempel URL Web App (/exec) dari Deploy Apps Script di spreadsheet BARU
const SHEET_URL = "https://docs.google.com/spreadsheets/d/1ZyarbS6sBJlK4oc2MFp7mdqO-KTGSLetue0dzx1WDAo/edit?usp=sharing";

// ---------------------------------------------------------------------------
// ANTREAN KIRIM (outbox): setiap jawaban disimpan dulu di browser, lalu dikirim.
// Baru dihapus dari antrean setelah server membalas OK. Kalau gagal / jaringan putus /
// halaman ditutup, jawaban tetap ada dan dikirim ulang otomatis (saat halaman dibuka lagi,
// saat internet kembali, dan tiap ~15 detik). Server membuang duplikat lewat "sid".
// ---------------------------------------------------------------------------
const OB_KEY = "robotOutbox";
function obRead() { try { return JSON.parse(localStorage.getItem(OB_KEY) || "[]"); } catch (e) { return []; } }
function obWrite(a) { try { localStorage.setItem(OB_KEY, JSON.stringify(a)); return true; } catch (e) { return false; } }
let obBusy = false;
async function obFlush() {
    if (obBusy) return;
    obBusy = true;
    try {
        let q = obRead();
        while (q.length) {
            const job = q[0];
            let ok = false, drop = false;
            try {
                const res = await fetch(API_URL, { method: "POST", body: job.body, keepalive: job.body.length < 60000 });
                let j = null;
                try { j = await res.json(); } catch (e2) { j = null; }
                if (j && j.ok) ok = true;
                else {
                    // server sibuk / error: coba lagi nanti (menyerah setelah 60x gagal dari sisi server)
                    job.f = (job.f || 0) + 1;
                    if (job.f >= 60 || (j && j.ok === false && !j.retry)) drop = true;
                }
            } catch (e) { /* jaringan putus: coba lagi nanti, tidak dihitung gagal */ }
            let cur = obRead();
            if (ok || drop) cur = cur.filter(function (x) { return x.sid !== job.sid; });
            else cur = cur.map(function (x) { return x.sid === job.sid ? job : x; });
            obWrite(cur);
            q = cur;
            if (!ok && !drop) break;
        }
    } finally { obBusy = false; }
}
window.addEventListener("online", function () { obFlush(); });
document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") obFlush(); });
setInterval(function () { if (obRead().length) obFlush(); }, 12000 + Math.random() * 6000);
obFlush();

async function api(action, data) {
    if (action === "submit") {
        const sid = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
        const body = JSON.stringify(Object.assign({ action: action, sid: sid }, data));
        const q = obRead();
        q.push({ sid: sid, body: body, t: Date.now() });
        if (obWrite(q)) { obFlush(); return { ok: true, queued: true }; }
        // penyimpanan browser tidak bisa dipakai: kirim langsung dengan coba ulang
        let err;
        for (let i = 0; i < 6; i++) {
            try {
                const r = await fetch(API_URL, { method: "POST", body: body, keepalive: body.length < 60000 });
                const j = await r.json();
                if (j && j.ok) return j;
            } catch (e) { err = e; }
            await new Promise(function (ok) { setTimeout(ok, 2000 * (i + 1)); });
        }
        throw err || new Error("submit gagal");
    }
    const r = await fetch(API_URL, { method: "POST", body: JSON.stringify(Object.assign({ action: action }, data)) });
    return r.json();
}

async function apiGet(action, params) {
    const r = await fetch(API_URL + "?" + new URLSearchParams(Object.assign({ action: action }, params)));
    return r.json();
}

// Kunci penyimpanan progress per murid (nama + kelas) di browser.
// kind: "Game" atau "Quiz<id>"
function progKey(lessonId, st, kind) {
    return "robotProg" + kind + "_" + lessonId + "|" + String((st && st.name) || "").trim().toLowerCase() + "|" + String((st && st.cls) || "").trim();
}

// Rencana kolom rekap per lesson: label unik tiap challenge + jumlah soal / level.
// Dipakai student.html (quiz) dan game.js (game) supaya nama kolom di Google Sheet sama.
function lessonPlan(L) {
    var chs = (L.challenges && L.challenges.length) ? L.challenges : [{ type: "game", title: "Game" }];
    var seen = {}, nl = Math.max(1, (L.levels || []).length);
    var b = Math.max(0, Math.min(nl - 1, Math.floor(+L.bonusLevels || 0)));
    return chs.map(function (c) {
        var base = String(c.title || (c.type === "game" ? "Game" : "Quiz")).replace(/\s*\|\s*/g, " / ").trim() || "Challenge";
        seen[base] = (seen[base] || 0) + 1;
        var label = seen[base] > 1 ? base + " (" + seen[base] + ")" : base;
        return c.type === "game" ? { label: label, type: "game", reg: nl - b, bonus: b } : { label: label, type: "quiz", n: (c.questions || []).length };
    });
}
