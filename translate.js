// Terjemahan otomatis English -> Indonesia (lewat Apps Script). Dipakai di challenges.html & admin-extra.js
// Aturan: kolom ID yang kosong akan diisi otomatis. Kalau guru mengetik/mengedit ID sendiri, tidak ditimpa.
// Kalau teks English diubah setelah diterjemahkan otomatis, terjemahan dibuat ulang.

function adminKey() {
    const k = sessionStorage.getItem("adminKey") || prompt("Masukkan kunci admin:");
    return k || null;
}

function _decode(s) { const t = document.createElement("textarea"); t.innerHTML = s; return t.value; }

function _bilingual(o, out) {
    if (!o || typeof o !== "object") return;
    if (Array.isArray(o)) { o.forEach(x => _bilingual(x, out)); return; }
    if (typeof o.en === "string" && typeof o.id === "string") out.push(o);
    Object.keys(o).forEach(k => { if (o[k] && typeof o[k] === "object") _bilingual(o[k], out); });
}

// Mengisi semua {en, id} yang id-nya kosong / basi. Return {done, failed}.
async function autoTranslate(lesson, key) {
    const all = []; _bilingual(lesson.challenges || [], all);
    const todo = all.filter(o => o.en.trim() && (!o.id.trim() || (o.auto && o.auto !== o.en)));
    if (!todo.length) return { done: 0, failed: 0 };
    // ___ (kotak isian dropdown) dilindungi supaya tidak rusak saat diterjemahkan
    const src = todo.map(o => { let n = 0; return o.en.replace(/___/g, () => "[" + (++n) + "]"); });
    let done = 0, failed = 0;
    const jobs = [];
    for (let i = 0; i < todo.length; i += 12) jobs.push(i);   // batch kecil dikirim PARALEL = jauh lebih cepat
    const results = await Promise.all(jobs.map(i => api("translate", { key: key, texts: src.slice(i, i + 12) })));
    results.forEach((r, j) => {
        const i = jobs[j];
        if (!r.ok || !Array.isArray(r.texts)) throw new Error(r.error || "Apps Script belum di-deploy ulang (aksi translate belum dikenali)");
        r.texts.forEach((t, k) => {
            const o = todo[i + k];
            t = _decode(t || "").replace(/\[\s*\d+\s*\]/g, "___");
            const want = (o.en.match(/___/g) || []).length, got = (t.match(/___/g) || []).length;
            if (!t.trim() || want !== got) { failed++; return; }
            if (o.list && t.split(",").length !== o.en.split(",").length) { failed++; return; }
            o.id = t; o.auto = o.en; done++;
        });
    });
    sessionStorage.setItem("adminKey", key);
    return { done: done, failed: failed };
}
