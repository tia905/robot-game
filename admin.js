const createLessonButton =
    document.getElementById("create-lesson-button");

const lessonModal =
    document.getElementById("lesson-modal");

const closeModalButton =
    document.getElementById("close-modal-button");

const cancelButton =
    document.getElementById("cancel-button");

const saveLessonButton =
    document.getElementById("save-lesson-button");

const lessonList =
    document.getElementById("lesson-list");

const lessonTitle =
    document.getElementById("lesson-title");

const lessonDescription =
    document.getElementById("lesson-description");

const lessonType =
    document.getElementById("lesson-type");

const lessonBackground =
    document.getElementById("lesson-background");

const lessonLevels =
    document.getElementById("lesson-levels");


// =====================================
// DELETE MODAL ELEMENTS
// =====================================

const deleteModal =
    document.getElementById("delete-modal");

const deleteMessage =
    document.getElementById("delete-message");

const closeDeleteModalButton =
    document.getElementById(
        "close-delete-modal-button"
    );

const cancelDeleteButton =
    document.getElementById(
        "cancel-delete-button"
    );

const confirmDeleteButton =
    document.getElementById(
        "confirm-delete-button"
    );

let lessonToDelete = null;


// =====================================
// LOAD LESSONS
// =====================================

let lessons =
    JSON.parse(
        localStorage.getItem("robotLessons")
    ) || [];


// =====================================
// CREATE UNIQUE ID
// =====================================

function createLessonId() {

    return (
        Math.random()
            .toString(36)
            .substring(2, 8)
    );

}


// =====================================
// GET LESSON TYPE LABEL
// =====================================

function getLessonTypeLabel(type) {

    const labels = {

        sequencing: "Sequencing",

        coordinates: "Coordinates",

        repetition: "Repetition",

        if: "If / Else"

    };

    return labels[type] || "Sequencing";

}


// =====================================
// GET BACKGROUND LABEL
// =====================================

function getBackgroundLabel(background) {

    const labels = {

        forest: "Forest",

        space: "Space",

        underwater: "Underwater",

        city: "City"

    };

    return labels[background] || "Forest";

}


// =====================================
// OPEN CREATE MODAL
// =====================================

function openModal() {

    lessonModal.classList.remove(
        "hidden"
    );


    lessonTitle.value = "";

    lessonDescription.value = "";

    lessonType.value =
        "sequencing";

    lessonBackground.value =
        "forest";

    lessonLevels.value = 8;


    lessonTitle.focus();

}


// =====================================
// CLOSE CREATE MODAL
// =====================================

function closeModal() {

    lessonModal.classList.add(
        "hidden"
    );

}


// =====================================
// CREATE LESSON
// =====================================

function createLesson() {

    const title =
        lessonTitle.value.trim();

    const description =
        lessonDescription.value.trim();

    const type =
        lessonType.value;

    const background =
        lessonBackground.value;

    const numberOfLevels =
        Number(
            lessonLevels.value
        );


    if (!title) {

        alert(
            "Please enter a lesson name."
        );

        return;

    }


    if (
        numberOfLevels < 1 ||
        numberOfLevels > 20
    ) {

        alert(
            "Number of levels must be between 1 and 20."
        );

        return;

    }


    const newLesson = {

        id:
            createLessonId(),

        title:
            title,

        description:
            description,

        type:
            type,

        background:
            background,

        status:
            "draft",

        numberOfLevels:
            numberOfLevels,

        levels:
            [],

        createdAt:
            new Date().toISOString()

    };


    lessons.push(
        newLesson
    );


    saveLessons();

    closeModal();

    renderLessons();

}


// =====================================
// SAVE LESSONS
// =====================================

function saveLessons() {

    localStorage.setItem(
        "robotLessons",
        JSON.stringify(lessons)
    );

}


// =====================================
// RENDER LESSONS
// =====================================

function renderLessons() {

    lessonList.innerHTML = "";


    if (lessons.length === 0) {

        lessonList.innerHTML = `

            <div class="empty-state">

                <h3>
                    No lessons yet
                </h3>

                <p>
                    Create your first lesson to get started.
                </p>

            </div>

        `;

        return;

    }


    lessons.forEach(
        (lesson) => {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "lesson-card";


            const statusClass =
                lesson.status ===
                "published"

                    ? "published"
                    : "draft";


            const statusText =
                lesson.status ===
                "published"

                    ? "Published"
                    : "Draft";


            const type =
                lesson.type ||
                "sequencing";


            const background =
                lesson.background ||
                "forest";


            card.innerHTML = `

                <div class="lesson-info">

                    <h3>
                        ${lesson.title}
                    </h3>

                    <p>
                        ${
                            lesson.description ||
                            "No description"
                        }
                    </p>

                    <div class="lesson-meta">

                        <span
                            class="badge ${statusClass}"
                        >
                            ${statusText}
                        </span>

                        <span>
                            ${getLessonTypeLabel(type)}
                        </span>

                        <span>
                            ${getBackgroundLabel(background)}
                        </span>

                        <span>
                            ${lesson.numberOfLevels}
                            levels
                        </span>

                    </div>

                </div>


                <div class="lesson-actions">

                    <button
                        class="small-button edit-button"
                        data-id="${lesson.id}"
                    >
                        EDIT
                    </button>


                    <button
                        class="small-button game-button"
                        data-id="${lesson.id}"
                    >
                        OPEN GAME
                    </button>


                    <button
                        class="small-button copy-button"
                        data-id="${lesson.id}"
                    >
                        COPY
                    </button>


                    <button
                        class="small-button delete-button"
                        data-id="${lesson.id}"
                    >
                        DELETE
                    </button>

                </div>

            `;


            lessonList.appendChild(
                card
            );

        }
    );

}


// =====================================
// EDIT LESSON
// =====================================

function editLesson(id) {

    const lesson =
        lessons.find(
            item =>
                item.id === id
        );


    if (!lesson) {

        alert(
            "Lesson not found."
        );

        return;

    }


    const editorUrl =
        "leveleditor.html?lesson=" +
        encodeURIComponent(
            lesson.id
        );


    window.location.href =
        editorUrl;

}


// =====================================
// OPEN STUDENT GAME
// =====================================

function openStudentGame(id) {

    const lesson =
        lessons.find(
            item =>
                item.id === id
        );


    if (!lesson) {

        alert(
            "Lesson not found."
        );

        return;

    }


    const gameUrl =
        "index.html?lesson=" +
        encodeURIComponent(
            lesson.id
        );


    window.location.href =
        gameUrl;

}


// =====================================
// COPY LESSON
// =====================================

function copyLesson(id) {

    const original =
        lessons.find(
            item =>
                item.id === id
        );


    if (!original) {

        alert(
            "Lesson not found."
        );

        return;

    }


    const copiedLesson = {

        ...original,

        id:
            createLessonId(),

        title:
            original.title +
            " - Copy",

        status:
            "draft",

        createdAt:
            new Date().toISOString(),

        levels:
            JSON.parse(
                JSON.stringify(
                    original.levels || []
                )
            )

    };


    lessons.push(
        copiedLesson
    );


    saveLessons();

    renderLessons();

}


// =====================================
// OPEN DELETE MODAL
// =====================================

function deleteLesson(id) {

    const lesson =
        lessons.find(
            item =>
                item.id === id
        );


    if (!lesson) {

        alert(
            "Lesson not found."
        );

        return;

    }


    lessonToDelete = id;


    deleteMessage.textContent =
        `Are you sure you want to delete "${lesson.title}"?`;


    deleteModal.classList.remove(
        "hidden"
    );

}


// =====================================
// CLOSE DELETE MODAL
// =====================================

function closeDeleteModal() {

    deleteModal.classList.add(
        "hidden"
    );

    lessonToDelete = null;

}


// =====================================
// CONFIRM DELETE
// =====================================

function confirmDeleteLesson() {

    if (!lessonToDelete) {

        return;

    }


    lessons =
        lessons.filter(
            item =>
                item.id !== lessonToDelete
        );


    saveLessons();

    renderLessons();

    closeDeleteModal();

}


// =====================================
// CREATE LESSON BUTTON EVENTS
// =====================================

createLessonButton.addEventListener(
    "click",
    openModal
);


closeModalButton.addEventListener(
    "click",
    closeModal
);


cancelButton.addEventListener(
    "click",
    closeModal
);


saveLessonButton.addEventListener(
    "click",
    createLesson
);


// =====================================
// LESSON LIST BUTTON EVENTS
// =====================================

lessonList.addEventListener(
    "click",
    function(event) {

        const editButton =
            event.target.closest(
                ".edit-button"
            );


        if (editButton) {

            const id =
                editButton.dataset.id;

            editLesson(id);

            return;

        }


        const gameButton =
            event.target.closest(
                ".game-button"
            );


        if (gameButton) {

            const id =
                gameButton.dataset.id;

            openStudentGame(id);

            return;

        }


        const copyButton =
            event.target.closest(
                ".copy-button"
            );


        if (copyButton) {

            const id =
                copyButton.dataset.id;

            copyLesson(id);

            return;

        }


        const deleteButton =
            event.target.closest(
                ".delete-button"
            );


        if (deleteButton) {

            const id =
                deleteButton.dataset.id;

            deleteLesson(id);

            return;

        }

    }
);


// =====================================
// CLOSE CREATE MODAL BY CLICKING OUTSIDE
// =====================================

lessonModal.addEventListener(
    "click",
    function(event) {

        if (
            event.target ===
            lessonModal
        ) {

            closeModal();

        }

    }
);


// =====================================
// DELETE MODAL EVENTS
// =====================================

closeDeleteModalButton.addEventListener(
    "click",
    closeDeleteModal
);


cancelDeleteButton.addEventListener(
    "click",
    closeDeleteModal
);


confirmDeleteButton.addEventListener(
    "click",
    confirmDeleteLesson
);


deleteModal.addEventListener(
    "click",
    function(event) {

        if (
            event.target ===
            deleteModal
        ) {

            closeDeleteModal();

        }

    }
);


// =====================================
// INITIAL LOAD
// =====================================

renderLessons();