// ISI DUA BARIS INI SETELAH DEPLOY APPS SCRIPT (lihat apps-script/Code.gs)
const API_URL = "https://script.google.com/macros/s/AKfycbxLjKQYA-EKPJV2LGnPg1SWFm1hRieE8h6IbBQY8V7R3v9ZxxkyhgFmhlND0pnJdfLy/exec";
const SHEET_URL = "https://docs.google.com/spreadsheets/d/14cX5ApZxgmDHWYca7CIxRctj7Sf4FRCmkHS0Jt9COks/edit?usp=sharing";

async function api(action, data) {
    const r = await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify(Object.assign({ action: action }, data))
    });
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
