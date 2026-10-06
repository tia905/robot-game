// Tambahan admin: Exit Ticket, Publish (ke Google Sheet), Results
const _renderLessons = renderLessons;
renderLessons = function () {
    _renderLessons();
    document.querySelectorAll(".lesson-card").forEach((card, i) => {
        const l = lessons[i];
        if (!l) return;
        card.querySelector(".lesson-actions").insertAdjacentHTML("beforeend",
            `<button class="small-button x-exit" data-i="${i}">EXIT TICKET</button>` +
            `<button class="small-button x-pub" data-i="${i}">${l.status === "published" ? "RE-PUBLISH" : "PUBLISH"}</button>` +
            `<button class="small-button x-res" data-i="${i}">RESULTS</button>`);
    });
};

lessonList.addEventListener("click", e => {
    const b = e.target.closest("[data-i]");
    if (!b) return;
    const l = lessons[b.dataset.i];
    if (b.classList.contains("x-res")) window.open(SHEET_URL, "_blank");
    if (b.classList.contains("x-exit")) editExit(l);
    if (b.classList.contains("x-pub")) publish(l);
});

function editExit(l) {
    const old = (l.exitTicket || []).map(q => q.q + (q.options ? " | " + q.options.join(" ; ") : "")).join("\n");
    const m = document.createElement("div");
    m.className = "modal";
    m.innerHTML = `<div class="modal-box"><div class="modal-header"><h2>Exit Ticket</h2></div>
        <p>Satu baris = satu pertanyaan.<br>Pilihan ganda: <code>Pertanyaan | A ; B ; C</code><br>Tanpa tanda | = jawaban isian.</p>
        <textarea rows="8" style="width:100%;box-sizing:border-box"></textarea>
        <div class="modal-actions"><button class="secondary-button">Batal</button><button class="primary-button">Simpan</button></div></div>`;
    document.body.appendChild(m);
    const t = m.querySelector("textarea");
    t.value = old;
    m.querySelector(".secondary-button").onclick = () => m.remove();
    m.querySelector(".primary-button").onclick = () => {
        l.exitTicket = t.value.split("\n").map(s => s.trim()).filter(Boolean).map(s => {
            const p = s.split("|");
            const o = p[1] ? p[1].split(";").map(x => x.trim()).filter(Boolean) : [];
            return o.length ? { q: p[0].trim(), options: o } : { q: p[0].trim() };
        });
        saveLessons();
        m.remove();
        alert("Tersimpan. Klik PUBLISH supaya murid melihat perubahan.");
    };
}

async function publish(l) {
    const key = sessionStorage.getItem("adminKey") || prompt("Masukkan kunci admin:");
    if (!key) return;
    const prev = l.status;
    l.challenges = [{ type: "game" }].concat(l.exitTicket && l.exitTicket.length ? [{ type: "exit", questions: l.exitTicket }] : []);
    l.status = "published";
    try {
        const r = await api("saveLesson", { key: key, lesson: l });
        if (!r.ok) throw new Error(r.error);
        sessionStorage.setItem("adminKey", key);
        saveLessons();
        renderLessons();
        prompt("Berhasil dipublish! Salin link untuk murid:", new URL("student.html?lesson=" + encodeURIComponent(l.id), location.href).href);
    } catch (e) {
        l.status = prev;
        alert("Gagal publish: " + e.message);
    }
}

renderLessons();
