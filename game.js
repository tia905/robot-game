/* =========================================================
   BAHASA (murid): ikut pilihan tombol ID di halaman murid
========================================================= */
const isIndonesian =
    new URLSearchParams(window.location.search).get("student") === "1" &&
    localStorage.getItem("robotLang") === "id";

const ID_TEXT = {"Level Complete!":"Level Selesai!","Great job! You reached the goal.":"Kerja bagus! Kamu sampai di tujuan.","Bonus Level Complete! ⭐":"Level Bonus Selesai! ⭐","Amazing! You cleared a bonus level.":"Keren! Kamu menyelesaikan level bonus.","Great job! Bonus levels are now open ⭐":"Kerja bagus! Level bonus sudah terbuka ⭐","NEXT LEVEL":"LEVEL BERIKUTNYA","DONE":"SELESAI","BONUS LEVEL ⭐":"LEVEL BONUS ⭐","Oops!":"Ups!","There is no path there.":"Tidak ada jalan di sana.","The robot bumped into something.":"Robot menabrak sesuatu.","Try Again!":"Coba Lagi!","The robot did not complete the path.":"Robot belum menyelesaikan jalurnya.","Too Many Blocks":"Terlalu Banyak Blok","MOVE FORWARD":"MAJU","TURN LEFT":"BELOK KIRI","TURN RIGHT":"BELOK KANAN","REPEAT [ 2 ] TIMES":"ULANGI [ 2 ] KALI","REPEAT [ ] TIMES":"ULANGI [ ] KALI","BUILD A HOUSE":"BANGUN RUMAH","BUILD A SCHOOL":"BANGUN SEKOLAH","BUILD A GARDEN":"BANGUN TAMAN","GO TO X [ ] Y [ ]":"PERGI KE X [ ] Y [ ]","PICK UP CARGO":"AMBIL BARANG","PUT DOWN CARGO":"LETAKKAN BARANG","IF / ELSE":"JIKA / MAKA","CARGO COLOR":"WARNA BARANG","REPEAT":"ULANGI","TIMES":"KALI","Drop blocks here":"Lepas blok di sini","Drag blocks here":"Seret blok ke sini"};

function tt(text) {
    return isIndonesian && ID_TEXT[text] ? ID_TEXT[text] : text;
}

/* =========================================================
   ELEMENTS
========================================================= */

const robot =
    document.getElementById("robot");

const runButton =
    document.getElementById("run-button");

const resetButton =
    document.getElementById("reset-button");

const program =
    document.getElementById("program");

const blocksArea =
    document.getElementById("blocks-area");

const blockCounter =
    document.getElementById("block-counter");

const goal =
    document.getElementById("goal");

const map =
    document.getElementById("map");

const gameMessage =
    document.getElementById("game-message");

const messageTitle =
    document.getElementById("message-title");

const messageText =
    document.getElementById("message-text");

const nextLevelButton =
    document.getElementById("next-level-button");

const closeMessageButton =
    document.getElementById("close-message-button");

const levelsContainer =
    document.getElementById("levels");


/* =========================================================
   GAME SETTINGS
========================================================= */

const DEFAULT_GRID_SIZE = 8;

let gridSize = 50;

let mapColumns =
    DEFAULT_GRID_SIZE;

let mapRows =
    DEFAULT_GRID_SIZE;


/* =========================================================
   COORDINATE MAP
========================================================= */

const coordinateValues = [
    -14,
    -12,
    -10,
    -8,
    -6,
    -4,
    -2,
    0,
    2,
    4,
    6,
    8,
    10,
    12,
    14
];

const coordinateImage =
    "assets/koordinat.png";


const COORDINATE_X_POSITIONS = [
    15.12,
    19.87,
    24.77,
    29.52,
    34.41,
    39.24,
    44.06,
    49.60,
    56.01,
    60.84,
    65.66,
    70.27,
    75.02,
    79.84,
    84.66
];


const COORDINATE_Y_POSITIONS = [
    89.66,
    84.10,
    78.36,
    72.79,
    67.05,
    61.40,
    55.74,
    49.03,
    44.26,
    38.60,
    32.95,
    27.30,
    21.64,
    16.08,
    10.42
];


/*
    0 = RIGHT
    1 = DOWN
    2 = LEFT
    3 = UP
*/

const robotImages = [
    "assets/kanan.png",
    "assets/depan.png",
    "assets/kiri.png",
    "assets/belakang.png"
];


/* =========================================================
   LOAD SELECTED LESSON
========================================================= */

const urlParams =
    new URLSearchParams(
        window.location.search
    );

const lessonId =
    urlParams.get("lesson");

const isStudentMode = urlParams.get("student") === "1";
const storedLessons = isStudentMode
    ? [JSON.parse(sessionStorage.getItem("robotStudentLesson") || localStorage.getItem("lesson_" + lessonId) || "null")].filter(Boolean)
    : JSON.parse(localStorage.getItem("robotLessons")) || [];

const selectedLesson =
    storedLessons.find(
        function(item) {

            return (
                String(item.id) ===
                String(lessonId)
            );

        }
    );


if (!selectedLesson) {

    alert("Lesson not found.");
    window.location.href = isStudentMode ? "student.html?lesson=" + encodeURIComponent(lessonId) : "admin.html";
}


const isCoordinateLesson =
    Boolean(
        selectedLesson &&
        selectedLesson.type ===
            "coordinates"
    );


/* =========================================================
   BLOCK LABELS
========================================================= */

const blockLabels = {

    forward:
        tt("MOVE FORWARD"),

    left:
        tt("TURN LEFT"),

    right:
        tt("TURN RIGHT"),

    repeat:
        tt("REPEAT [ ] TIMES"),

    buildHouse:
        tt("BUILD A HOUSE"),

    buildSchool:
        tt("BUILD A SCHOOL"),

    buildGarden:
        tt("BUILD A GARDEN"),

    goto:
        tt("GO TO X [ ] Y [ ]"),

    pickup:
        tt("PICK UP CARGO"),

    putdown:
        tt("PUT DOWN CARGO"),

    if:
        tt("IF / ELSE"),

    cargoColor:
        tt("CARGO COLOR")

};


/* =========================================================
   DEFAULT LEVEL
========================================================= */

let levels = [

    {
        level: 1,

        title: "Robot Basics",

        gridSize: 8,

        start: {
            x: 1,
            y: 3,
            direction: 0
        },

        goal: {
            x: 6,
            y: 3
        },

        path: [
            "1,3",
            "2,3",
            "3,3",
            "4,3",
            "5,3",
            "6,3"
        ],

        blocked: [],

        availableBlocks: [
            "forward",
            "left",
            "right"
        ],

        maxBlocks: null,

        buildingTargets: {
            house: [],
            school: [],
            garden: []
        }

    }

];


/* =========================================================
   CELL NORMALIZATION
========================================================= */

function normalizeCell(cell) {

    if (typeof cell === "string") {

        const parts =
            cell.split(",");

        if (parts.length < 2) {

            return null;

        }

        const x =
            Number(parts[0]);

        const y =
            Number(parts[1]);

        if (
            !Number.isFinite(x) ||
            !Number.isFinite(y)
        ) {

            return null;

        }

        return {
            x: x,
            y: y
        };

    }


    if (
        cell &&
        typeof cell === "object"
    ) {

        const x =
            Number(cell.x);

        const y =
            Number(cell.y);

        if (
            !Number.isFinite(x) ||
            !Number.isFinite(y)
        ) {

            return null;

        }

        return {
            x: x,
            y: y
        };

    }


    return null;

}


function normalizeCells(cells) {

    if (!Array.isArray(cells)) {

        return [];

    }

    return cells
        .map(normalizeCell)
        .filter(Boolean);

}


/* =========================================================
   BUILDING TARGETS
========================================================= */

function normalizeBuildingTargets(
    buildingTargets
) {

    const source =
        buildingTargets &&
        typeof buildingTargets === "object"
            ? buildingTargets
            : {};


    return {

        house:
            normalizeCells(
                source.house
            ),

        school:
            normalizeCells(
                source.school
            ),

        garden:
            normalizeCells(
                source.garden
            )

    };

}


/* =========================================================
   NORMALIZE EDITOR LEVELS
========================================================= */

function normalizeEditorLevels() {

    if (
        !selectedLesson ||
        !Array.isArray(
            selectedLesson.levels
        )
    ) {

        return;

    }


    if (
        selectedLesson.levels.length === 0
    ) {

        return;

    }


    levels =
        selectedLesson.levels.map(
            function(editorLevel, index) {

                const rawGridSize =
                    Number(
                        editorLevel.gridSize
                    );


                const levelGridSize =
                    isCoordinateLesson
                        ? 15
                        : (
                            Number.isFinite(
                                rawGridSize
                            ) &&
                            rawGridSize >= 2
                                ? Math.floor(
                                    rawGridSize
                                )
                                : DEFAULT_GRID_SIZE
                        );


                let start = null;


                if (
                    editorLevel.start &&
                    typeof editorLevel.start ===
                        "object"
                ) {

                    const startX =
                        Number(
                            editorLevel.start.x
                        );

                    const startY =
                        Number(
                            editorLevel.start.y
                        );

                    const startDirection =
                        Number(
                            editorLevel.start.direction
                        );


                    if (
                        Number.isFinite(startX) &&
                        Number.isFinite(startY)
                    ) {

                        start = {

                            x:
                                startX,

                            y:
                                startY,

                            direction:
                                Number.isFinite(
                                    startDirection
                                )
                                    ? startDirection
                                    : 0

                        };

                    }

                }


                let goalData = null;


                if (
                    editorLevel.goal &&
                    typeof editorLevel.goal ===
                        "object"
                ) {

                    const goalX =
                        Number(
                            editorLevel.goal.x
                        );

                    const goalY =
                        Number(
                            editorLevel.goal.y
                        );


                    if (
                        Number.isFinite(goalX) &&
                        Number.isFinite(goalY)
                    ) {

                        goalData = {

                            x:
                                goalX,

                            y:
                                goalY

                        };

                    }

                }


                const availableBlocks =
                    Array.isArray(
                        editorLevel.availableBlocks
                    )
                        ? [
                            ...editorLevel.availableBlocks
                        ]
                        : [
                            "forward",
                            "left",
                            "right"
                        ];


                let maxBlocks = null;


                if (
                    editorLevel.maxBlocks !== null &&
                    editorLevel.maxBlocks !== undefined &&
                    editorLevel.maxBlocks !== ""
                ) {

                    const numericMax =
                        Number(
                            editorLevel.maxBlocks
                        );


                    if (
                        Number.isFinite(
                            numericMax
                        ) &&
                        numericMax >= 1
                    ) {

                        maxBlocks =
                            Math.min(
                                50,
                                Math.floor(
                                    numericMax
                                )
                            );

                    }

                }


                return {

                    level:
                        Number(
                            editorLevel.level
                        ) ||
                        index + 1,

                    title:
                        editorLevel.title ||
                        `Level ${index + 1}`,

                    gridSize:
                        levelGridSize,

                    start:
                        start,

                    goal:
                        goalData,

                    path:
                        normalizeCells(
                            editorLevel.path
                        ),

                    blocked:
                        normalizeCells(
                            editorLevel.blocked
                        ),

                    availableBlocks:
                        availableBlocks,

                    maxBlocks:
                        maxBlocks,

                    buildingTargets:
                        normalizeBuildingTargets(
                            editorLevel.buildingTargets
                        )

                };

            }
        );


    if (isCoordinateLesson) {

        mapColumns = 15;

        mapRows = 15;

    }

}


normalizeEditorLevels();


/* =========================================================
   BONUS LEVELS
   Admin mengatur jumlah level bonus (level paling akhir)
   lewat Level Editor -> lesson.bonusLevels.
   Level bonus ditandai bintang dan tidak wajib untuk
   menyelesaikan game.
========================================================= */

const bonusCount =
    Math.max(
        0,
        Math.min(
            levels.length - 1,
            Math.floor(
                Number(
                    selectedLesson &&
                    selectedLesson.bonusLevels
                ) || 0
            )
        )
    );

const regularCount =
    levels.length - bonusCount;

levels.forEach(
    function(level, index) {

        level.bonus =
            index >= regularCount;

    }
);


/* =========================================================
   GAME STATE
========================================================= */

let currentLevel = 1;

let completedLevels = [];

let robotX = 0;

let robotY = 0;

let direction = 0;

let isRunning = false;

let levelCompleted = false;

let hasCollided = false;

let draggedProgramBlock = null;
let dragDropHandled = false;

/* sisipkan node di posisi sesuai kursor (atas/bawah blok yg sudah ada) */
function placeAt(container, node, clientY) {
    const kids = Array.from(container.children).filter(function (el) {
        return el !== node && (el.classList.contains("block") || el.classList.contains("repeat-block"));
    });
    let before = null;
    for (let i = 0; i < kids.length; i++) {
        const r = kids[i].getBoundingClientRect();
        if (clientY < r.top + r.height / 2) { before = kids[i]; break; }
    }
    if (before) container.insertBefore(node, before);
    else container.appendChild(node);
}

let draggedStack = [];
let dragGrab = { x: 0, y: 0 };

function blockSiblings(parent) {
    return Array.from(parent.children).filter(function (el) {
        return el.classList.contains("block") || el.classList.contains("repeat-block");
    });
}

/* angkat blok yg di-drag + semua blok di bawahnya (satu tumpukan) */
function setDragged(block, event) {
    draggedProgramBlock = block;
    const sib = blockSiblings(block.parentElement);
    draggedStack = sib.slice(sib.indexOf(block));
    const r = block.getBoundingClientRect();
    dragGrab = { x: event.clientX - r.left, y: event.clientY - r.top };
    dragDropHandled = false;
    draggedStack.forEach(function (n) { n.classList.add("dragging"); });
}

function insertStack(container, nodes, clientY) {
    const kids = blockSiblings(container).filter(function (n) { return nodes.indexOf(n) < 0; });
    let before = null;
    for (let i = 0; i < kids.length; i++) {
        const r = kids[i].getBoundingClientRect();
        if (clientY < r.top + r.height / 2) { before = kids[i]; break; }
    }
    nodes.forEach(function (n) {
        if (before) container.insertBefore(n, before);
        else container.appendChild(n);
    });
}

/* taruh tumpukan blok sementara di area kosong (tidak ikut dijalankan) */
function parkStack(nodes, event) {
    const pr = program.getBoundingClientRect();
    const st = document.createElement("div");
    st.className = "parked-stack";
    st.style.left = Math.max(4, event.clientX - pr.left - dragGrab.x) + "px";
    st.style.top = Math.max(4, event.clientY - pr.top - dragGrab.y) + "px";
    program.appendChild(st);
    nodes.forEach(function (n) { st.appendChild(n); });
}

function cleanupParked() {
    Array.from(program.querySelectorAll(":scope > .parked-stack")).forEach(function (st) {
        if (!st.querySelector(".block, .repeat-block")) st.remove();
    });
}

function finishProgramDrag() {
    Array.from(program.querySelectorAll(".dragging")).forEach(function (e) { e.classList.remove("dragging"); });
    draggedProgramBlock = null;
    draggedStack = [];
    dragDropHandled = false;
    cleanupParked();
    updateRepeatPlaceholder();
    showEmptyText();
    updateBlockCounter();
    schedulePersist();
}

let savedPrograms = {};
let savedParked = {};


/* =========================================================
   SAVE / RESTORE PROGRESS (mode murid)
   Kode blok, level yang sudah selesai, dan level yang sedang
   dibuka disimpan di browser per murid (nama + kelas), jadi
   tidak hilang saat murid kembali ke halaman utama / ke quiz.
========================================================= */

const studentInfo =
    isStudentMode
        ? JSON.parse(localStorage.getItem("robotStudent") || sessionStorage.getItem("robotStudent") || "null")
        : null;

const progressKey =
    studentInfo && studentInfo.name
        ? progKey(lessonId, studentInfo, "Game")
        : null;

let suspendSave = true;

let persistTimer = null;


function persistProgress() {

    if (!progressKey || suspendSave) {

        return;

    }

    try {

        saveCurrentProgram();

        localStorage.setItem(
            progressKey,
            JSON.stringify({
                completed: completedLevels,
                programs: savedPrograms,
                parked: savedParked,
                current: currentLevel,
                t: Date.now()
            })
        );

    } catch (error) {}

}


function schedulePersist() {

    if (!progressKey) {

        return;

    }

    clearTimeout(persistTimer);

    persistTimer = setTimeout(
        persistProgress,
        250
    );

}


if (progressKey) {

    try {

        const saved =
            JSON.parse(
                localStorage.getItem(progressKey) || "null"
            );

        if (saved) {

            const validNumbers =
                levels.map(
                    function(level) {

                        return Number(level.level);

                    }
                );

            completedLevels =
                (saved.completed || [])
                    .map(Number)
                    .filter(
                        function(n) {

                            return validNumbers.includes(n);

                        }
                    );

            savedPrograms =
                saved.programs || {};

            savedParked =
                saved.parked || {};

            const savedCurrent =
                Number(saved.current);

            const unlocked =
                savedCurrent === 1 ||
                completedLevels.includes(savedCurrent) ||
                completedLevels.includes(savedCurrent - 1);

            if (
                validNumbers.includes(savedCurrent) &&
                unlocked
            ) {

                currentLevel =
                    savedCurrent;

            }

        }

    } catch (error) {}

}


/* =========================================================
   GET CURRENT LEVEL
========================================================= */

function getCurrentLevel() {

    return levels.find(
        function(level) {

            return (
                Number(level.level) ===
                Number(currentLevel)
            );

        }
    );

}


/* =========================================================
   CHECK CELL
========================================================= */

function hasCell(
    cells,
    x,
    y
) {

    if (
        !Array.isArray(cells)
    ) {

        return false;

    }


    return cells.some(
        function(cell) {

            const normalized =
                normalizeCell(cell);


            if (!normalized) {

                return false;

            }


            return (
                Number(normalized.x) ===
                    Number(x) &&
                Number(normalized.y) ===
                    Number(y)
            );

        }
    );

}


/* =========================================================
   GRID SIZE
========================================================= */

function updateGridSizeFromLevel() {

    if (isCoordinateLesson) {

        mapColumns = 15;

        mapRows = 15;

        return;

    }


    const level =
        getCurrentLevel();


    if (!level) {

        return;

    }


    const size =
        Number(
            level.gridSize
        );


    if (
        Number.isFinite(size) &&
        size >= 2
    ) {

        mapColumns =
            Math.floor(size);

        mapRows =
            Math.floor(size);

    }

}


/* =========================================================
   MAP POSITION HELPER
========================================================= */

function getMapPositionInBoard() {

    const gameBoard =
        document.getElementById(
            "game-board"
        );


    if (
        !gameBoard ||
        !map
    ) {

        return {
            left: 0,
            top: 0
        };

    }


    const boardRect =
        gameBoard.getBoundingClientRect();


    const mapRect =
        map.getBoundingClientRect();


    return {

        left:
            mapRect.left -
            boardRect.left,

        top:
            mapRect.top -
            boardRect.top

    };

}


/* =========================================================
   CREATE MAP
========================================================= */

function createMap() {

    const level =
        getCurrentLevel();


    if (
        !level ||
        !map
    ) {

        return;

    }


    updateGridSizeFromLevel();


    map.innerHTML = "";


    /* =====================================================
       COORDINATE MAP
    ===================================================== */

    if (isCoordinateLesson) {

        map.className =
            "coordinate-game-map";


        map.style.display =
            "block";

        map.style.position =
            "absolute";

        map.style.left =
            "50%";

        map.style.top =
            "50%";

        map.style.transform =
            "translate(-50%, -50%)";

        map.style.margin =
            "0";

        map.style.width =
            "min(520px, 90%)";

        map.style.height =
            "auto";

        map.style.aspectRatio =
            "1389 / 1132";

        map.style.backgroundImage =
            `url("${coordinateImage}")`;

        map.style.backgroundSize =
            "100% 100%";

        map.style.backgroundPosition =
            "center";

        map.style.backgroundRepeat =
            "no-repeat";

        map.style.overflow =
            "hidden";

        map.style.zIndex =
            "5";

        return;

    }


    /* =====================================================
       NORMAL MAP
    ===================================================== */

    map.className =
        "map";

    map.style.display =
        "block";

    map.style.position =
        "absolute";

    map.style.left =
        "50%";

    map.style.top =
        "50%";

    map.style.transform =
        "translate(-50%, -50%)";

    map.style.margin =
        "0";

    map.style.width =
        `${mapColumns * gridSize}px`;

    map.style.height =
        `${mapRows * gridSize}px`;

    map.style.aspectRatio =
        "1 / 1";

    map.style.background =
        "transparent";

    map.style.overflow =
        "visible";

    map.style.zIndex =
        "5";


    /* =====================================================
       CREATE CELLS
    ===================================================== */

    for (
        let y = 0;
        y < mapRows;
        y++
    ) {

        for (
            let x = 0;
            x < mapColumns;
            x++
        ) {

            const cell =
                document.createElement(
                    "div"
                );


            cell.className =
                "map-cell";

            cell.style.position =
                "absolute";

            cell.style.left =
                `${x * gridSize}px`;

            cell.style.top =
                `${y * gridSize}px`;

            cell.style.width =
                `${gridSize}px`;

            cell.style.height =
                `${gridSize}px`;

            cell.style.boxSizing =
                "border-box";

            cell.style.zIndex =
                "6";


            const isPath =
                hasCell(
                    level.path,
                    x,
                    y
                );


            const isBlocked =
                hasCell(
                    level.blocked,
                    x,
                    y
                );


            cell.style.setProperty(
                "background",
                "transparent",
                "important"
            );

            cell.style.opacity =
                "1";

            cell.style.boxShadow =
                "none";


            if (isPath) {

                cell.classList.add(
                    "path"
                );

                cell.style.setProperty(
                    "background",
                    "#F4B04D",
                    "important"
                );

                cell.style.setProperty(
                    "background-color",
                    "#F4B04D",
                    "important"
                );

                cell.style.setProperty(
                    "background-image",
                    "none",
                    "important"
                );

                cell.style.setProperty(
                    "opacity",
                    "1",
                    "important"
                );

                cell.style.setProperty(
                    "box-shadow",
                    "inset 0 0 0 1px rgba(190, 125, 35, 0.45)",
                    "important"
                );

            }


            if (isBlocked) {

                cell.classList.add(
                    "blocked"
                );

                cell.style.setProperty(
                    "background",
                    "rgba(45, 55, 45, 0.78)",
                    "important"
                );

                cell.style.setProperty(
                    "background-color",
                    "rgba(45, 55, 45, 0.78)",
                    "important"
                );

                cell.style.setProperty(
                    "background-image",
                    "none",
                    "important"
                );

                cell.style.setProperty(
                    "opacity",
                    "1",
                    "important"
                );

                cell.style.setProperty(
                    "box-shadow",
                    "inset 0 0 0 1px rgba(30, 40, 30, 0.35)",
                    "important"
                );

            }


            map.appendChild(
                cell
            );

        }

    }


    renderBuildingTargets(
        level
    );

}


/* =========================================================
   BUILDING TARGETS
========================================================= */

function renderBuildingTargets(
    level
) {

    if (
        !level ||
        isCoordinateLesson
    ) {

        return;

    }


    if (
        !level.buildingTargets
    ) {

        return;

    }


    const types = [
        "house",
        "school",
        "garden"
    ];


    types.forEach(
        function(type) {

            const cells =
                normalizeCells(
                    level.buildingTargets[type]
                );


            cells.forEach(
                function(cellData) {

                    const x =
                        Number(
                            cellData.x
                        );

                    const y =
                        Number(
                            cellData.y
                        );


                    if (
                        x < 0 ||
                        y < 0 ||
                        x >= mapColumns ||
                        y >= mapRows
                    ) {

                        return;

                    }


                    const shadow =
                        document.createElement(
                            "div"
                        );


                    shadow.className =
                        `building-target building-target-${type}`;


                    /*
                        Simpan informasi target
                        agar BUILD block tahu
                        target mana yang sedang
                        ditempati robot.
                    */

                    shadow.dataset.type =
                        type;

                    shadow.dataset.x =
                        x;

                    shadow.dataset.y =
                        y;

                    shadow.dataset.built =
                        "false";


                    shadow.style.position =
                        "absolute";

                    shadow.style.left =
                        `${x * gridSize + 4}px`;

                    shadow.style.top =
                        `${y * gridSize + 4}px`;

                    shadow.style.width =
                        `${gridSize - 8}px`;

                    shadow.style.height =
                        `${gridSize - 8}px`;

                    shadow.style.boxSizing =
                        "border-box";

                    shadow.style.display =
                        "flex";

                    shadow.style.alignItems =
                        "center";

                    shadow.style.justifyContent =
                        "center";

                    shadow.style.pointerEvents =
                        "none";

                    shadow.style.zIndex =
                        "8";


                    shadow.style.border =
                        "2px dashed";

                    shadow.style.borderRadius =
                        "10px";

                    shadow.style.fontSize =
                        "31px";

                    shadow.style.fontWeight =
                        "600";

                    shadow.style.lineHeight =
                        "1";

                    shadow.style.opacity =
                        "0.55";


                    if (
                        type === "house"
                    ) {

                        shadow.textContent =
                            "⌂";

                        shadow.style.background =
                            "rgba(190, 160, 120, 0.18)";

                        shadow.style.borderColor =
                            "rgba(150, 115, 75, 0.65)";

                        shadow.style.color =
                            "rgba(120, 90, 55, 0.75)";

                    }

                    else if (
                        type === "school"
                    ) {

                        shadow.textContent =
                            "▦";

                        shadow.style.background =
                            "rgba(120, 150, 180, 0.18)";

                        shadow.style.borderColor =
                            "rgba(80, 115, 150, 0.65)";

                        shadow.style.color =
                            "rgba(65, 95, 125, 0.75)";

                    }

                    else if (
                        type === "garden"
                    ) {

                        shadow.textContent =
                            "✿";

                        shadow.style.background =
                            "rgba(110, 160, 110, 0.18)";

                        shadow.style.borderColor =
                            "rgba(75, 125, 75, 0.65)";

                        shadow.style.color =
                            "rgba(65, 105, 65, 0.75)";

                    }


                    map.appendChild(
                        shadow
                    );

                }
            );

        }
    );

}


/* =========================================================
   BUILDING ACTION
========================================================= */

const buildingImages = {

    house:
        "assets/house.png",

    school:
        "assets/school.png",

    garden:
        "assets/garden.png"

};


async function buildBuilding(
    command
) {

    const buildingTypeMap = {

        buildHouse:
            "house",

        buildSchool:
            "school",

        buildGarden:
            "garden"

    };


    const buildingType =
        buildingTypeMap[
            command
        ];


    if (!buildingType) {

        return true;

    }


    const targets =
        document.querySelectorAll(
            `.building-target-${buildingType}`
        );


    let target = null;


    targets.forEach(
        function(item) {

            if (target) {

                return;

            }


            const targetX =
                Number(
                    item.dataset.x
                );


            const targetY =
                Number(
                    item.dataset.y
                );


            if (
                targetX ===
                    Number(robotX) &&
                targetY ===
                    Number(robotY)
            ) {

                target =
                    item;

            }

        }
    );


    /*
        Kalau robot tidak berada
        di target yang sesuai,
        block tidak membangun.
    */

    if (!target) {

        return true;

    }


    /*
        Kalau bangunan sudah dibuat,
        jangan membuatnya lagi.
    */

    if (
        target.dataset.built ===
        "true"
    ) {

        return true;

    }


    const image =
        document.createElement(
            "img"
        );


    image.src =
        buildingImages[
            buildingType
        ];


    image.alt =
        `${buildingType} building`;


    image.draggable =
        false;


    image.style.width =
        "82%";

    image.style.height =
        "82%";

    image.style.objectFit =
        "contain";

    image.style.display =
        "block";

    image.style.pointerEvents =
        "none";

    image.style.opacity =
        "0";

    image.style.transform =
        "scale(0.5)";

    image.style.transition =
        "opacity 0.25s ease, transform 0.3s ease";


    /*
        Hilangkan bayangan target.
    */

    target.textContent =
        "";

    target.style.background =
        "transparent";

    target.style.border =
        "none";

    target.style.opacity =
        "1";

    target.style.boxShadow =
        "none";

    target.dataset.built =
        "true";


    target.appendChild(
        image
    );


    /*
        Animasi bangunan muncul.
    */

    requestAnimationFrame(
        function() {

            image.style.opacity =
                "1";

            image.style.transform =
                "scale(1)";

        }
    );


    await wait(350);


    return true;

}


/* =========================================================
   UPDATE ROBOT
========================================================= */

function updateRobot() {

    if (
        !robot ||
        !map
    ) {

        return;

    }


    const mapPosition =
        getMapPositionInBoard();


    if (isCoordinateLesson) {

        const xIndex =
            coordinateValues.indexOf(
                Number(robotX)
            );


        const yIndex =
            coordinateValues.indexOf(
                Number(robotY)
            );


        if (
            xIndex === -1 ||
            yIndex === -1
        ) {

            robot.style.display =
                "none";

            return;

        }


        const xPercent =
            COORDINATE_X_POSITIONS[
                xIndex
            ];


        const yPercent =
            COORDINATE_Y_POSITIONS[
                yIndex
            ];


        robot.style.display =
            "block";

        robot.style.position =
            "absolute";

        robot.style.left =
            (
                mapPosition.left +
                (
                    xPercent / 100
                ) *
                map.offsetWidth
            ) + "px";

        robot.style.top =
            (
                mapPosition.top +
                (
                    yPercent / 100
                ) *
                map.offsetHeight
            ) + "px";

        robot.src =
            "assets/depan.png";

        robot.style.width =
            "34px";

        robot.style.height =
            "34px";

        robot.style.objectFit =
            "contain";

        robot.style.objectPosition =
            "center";

        robot.style.zIndex =
            "9";

        robot.style.pointerEvents =
            "none";

        robot.style.transform =
            "translate(-50%, -50%)";

        return;

    }


    robot.style.display =
        "block";

    robot.style.position =
        "absolute";

    robot.style.left =
        (
            mapPosition.left +
            robotX * gridSize +
            gridSize / 2
        ) + "px";

    robot.style.top =
        (
            mapPosition.top +
            robotY * gridSize +
            gridSize / 2
        ) + "px";

    robot.src =
        robotImages[
            direction
        ];

    robot.style.width =
        "34px";

    robot.style.height =
        "34px";

    robot.style.objectFit =
        "contain";

    robot.style.objectPosition =
        "center";

    robot.style.zIndex =
        "9";

    robot.style.pointerEvents =
        "none";

    robot.style.transform =
        "translate(-50%, -50%)";

}


/* =========================================================
   UPDATE GOAL
========================================================= */

function updateGoal() {

    const level =
        getCurrentLevel();


    if (
        !level ||
        !goal ||
        !level.goal
    ) {

        if (goal) {

            goal.style.display =
                "none";

        }

        return;

    }


    const mapPosition =
        getMapPositionInBoard();


    goal.style.display =
        "flex";

    goal.style.position =
        "absolute";

    goal.textContent =
        "★";

    goal.style.pointerEvents =
        "none";

    goal.style.zIndex =
        "7";

    goal.style.alignItems =
        "center";

    goal.style.justifyContent =
        "center";

    goal.style.transform =
        "translate(-50%, -50%)";


    if (isCoordinateLesson) {

        const goalXIndex =
            coordinateValues.indexOf(
                Number(level.goal.x)
            );


        const goalYIndex =
            coordinateValues.indexOf(
                Number(level.goal.y)
            );


        if (
            goalXIndex === -1 ||
            goalYIndex === -1
        ) {

            goal.style.display =
                "none";

            return;

        }


        const xPercent =
            COORDINATE_X_POSITIONS[
                goalXIndex
            ];


        const yPercent =
            COORDINATE_Y_POSITIONS[
                goalYIndex
            ];


        goal.style.left =
            (
                mapPosition.left +
                (
                    xPercent / 100
                ) *
                map.offsetWidth
            ) + "px";


        goal.style.top =
            (
                mapPosition.top +
                (
                    yPercent / 100
                ) *
                map.offsetHeight
            ) + "px";


        goal.style.fontSize =
            "26px";

        goal.style.lineHeight =
            "1";

        goal.style.width =
            "30px";

        goal.style.height =
            "30px";

        return;

    }


    const goalX =
        Number(level.goal.x);

    const goalY =
        Number(level.goal.y);


    if (
        !Number.isFinite(goalX) ||
        !Number.isFinite(goalY)
    ) {

        goal.style.display =
            "none";

        return;

    }


    goal.style.left =
        (
            mapPosition.left +
            goalX * gridSize +
            gridSize / 2
        ) + "px";

    goal.style.top =
        (
            mapPosition.top +
            goalY * gridSize +
            gridSize / 2
        ) + "px";

    goal.style.fontSize =
        "30px";

    goal.style.lineHeight =
        "1";

    goal.style.width =
        `${gridSize}px`;

    goal.style.height =
        `${gridSize}px`;

}


/* =========================================================
   CAN MOVE
========================================================= */

function canMoveTo(
    x,
    y
) {

    const level =
        getCurrentLevel();


    if (!level) {

        return false;

    }


    if (isCoordinateLesson) {

        if (
            !coordinateValues.includes(
                Number(x)
            )
        ) {

            return false;

        }


        if (
            !coordinateValues.includes(
                Number(y)
            )
        ) {

            return false;

        }


        const hasDefinedPath =
            Array.isArray(level.path) &&
            level.path.length > 0;


        if (
            hasDefinedPath &&
            !hasCell(
                level.path,
                x,
                y
            )
        ) {

            return false;

        }


        if (
            hasCell(
                level.blocked,
                x,
                y
            )
        ) {

            return false;

        }


        return true;

    }


    if (
        x < 0 ||
        y < 0 ||
        x >= mapColumns ||
        y >= mapRows
    ) {

        return false;

    }


    if (
        level.start &&
        Number(level.start.x) ===
            Number(x) &&
        Number(level.start.y) ===
            Number(y)
    ) {

        return true;

    }


    if (
        hasCell(
            level.blocked,
            x,
            y
        )
    ) {

        return false;

    }


    const hasDefinedPath =
        Array.isArray(level.path) &&
        level.path.length > 0;


    if (
        hasDefinedPath &&
        !hasCell(
            level.path,
            x,
            y
        )
    ) {

        return false;

    }


    return true;

}


/* =========================================================
   COLLISION EFFECT
========================================================= */

async function playCollisionEffect() {

    if (!robot) {

        return;

    }


    const bumpDistance =
        10;


    let x = 0;

    let y = 0;


    if (direction === 0) {

        x =
            bumpDistance;

    }

    else if (direction === 1) {

        y =
            bumpDistance;

    }

    else if (direction === 2) {

        x =
            -bumpDistance;

    }

    else if (direction === 3) {

        y =
            -bumpDistance;

    }


    robot.style.transition =
        "transform 0.12s ease";


    robot.style.transform =
        `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;


    await wait(120);


    robot.style.transform =
        "translate(-50%, -50%)";


    await wait(180);


    robot.style.transition =
        "";

}


/* =========================================================
   MOVE FORWARD
========================================================= */

async function moveForward() {

    let nextX =
        Number(robotX);

    let nextY =
        Number(robotY);


    const step =
        isCoordinateLesson
            ? 2
            : 1;


    if (direction === 0) {

        nextX += step;

    }

    else if (direction === 1) {

        nextY += step;

    }

    else if (direction === 2) {

        nextX -= step;

    }

    else if (direction === 3) {

        nextY -= step;

    }


    if (
        !canMoveTo(
            nextX,
            nextY
        )
    ) {

        hasCollided =
            true;

        await playCollisionEffect();

        return false;

    }


    robotX =
        nextX;

    robotY =
        nextY;


    updateRobot();


    await wait(STEP_DELAY);


    return true;

}


/* =========================================================
   TURN RIGHT
========================================================= */

async function turnRight() {

    direction++;


    if (
        direction > 3
    ) {

        direction =
            0;

    }


    updateRobot();


    await wait(STEP_DELAY);

}


/* =========================================================
   TURN LEFT
========================================================= */

async function turnLeft() {

    direction--;


    if (
        direction < 0
    ) {

        direction =
            3;

    }


    updateRobot();


    await wait(STEP_DELAY);

}


/* =========================================================
   MESSAGES
========================================================= */

function showBlockedMessage() {

    if (!gameMessage) {

        return;

    }


    messageTitle.textContent =
        tt("Oops!");

    messageText.textContent =
        tt("There is no path there.");

    nextLevelButton.style.display =
        "none";

    gameMessage.classList.remove(
        "hidden"
    );


    setTimeout(
        function() {

            if (
                !levelCompleted
            ) {

                hideMessage();

            }

        },
        900
    );

}


function showCollisionMessage() {

    messageTitle.textContent =
        tt("Oops!");

    messageText.textContent =
        tt("The robot bumped into something.");

    nextLevelButton.style.display =
        "none";

    gameMessage.classList.remove(
        "hidden"
    );

}


function showFailMessage() {

    messageTitle.textContent =
        tt("Try Again!");

    messageText.textContent =
        tt("The robot did not complete the path.");

    nextLevelButton.style.display =
        "none";

    gameMessage.classList.remove(
        "hidden"
    );

}


/* =========================================================
   CHECK GOAL
========================================================= */

function isAtGoal() {

    const level =
        getCurrentLevel();


    if (
        !level ||
        !level.goal
    ) {

        return false;

    }


    return (
        Number(robotX) ===
            Number(level.goal.x) &&
        Number(robotY) ===
            Number(level.goal.y)
    );

}


/* =========================================================
   COMPLETE LEVEL
========================================================= */

function completeLevel() {

    if (levelCompleted) {

        return;

    }


    levelCompleted =
        true;


    if (
        !completedLevels.includes(
            currentLevel
        )
    ) {

        completedLevels.push(
            currentLevel
        );

    }


    updateLevelButtons();


    const finishedLevel =
        getCurrentLevel();

    const isBonus =
        Boolean(finishedLevel && finishedLevel.bonus);

    messageTitle.textContent =
        isBonus
            ? tt("Bonus Level Complete! ⭐")
            : tt("Level Complete!");

    messageText.textContent =
        isBonus
            ? tt("Amazing! You cleared a bonus level.")
            : tt("Great job! You reached the goal.");

    nextLevelButton.style.display =
        "inline-block";


    if (
        currentLevel ===
        levels.length
    ) {

        nextLevelButton.textContent =
            tt("DONE");

    }

    else if (
        !isBonus &&
        currentLevel === regularCount
    ) {

        messageText.textContent =
            tt("Great job! Bonus levels are now open ⭐");

        nextLevelButton.textContent =
            tt("BONUS LEVEL ⭐");

    }

    else {

        nextLevelButton.textContent =
            tt("NEXT LEVEL");

    }


    gameMessage.classList.remove(
        "hidden"
    );

}


/* =========================================================
   HIDE MESSAGE
========================================================= */

function hideMessage() {

    if (!gameMessage) {

        return;

    }


    gameMessage.classList.add(
        "hidden"
    );

}


/* =========================================================
   RESET ROBOT
========================================================= */

function resetRobot() {

    const level =
        getCurrentLevel();


    if (!level) {

        return;

    }


    if (!level.start) {

        robot.style.display =
            "none";

        updateGoal();

        hideMessage();

        nextLevelButton.style.display =
            "none";

        return;

    }


    robot.style.display =
        "block";


    robotX =
        Number(level.start.x);

    robotY =
        Number(level.start.y);

    direction =
        Number(level.start.direction);


    if (
        !Number.isFinite(direction) ||
        direction < 0 ||
        direction > 3
    ) {

        direction =
            0;

    }


    levelCompleted =
        false;

    hasCollided =
        false;


    updateRobot();

    updateGoal();

    hideMessage();


    nextLevelButton.style.display =
        "none";

}


/* =========================================================
   RESET PROGRAM
========================================================= */

function clearProgram() {

    const programBlocks =
        program.querySelectorAll(
            ":scope > .block, :scope > .repeat-block"
        );


    programBlocks.forEach(
        function(block) {

            block.remove();

        }
    );

    program.querySelectorAll(":scope > .parked-stack").forEach(function (st) { st.remove(); });


    showEmptyText();

    updateBlockCounter();

}


/* =========================================================
   LEVEL BUTTONS
========================================================= */

function createLevelButtons() {

    if (!levelsContainer) {

        return;

    }


    levelsContainer.innerHTML =
        "";


    levels.forEach(
        function(level) {

            const button =
                document.createElement(
                    "button"
                );


            button.type =
                "button";

            button.classList.add(
                "level"
            );

            button.dataset.level =
                level.level;

            if (level.bonus) {

                button.classList.add(
                    "bonus"
                );

                button.textContent =
                    "★";

                button.title =
                    "Bonus level " + level.level;

            }

            else {

                button.textContent =
                    level.level;

            }


            button.addEventListener(
                "click",
                function() {

                    if (isRunning) {

                        return;

                    }


                    if (
                        button.classList.contains(
                            "locked"
                        )
                    ) {

                        return;

                    }


                    const levelNumber =
                        Number(
                            button.dataset.level
                        );


                    loadLevel(
                        levelNumber
                    );

                }
            );


            levelsContainer.appendChild(
                button
            );

        }
    );


    updateLevelButtons();

}


/* =========================================================
   UPDATE LEVEL BUTTONS
========================================================= */

function updateLevelButtons() {

    if (!levelsContainer) {

        return;

    }


    const buttons =
        levelsContainer.querySelectorAll(
            ".level"
        );


    buttons.forEach(
        function(button) {

            const levelNumber =
                Number(
                    button.dataset.level
                );


            button.classList.remove(
                "current"
            );

            button.classList.remove(
                "completed"
            );

            button.classList.remove(
                "locked"
            );


            if (
                completedLevels.includes(
                    levelNumber
                )
            ) {

                button.classList.add(
                    "completed"
                );

                return;

            }


            if (
                levelNumber ===
                currentLevel
            ) {

                button.classList.add(
                    "current"
                );

                return;

            }


            if (
                levelNumber === 1 ||
                completedLevels.includes(
                    levelNumber - 1
                )
            ) {

                return;

            }


            button.classList.add(
                "locked"
            );

        }
    );

}


/* =========================================================
   SAVE PROGRAM
========================================================= */

function serializeNodes(nodes) {
    return nodes.map(function (n) {
        if (n.classList.contains("repeat-block")) {
            const inp = n.querySelector(".repeat-number");
            return {
                type: "repeat",
                times: inp ? Number(inp.value) || 2 : 2,
                children: Array.from(n.querySelectorAll(":scope > .repeat-body > .block")).map(function (c) {
                    return { command: c.dataset.command };
                })
            };
        }
        return { type: "block", command: n.dataset.command };
    });
}

function buildNodes(container, items) {
    (items || []).forEach(function (it) {
        if (it.type === "repeat") {
            const rb = createProgramBlock("repeat", container);
            if (!rb) return;
            const inp = rb.querySelector(".repeat-number");
            if (inp) inp.value = it.times || 2;
            const body = rb.querySelector(".repeat-body");
            (it.children || []).forEach(function (c) { createProgramBlock(c.command, body); });
            updateRepeatPlaceholder();
        } else if (it.command) {
            createProgramBlock(it.command, container);
        }
    });
}

function restoreParked() {
    (savedParked[currentLevel] || []).forEach(function (sp) {
        const st = document.createElement("div");
        st.className = "parked-stack";
        st.style.left = (sp.x || 0) + "px";
        st.style.top = (sp.y || 0) + "px";
        program.appendChild(st);
        buildNodes(st, sp.blocks);
    });
    showEmptyText();
}

function saveCurrentProgram() {

    const savedBlocks = [];


    const mainBlocks =
        program.querySelectorAll(
            ":scope > .block, :scope > .repeat-block"
        );


    mainBlocks.forEach(
        function(block) {

            if (
                block.classList.contains(
                    "block"
                )
            ) {

                savedBlocks.push({

                    type:
                        "block",

                    command:
                        block.dataset.command

                });


                return;

            }


            if (
                block.classList.contains(
                    "repeat-block"
                )
            ) {

                const input =
                    block.querySelector(
                        ".repeat-number"
                    );


                const repeatBody =
                    block.querySelector(
                        ".repeat-body"
                    );


                const nestedBlocks = [];


                if (repeatBody) {

                    repeatBody
                        .querySelectorAll(
                            ":scope > .block"
                        )
                        .forEach(
                            function(
                                nestedBlock
                            ) {

                                nestedBlocks.push({

                                    command:
                                        nestedBlock.dataset.command

                                });

                            }
                        );

                }


                savedBlocks.push({

                    type:
                        "repeat",

                    times:
                        input
                            ? Number(
                                input.value
                            )
                            : 2,

                    children:
                        nestedBlocks

                });

            }

        }
    );


    savedPrograms[
        currentLevel
    ] =
        savedBlocks;

    savedParked[currentLevel] =
        Array.from(program.querySelectorAll(":scope > .parked-stack")).map(function (st) {
            return {
                x: parseFloat(st.style.left) || 0,
                y: parseFloat(st.style.top) || 0,
                blocks: serializeNodes(blockSiblings(st))
            };
        });

}


/* =========================================================
   LOAD SAVED PROGRAM
========================================================= */

function loadSavedProgram() {

    clearProgram();

    restoreParked();


    const savedBlocks =
        savedPrograms[
            currentLevel
        ];


    if (
        !savedBlocks ||
        savedBlocks.length === 0
    ) {

        return;

    }


    savedBlocks.forEach(
        function(savedBlock) {

            if (
                savedBlock.type ===
                "block"
            ) {

                createProgramBlock(
                    savedBlock.command,
                    program
                );

                return;

            }


            if (
                savedBlock.type ===
                "repeat"
            ) {

                createProgramBlock(
                    "repeat",
                    program
                );


                const repeatBlocks =
                    program.querySelectorAll(
                        ":scope > .repeat-block"
                    );


                const repeatBlock =
                    repeatBlocks[
                        repeatBlocks.length - 1
                    ];


                if (!repeatBlock) {

                    return;

                }


                const input =
                    repeatBlock.querySelector(
                        ".repeat-number"
                    );


                if (input) {

                    input.value =
                        savedBlock.times || 2;

                }


                const repeatBody =
                    repeatBlock.querySelector(
                        ".repeat-body"
                    );


                if (!repeatBody) {

                    return;

                }


                if (
                    Array.isArray(
                        savedBlock.children
                    )
                ) {

                    savedBlock.children.forEach(
                        function(child) {

                            createProgramBlock(
                                child.command,
                                repeatBody
                            );

                        }
                    );

                }


                updateRepeatPlaceholder();

            }

        }
    );


    updateBlockCounter();

}


/* =========================================================
   LOAD LEVEL
========================================================= */

function loadLevel(
    levelNumber
) {

    const level =
        levels.find(
            function(level) {

                return (
                    Number(level.level) ===
                    Number(levelNumber)
                );

            }
        );


    if (!level) {

        return;

    }


    const previousCompleted =
        completedLevels.includes(
            Number(levelNumber) - 1
        );


    const allowed =
        Number(levelNumber) === 1 ||
        completedLevels.includes(
            Number(levelNumber)
        ) ||
        previousCompleted;


    if (!allowed) {

        return;

    }


    saveCurrentProgram();


    currentLevel =
        Number(levelNumber);


    updateGridSizeFromLevel();

    createMap();


    requestAnimationFrame(
        function() {

            resetRobot();

            updateSourceBlocks();

            loadSavedProgram();

            updateLevelButtons();

        }
    );

}


/* =========================================================
   AVAILABLE BLOCKS
========================================================= */

function getAvailableBlocks() {

    const level =
        getCurrentLevel();


    if (
        !level ||
        !Array.isArray(
            level.availableBlocks
        )
    ) {

        return [
            "forward",
            "left",
            "right"
        ];

    }


    return level.availableBlocks;

}


/* =========================================================
   CREATE SOURCE BLOCK
========================================================= */

function createSourceBlock(
    command
) {

    if (
        !blockLabels[command]
    ) {

        return null;

    }


    const block =
        document.createElement(
            "div"
        );


    block.classList.add(
        "block"
    );


    if (
        command === "repeat"
    ) {

        block.classList.add(
            "repeat-source"
        );

    }


    block.draggable =
        true;


    block.dataset.command =
        command;


    if (
        command === "repeat"
    ) {

        block.textContent =
            tt("REPEAT [ 2 ] TIMES");

    }

    else {

        block.textContent =
            blockLabels[command];

    }


    block.addEventListener(
        "dragstart",
        function(event) {

            event.dataTransfer.effectAllowed =
                "copy";

            event.dataTransfer.setData(
                "command",
                command
            );

            draggedProgramBlock =
                null;

        }
    );


    return block;

}


/* =========================================================
   UPDATE SOURCE BLOCKS
========================================================= */

function updateSourceBlocks() {

    if (!blocksArea) {

        return;

    }


    const existingBlocks =
        Array.from(
            blocksArea.querySelectorAll(
                ".block"
            )
        );


    existingBlocks.forEach(
        function(block) {

            block.remove();

        }
    );


    const availableBlocks =
        getAvailableBlocks();


    availableBlocks.forEach(
        function(command) {

            const block =
                createSourceBlock(
                    command
                );


            if (block) {

                blocksArea.appendChild(
                    block
                );

            }

        }
    );

}


/* =========================================================
   PROGRAM DRAG OVER
========================================================= */

program.addEventListener(
    "dragover",
    function(event) {

        if (
            event.target.closest(
                ".repeat-block"
            )
        ) {

            return;

        }


        event.preventDefault();


        event.dataTransfer.dropEffect =
            draggedProgramBlock
                ? "move"
                : "copy";

    }
);


/* =========================================================
   PROGRAM DROP
========================================================= */

program.addEventListener(
    "drop",
    function(event) {

        if (
            event.target.closest(
                ".repeat-block"
            )
        ) {

            return;

        }


        event.preventDefault();


        if (
            draggedProgramBlock
        ) {

            dragDropHandled = true;

            const stack = draggedStack.slice();

            const parkedTarget =
                event.target.closest(".parked-stack");

            const ownParked =
                parkedTarget &&
                stack.some(function (n) { return parkedTarget.contains(n); });

            let stackRight = 0;

            Array.from(
                program.querySelectorAll(":scope > .start-block, :scope > .block, :scope > .repeat-block")
            ).forEach(function (el) {
                if (stack.indexOf(el) < 0) {
                    stackRight = Math.max(stackRight, el.getBoundingClientRect().right);
                }
            });

            if (ownParked || (!parkedTarget && event.clientX > stackRight + 24)) {

                parkStack(stack, event);

            }

            else if (parkedTarget) {

                insertStack(parkedTarget, stack, event.clientY);

            }

            else {

                insertStack(program, stack, event.clientY);

            }

            finishProgramDrag();

            return;

        }


        const command =
            event.dataTransfer.getData(
                "command"
            );


        if (!command) {

            return;

        }


        const dropInto =
            event.target.closest(".parked-stack") || program;

        const made =
            createProgramBlock(
                command,
                dropInto
            );

        if (made) {

            placeAt(dropInto, made, event.clientY);

        }

    }
);


/* =========================================================
   CREATE PROGRAM BLOCK
========================================================= */

function createProgramBlock(
    command,
    container
) {

    /* =====================================================
       REPEAT
    ===================================================== */

    if (
        command === "repeat"
    ) {

        const repeatBlock =
            document.createElement(
                "div"
            );


        repeatBlock.classList.add(
            "repeat-block"
        );


        repeatBlock.draggable =
            true;


        repeatBlock.dataset.command =
            "repeat";


        const repeatHeader =
            document.createElement(
                "div"
            );


        repeatHeader.classList.add(
            "repeat-header"
        );


        const repeatLabel =
            document.createElement(
                "span"
            );


        repeatLabel.textContent =
            tt("REPEAT");


        const repeatInput =
            document.createElement(
                "input"
            );


        repeatInput.type =
            "number";

        repeatInput.min =
            "1";

        repeatInput.max =
            "20";

        repeatInput.value =
            "2";

        repeatInput.classList.add(
            "repeat-number"
        );


        repeatInput.addEventListener(
            "mousedown",
            function(event) {

                event.stopPropagation();

            }
        );


        repeatInput.addEventListener(
            "click",
            function(event) {

                event.stopPropagation();

            }
        );


        const timesLabel =
            document.createElement(
                "span"
            );


        timesLabel.textContent =
            tt("TIMES");


        repeatHeader.appendChild(
            repeatLabel
        );

        repeatHeader.appendChild(
            repeatInput
        );

        repeatHeader.appendChild(
            timesLabel
        );


        const repeatBody =
            document.createElement(
                "div"
            );


        repeatBody.classList.add(
            "repeat-body"
        );


        repeatBlock.appendChild(
            repeatHeader
        );

        repeatBlock.appendChild(
            repeatBody
        );


        updateRepeatPlaceholder();


        repeatBlock.addEventListener(
            "dragstart",
            function(event) {

                if (
                    event.target.classList.contains(
                        "repeat-number"
                    )
                ) {

                    event.preventDefault();

                    return;

                }


                if (
                    event.target !== repeatBlock
                ) {

                    return;

                }


                setDragged(repeatBlock, event);


                event.dataTransfer.effectAllowed =
                    "move";


                event.dataTransfer.setData(
                    "text/plain",
                    "move-repeat"
                );


            }
        );


        repeatBlock.addEventListener(
            "dragend",
            function() {

                repeatBlock.classList.remove(
                    "dragging"
                );


                if (draggedProgramBlock === repeatBlock) {

                    finishProgramDrag();

                }


                updateRepeatPlaceholder();

            }
        );


        repeatBlock.addEventListener(
            "dragover",
            function(event) {

                event.preventDefault();

                event.stopPropagation();


                if (
                    draggedStack.indexOf(repeatBlock) >= 0
                ) {

                    event.dataTransfer.dropEffect =
                        "none";

                    return;

                }


                event.dataTransfer.dropEffect =
                    draggedProgramBlock
                        ? "move"
                        : "copy";

            }
        );


        repeatBlock.addEventListener(
            "drop",
            function(event) {

                event.preventDefault();

                event.stopPropagation();


                if (
                    draggedStack.indexOf(repeatBlock) >= 0
                ) {

                    return;

                }


                if (
                    draggedProgramBlock
                ) {

                    if (
                        draggedStack.some(function (n) { return n.classList.contains("repeat-block"); })
                    ) {

                        return;

                    }


                    dragDropHandled = true;

                    insertStack(repeatBody, draggedStack, event.clientY);

                    finishProgramDrag();


                    updateRepeatPlaceholder();

                    updateBlockCounter();

                    return;

                }


                const nestedCommand =
                    event.dataTransfer.getData(
                        "command"
                    );


                if (!nestedCommand) {

                    return;

                }


                if (
                    nestedCommand ===
                    "repeat"
                ) {

                    return;

                }


                const madeNested =
                    createProgramBlock(
                        nestedCommand,
                        repeatBody
                    );

                if (madeNested) {

                    placeAt(repeatBody, madeNested, event.clientY);

                }


                updateRepeatPlaceholder();

                updateBlockCounter();

            }
        );


        container.appendChild(
            repeatBlock
        );


        removeEmptyText();

        updateBlockCounter();

        return repeatBlock;

    }


    /* =====================================================
       NORMAL BLOCK
    ===================================================== */

    const newBlock =
        document.createElement(
            "div"
        );


    newBlock.classList.add(
        "block"
    );


    newBlock.draggable =
        true;


    newBlock.dataset.command =
        command;


    newBlock.textContent =
        blockLabels[command] ||
        command;


    container.appendChild(
        newBlock
    );


    if (
        container.classList.contains(
            "repeat-body"
        )
    ) {

        updateRepeatPlaceholder();

    }

    else {

        removeEmptyText();

    }


    updateBlockCounter();

    return newBlock;

}


/* =========================================================
   REPEAT PLACEHOLDER
========================================================= */

function updateRepeatPlaceholder() {

    const repeatBodies =
        document.querySelectorAll(
            ".repeat-body"
        );


    repeatBodies.forEach(
        function(body) {

            const blocks =
                body.querySelectorAll(
                    ":scope > .block"
                );


            let placeholder =
                body.querySelector(
                    ":scope > .repeat-placeholder"
                );


            if (
                blocks.length === 0
            ) {

                if (!placeholder) {

                    placeholder =
                        document.createElement(
                            "div"
                        );


                    placeholder.classList.add(
                        "repeat-placeholder"
                    );


                    placeholder.textContent =
                        tt("Drop blocks here");


                    body.appendChild(
                        placeholder
                    );

                }

            }

            else {

                if (placeholder) {

                    placeholder.remove();

                }

            }

        }
    );

}


/* =========================================================
   DRAG PROGRAM BLOCKS
========================================================= */

program.addEventListener(
    "dragstart",
    function(event) {

        const block =
            event.target.closest(
                ".block, .repeat-block"
            );


        if (!block) {

            return;

        }


        if (
            !program.contains(
                block
            )
        ) {

            return;

        }


        if (
            block.classList.contains(
                "repeat-block"
            )
        ) {

            return;

        }


        setDragged(block, event);


        event.dataTransfer.effectAllowed =
            "move";


        event.dataTransfer.setData(
            "text/plain",
            "move"
        );

    }
);


/* =========================================================
   DELETE BY DRAGGING TO BLOCKS PANEL
========================================================= */

blocksArea.addEventListener(
    "dragover",
    function(event) {

        if (
            draggedProgramBlock
        ) {

            event.preventDefault();

            event.dataTransfer.dropEffect =
                "move";

        }

    }
);


blocksArea.addEventListener(
    "drop",
    function(event) {

        if (
            !draggedProgramBlock
        ) {

            return;

        }


        event.preventDefault();


        dragDropHandled = true;

        draggedStack.forEach(function (n) { n.remove(); });


        draggedProgramBlock =
            null;

        draggedStack = [];

        cleanupParked();


        updateRepeatPlaceholder();

        showEmptyText();

        updateBlockCounter();

    }
);


/* =========================================================
   DRAG END
========================================================= */

program.addEventListener(
    "dragend",
    function(event) {

        event.target.classList.remove(
            "dragging"
        );


        finishProgramDrag();


        updateRepeatPlaceholder();

    }
);


/* =========================================================
   EMPTY PROGRAM
========================================================= */

function removeEmptyText() {

    const emptyText =
        program.querySelector(
            ":scope > .empty-text"
        );


    if (emptyText) {

        emptyText.remove();

    }

}


function showEmptyText() {

    const mainBlocks =
        program.querySelector(
            ":scope > .block, :scope > .repeat-block"
        );


    if (mainBlocks) {

        return;

    }


    const existingText =
        program.querySelector(
            ":scope > .empty-text"
        );


    if (existingText) {

        return;

    }


    const emptyText =
        document.createElement(
            "div"
        );


    emptyText.classList.add(
        "empty-text"
    );


    emptyText.textContent =
        tt("Drag blocks here");


    program.appendChild(
        emptyText
    );

}


/* =========================================================
   BLOCK COUNTER
========================================================= */

function updateBlockCounter() {

    if (!blockCounter) {

        return;

    }


    const count =
        getProgramBlockCount();


    blockCounter.textContent =
        "blok yang digunakan: " +
        count;

}


/* =========================================================
   MAX BLOCK CHECK
========================================================= */

function getProgramBlockCount() {

    return Array.from(
        program.querySelectorAll(
            ".block, .repeat-block"
        )
    ).filter(function (el) {
        return !el.closest(".parked-stack");
    }).length;

}


function isMaximumBlocksReached() {

    const level =
        getCurrentLevel();


    if (
        !level ||
        level.maxBlocks === null ||
        level.maxBlocks === undefined
    ) {

        return false;

    }


    return (
        getProgramBlockCount() >=
        Number(level.maxBlocks)
    );

}


/* =========================================================
   KECEPATAN ROBOT
   Angka makin BESAR = robot makin LAMBAT (milidetik per langkah).
   Dulu 500. Coba 700 (agak lambat), 900 (lambat), 1200 (sangat lambat).
========================================================= */
const STEP_DELAY = 1200;
document.documentElement.style.setProperty("--step-glide", (STEP_DELAY * 0.65 / 1000) + "s");

/* =========================================================
   WAIT
========================================================= */

function wait(
    milliseconds
) {

    return new Promise(
        function(resolve) {

            setTimeout(
                resolve,
                milliseconds
            );

        }
    );

}


/* =========================================================
   RUN COMMAND
========================================================= */

async function runCommand(
    command
) {

    if (hasCollided) {

        return false;

    }


    if (
        command ===
        "forward"
    ) {

        return await moveForward();

    }


    if (
        command ===
        "left"
    ) {

        await turnLeft();

        return true;

    }


    if (
        command ===
        "right"
    ) {

        await turnRight();

        return true;

    }


    /* =====================================================
       BUILDING BLOCKS
    ===================================================== */

    if (
        command === "buildHouse" ||
        command === "buildSchool" ||
        command === "buildGarden"
    ) {

        return await buildBuilding(
            command
        );

    }


    /* =====================================================
       OTHER BLOCKS
    ===================================================== */

    if (
        command === "pickup" ||
        command === "putdown" ||
        command === "goto" ||
        command === "if" ||
        command === "cargoColor"
    ) {

        return true;

    }


    return true;

}


/* =========================================================
   RUN PROGRAM BLOCK
========================================================= */

/* =========================================================
   HIGHLIGHT BLOK YANG SEDANG DIJALANKAN
   (blok lain digelapkan, hanya peta + blok aktif yang berwarna)
========================================================= */
function setActiveBlock(el, parent) {
    program.querySelectorAll(".block-active, .block-parent-active").forEach(function (e) {
        e.classList.remove("block-active", "block-parent-active");
    });
    if (el) {
        el.classList.add("block-active");
        var p = el.parentElement && el.parentElement.closest(".repeat-block");
        if (p) { p.classList.add("block-parent-active"); }
        try { el.scrollIntoView({ block: "nearest" }); } catch (e) {}
    }
    if (parent) { parent.classList.add("block-parent-active"); }
}
function setCodeRunning(on) {
    document.body.classList.toggle("code-running", on);
    if (!on) { setActiveBlock(null); }
}

async function runProgramBlock(
    block
) {

    if (hasCollided) {

        return false;

    }


    /* =====================================================
       REPEAT
    ===================================================== */

    if (
        block.classList.contains(
            "repeat-block"
        )
    ) {
        setActiveBlock(null, block);

        const input =
            block.querySelector(
                ".repeat-number"
            );


        let times =
            input
                ? Number(
                    input.value
                )
                : 1;


        if (
            !Number.isFinite(times)
        ) {

            times = 1;

        }


        times =
            Math.max(
                1,
                Math.min(
                    20,
                    Math.floor(times)
                )
            );


        if (input) {

            input.value =
                times;

        }


        const nestedBlocks =
            Array.from(
                block.querySelectorAll(
                    ":scope > .repeat-body > .block"
                )
            );


        for (
            let repeatIndex = 0;
            repeatIndex < times;
            repeatIndex++
        ) {

            for (
                const nestedBlock
                of nestedBlocks
            ) {

                if (hasCollided) {

                    return false;

                }


                setActiveBlock(nestedBlock);
                const success = await runCommand(nestedBlock.dataset.command);


                if (!success) {

                    return false;

                }

            }

        }


        return true;

    }


    /* =====================================================
       NORMAL BLOCK
    ===================================================== */

    setActiveBlock(block);
    return await runCommand(
        block.dataset.command
    );

}


/* =========================================================
   MAIN PROGRAM BLOCKS
========================================================= */

function getMainProgramBlocks() {

    return Array.from(
        program.querySelectorAll(
            ":scope > .block, :scope > .repeat-block"
        )
    );

}


/* =========================================================
   RUN PROGRAM
========================================================= */

runButton.addEventListener(
    "click",
    async function() {

        if (isRunning) {

            return;

        }


        const programBlocks =
            getMainProgramBlocks();


        if (
            programBlocks.length === 0
        ) {

            return;

        }


        const level =
            getCurrentLevel();


        if (
            level &&
            level.maxBlocks !== null &&
            programBlocks.length >
                Number(level.maxBlocks)
        ) {

            messageTitle.textContent =
                tt("Too Many Blocks");


            messageText.textContent =
                (isIndonesian ? `Pakai maksimal ${level.maxBlocks} blok.` : `Use ${level.maxBlocks} blocks or fewer.`);


            nextLevelButton.style.display =
                "none";


            gameMessage.classList.remove(
                "hidden"
            );


            return;

        }


        isRunning =
            true;
        setCodeRunning(true);


        /*
            Reset map supaya semua
            bangunan kembali menjadi
            target kosong setiap RUN.
        */

        createMap();


        resetRobot();


        hasCollided =
            false;


        await wait(500);


        for (
            const block
            of programBlocks
        ) {

            if (hasCollided) {

                break;

            }


            const success =
                await runProgramBlock(
                    block
                );


            if (!success) {

                break;

            }

        }


        setCodeRunning(false);
        if (hasCollided) {

            showCollisionMessage();

        }

        else if (isAtGoal()) {

            completeLevel();

        }

        else {

            showFailMessage();

        }


        isRunning =
            false;

    }
);


/* =========================================================
   RESET BUTTON
========================================================= */

resetButton.addEventListener(
    "click",
    function() {

        if (isRunning) {

            return;

        }


        createMap();

        resetRobot();

    }
);


/* =========================================================
   CLOSE MESSAGE
========================================================= */

closeMessageButton.addEventListener(
    "click",
    function() {

        hideMessage();

        resetRobot();

    }
);


/* =========================================================
   NEXT LEVEL
========================================================= */

nextLevelButton.addEventListener(
    "click",
    function() {

        if (isRunning) {

            return;

        }


        if (
            currentLevel ===
            levels.length
        ) {

            hideMessage();

            return;

        }


        loadLevel(
            currentLevel + 1
        );

    }
);


/* =========================================================
   WINDOW RESIZE
========================================================= */

window.addEventListener(
    "resize",
    function() {

        requestAnimationFrame(
            function() {

                updateRobot();

                updateGoal();

            }
        );

    }
);


/* =========================================================
   START GAME
========================================================= */

updateGridSizeFromLevel();

createMap();

requestAnimationFrame(
    function() {

        resetRobot();

        updateSourceBlocks();

        loadSavedProgram();

        createLevelButtons();

        updateLevelButtons();

    }
);

/* =========================================================
   STUDENT MODE (nama/kelas, progress ke Google Sheet)
========================================================= */
if (isStudentMode) {
    const st = studentInfo || {};
    const hub = "student.html?lesson=" + encodeURIComponent(lessonId);
    if (!st.name) { window.location.href = hub; }

    // --- selesai level: kirim ke sheet (1x per level) + simpan progress ---
    const _completeLevel = completeLevel;
    completeLevel = function () {
        const first = !levelCompleted;
        const already = completedLevels.includes(currentLevel);
        const lv = getCurrentLevel();
        _completeLevel();
        if (first && levelCompleted) {
            persistProgress();
            if (!already) {
                const n = (blockCounter.textContent.match(/\d+/) || [0])[0];
                const plan = lessonPlan(selectedLesson), gp = plan.find(function (x) { return x.type === "game"; }) || { label: "Game" };
                api("submit", {
                    lessonId: selectedLesson.id, lessonTitle: selectedLesson.title,
                    name: st.name, cls: st.cls, plan: plan,
                    items: [{ challenge: gp.label, kind: "game", question: "Level " + currentLevel, answer: "Selesai, " + n + " blok", no: currentLevel, status: "selesai", score: 1, bonus: !!(lv && lv.bonus) }]
                }).catch(function () {});
            }
        }
    };

    // --- pindah level: jangan simpan program saat transisi ---
    const _loadLevel = loadLevel;
    loadLevel = function (n) {
        suspendSave = true;
        _loadLevel(n);
        requestAnimationFrame(function () { requestAnimationFrame(function () { suspendSave = false; persistProgress(); }); });
    };

    // --- simpan setiap ada perubahan blok / angka repeat ---
    const _updateBlockCounter = updateBlockCounter;
    updateBlockCounter = function () { _updateBlockCounter(); schedulePersist(); };
    program.addEventListener("input", schedulePersist);
    program.addEventListener("change", schedulePersist);
    window.addEventListener("pagehide", persistProgress);
    document.addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden") persistProgress(); });

    // --- level terakhir -> balik ke halaman utama murid ---
    document.addEventListener("click", function (e) {
        if (e.target.closest("#next-level-button") && currentLevel === levels.length && levelCompleted) {
            e.stopPropagation();
            persistProgress();
            window.location.href = hub;
        }
    }, true);

    const bb = document.getElementById("back-button");
    const nb = bb.cloneNode(true);
    bb.replaceWith(nb);
    nb.onclick = function () { persistProgress(); window.location.href = hub; };

    // restore selesai -> izinkan penyimpanan
    requestAnimationFrame(function () {
        requestAnimationFrame(function () { suspendSave = false; });
    });
}


if (isIndonesian) {
    const setText = function (selector, text) { const el = document.querySelector(selector); if (el) el.textContent = text; };
    setText(".blocks-panel h2", "Blok");
    setText(".program-header h2", "Programku");
    setText(".start-block", "SAAT TOMBOL MULAI DIKLIK");
    setText("#reset-button", "ATUR ULANG");
    setText(".empty-text", "Seret blok ke sini");
    document.documentElement.lang = "id";
}
