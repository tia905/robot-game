// ISI DUA BARIS INI SETELAH DEPLOY APPS SCRIPT (lihat apps-script/Code.gs)
const API_URL = "https://script.google.com/macros/s/AKfycbxF2UQSaXxFy1U0AVTmbDTxXMG4kSV8K6I6o8HMPJ4VZpJweWcz3PML5In1iBftCvzE/exec";
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
