// Tambahan admin: Challenges, Publish (ke Google Sheet), Results
const _renderLessons = renderLessons;
renderLessons = function () {
    _renderLessons();
    document.querySelectorAll(".lesson-card").forEach((card, i) => {
        const l = lessons[i];
        if (!l) return;
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
    if (b.classList.contains("x-res")) window.open(SHEET_URL, "_blank");
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
