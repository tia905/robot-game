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
