// ISI DUA BARIS INI SETELAH DEPLOY APPS SCRIPT (lihat apps-script/Code.gs)
const API_URL = "PASTE_URL_WEB_APP_DI_SINI";
const SHEET_URL = "PASTE_LINK_GOOGLE_SHEET_DI_SINI";

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
