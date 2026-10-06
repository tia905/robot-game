// Tambahan admin: Challenges, Publish (ke Google Sheet), Results
const _renderLessons = renderLessons;
renderLessons = function () {
    _renderLessons();
    document.querySelectorAll(".lesson-card").forEach((card, i) => {
        const l = lessons[i];
        if (!l) return;
        if (l.status === "published") {
            const u = new URL("student.html?lesson=" + encodeURIComponent(l.id), location.href).href;
            card.querySelector(".lesson-info").insertAdjacentHTML("beforeend",
                `<div class="share"><b>🔗 Link murid:</b><input readonly value="${u}" onclick="this.select()"><button class="small-button x-copy" data-u="${u}">COPY LINK</button></div>`);
        }
        card.querySelector(".lesson-actions").insertAdjacentHTML("beforeend",
            `<button class="small-button x-ch" data-i="${i}">CHALLENGES</button>` +
            `<button class="small-button x-pub" data-i="${i}">${l.status === "published" ? "RE-PUBLISH" : "PUBLISH"}</button>` +
            `<button class="small-button x-res" data-i="${i}">RESULTS</button>`);
    });
};

lessonList.addEventListener("click", e => {
    const b = e.target.closest("[data-i]");
    if (!b) return;
    const l = lessons[b.dataset.i];
    if (b.classList.contains("x-res")) location.href = "results.html?lesson=" + encodeURIComponent(l.id);
    if (b.classList.contains("x-ch")) location.href = "challenges.html?lesson=" + encodeURIComponent(l.id);
    if (b.classList.contains("x-pub")) publish(l);
});

async function publish(l) {
    const key = sessionStorage.getItem("adminKey") || prompt("Masukkan kunci admin:");
    if (!key) return;
    const prev = l.status;
    if (!l.challenges || !l.challenges.length) l.challenges = [{ type: "game", title: "Game" }];
    l.status = "published";
    try {
        try { await autoTranslate(l, key); } catch (e) { console.warn("Auto-translate skipped:", e.message); }
        const r = await api("saveLesson", { key: key, lesson: l });
        if (!r.ok) throw new Error(r.error);
        sessionStorage.setItem("adminKey", key);
        saveLessons();
        renderLessons();
        alert("Berhasil dipublish! ✅ Link untuk murid ada di kartu lesson (tombol COPY LINK).");
    } catch (e) {
        l.status = prev;
        alert("Gagal publish: " + e.message);
    }
}

document.head.insertAdjacentHTML("beforeend", "<style>.share{margin-top:10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}.share input{flex:1;min-width:220px;padding:8px;border:2px solid #cfdcf3;border-radius:8px;font:inherit}</style>");
lessonList.addEventListener("click", e => {
    const b = e.target.closest(".x-copy"); if (!b) return;
    navigator.clipboard.writeText(b.dataset.u).then(() => { b.textContent = "✓ TERSALIN"; setTimeout(() => b.textContent = "COPY LINK", 1500); });
});
renderLessons();
