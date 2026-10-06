const urlParams = new URLSearchParams(window.location.search);

const lessonId = urlParams.get("lesson");

let lessons =
    JSON.parse(localStorage.getItem("robotLessons")) || [];

let lesson =
    lessons.find(
        item => String(item.id) === String(lessonId)
    );

if (!lesson) {

    alert("Lesson not found.");

    window.location.href = "admin.html";
}


/* =========================================================
   CONSTANTS
========================================================= */

const DEFAULT_GRID_SIZE = 8;

const COORDINATE_GRID_SIZE = 15;

const COORDINATE_VALUES = [
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

const COORDINATE_IMAGE =
    "assets/koordinat.png";

const ROBOT_IMAGE =
    "assets/depan.png";

/*
    Sama persis dengan game.js:
    0 = RIGHT, 1 = DOWN, 2 = LEFT, 3 = UP
*/
const ROBOT_DIRECTION_IMAGES = [
    "assets/kanan.png",
    "assets/depan.png",
    "assets/kiri.png",
    "assets/belakang.png"
];


/* =========================================================
   COORDINATE POSITIONS
========================================================= */

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


/* =========================================================
   STATE
========================================================= */

let currentLevelIndex = 0;

let currentTool = "path";

let currentPath = [];

let currentBlocked = [];

let currentStart = null;

let currentGoal = null;

let currentBuildingTargets = {
    house: [],
    school: [],
    garden: []
};


/* =========================================================
   DOM
========================================================= */

const lessonTitle =
    document.getElementById("lesson-title");

const lessonDescription =
    document.getElementById("lesson-description");

const levelTitle =
    document.getElementById("level-title");

const levelList =
    document.getElementById("level-list");

const mapEditor =
    document.getElementById("map-editor");

const levelNameInput =
    document.getElementById("level-name");

const gridSizeInput =
    document.getElementById("grid-size");

const gridSizeHint =
    document.getElementById("grid-size-hint");

const startDirection =
    document.getElementById("start-direction");

const availableBlocksList =
    document.getElementById("available-blocks-list");

const saveStatus =
    document.getElementById("save-status");

const saveButton =
    document.getElementById("save-button");

const backButton =
    document.getElementById("back-button");

const maxBlocksInput =
    document.getElementById("max-blocks");


/* =========================================================
   HELPERS
========================================================= */

function isCoordinateLesson() {

    return (
        lesson &&
        lesson.type === "coordinates"
    );
}


function isRepetitionLesson() {

    return (
        lesson &&
        lesson.type === "repetition"
    );
}


function getDefaultBlocksForLesson() {

    if (
        lesson &&
        lesson.type === "repetition"
    ) {

        return [
            "forward",
            "left",
            "right",
            "repeat",
            "buildHouse",
            "buildSchool",
            "buildGarden"
        ];

    }


    if (
        lesson &&
        lesson.type === "coordinates"
    ) {

        return [
            "goto"
        ];

    }


    if (
        lesson &&
        lesson.type === "if"
    ) {

        return [
            "forward",
            "left",
            "right",
            "pickup",
            "putdown",
            "repeat",
            "if",
            "cargoColor"
        ];

    }


    return [
        "forward",
        "left",
        "right"
    ];
}


function getBlockOptionsForLesson() {

    return getDefaultBlocksForLesson();
}


function getBlockLabel(block) {

    const labels = {

        forward: "MOVE FORWARD",

        left: "TURN LEFT",

        right: "TURN RIGHT",

        repeat: "REPEAT [ ] TIMES",

        buildHouse: "BUILD A HOUSE",

        buildSchool: "BUILD A SCHOOL",

        buildGarden: "BUILD A GARDEN",

        goto: "GO TO X [ ] Y [ ]",

        pickup: "PICK UP CARGO",

        putdown: "PUT DOWN CARGO",

        if: "IF / ELSE",

        cargoColor: "CARGO COLOR"

    };

    return labels[block] || block;
}


function createEmptyBuildingTargets() {

    return {

        house: [],

        school: [],

        garden: []

    };
}


function normalizeBuildingTargets(level) {

    if (
        !level.buildingTargets ||
        typeof level.buildingTargets !== "object"
    ) {

        level.buildingTargets =
            createEmptyBuildingTargets();

    }


    if (!Array.isArray(level.buildingTargets.house)) {

        level.buildingTargets.house = [];

    }


    if (!Array.isArray(level.buildingTargets.school)) {

        level.buildingTargets.school = [];

    }


    if (!Array.isArray(level.buildingTargets.garden)) {

        level.buildingTargets.garden = [];

    }
}


/* =========================================================
   MAXIMUM BLOCKS
========================================================= */

function normalizeMaxBlocks(level) {

    /*
        Empty / missing value = no limit.
    */

    if (
        level.maxBlocks === null ||
        level.maxBlocks === undefined ||
        level.maxBlocks === ""
    ) {

        level.maxBlocks = null;

        return;

    }


    const value =
        Number(level.maxBlocks);


    if (
        !Number.isFinite(value) ||
        value < 1
    ) {

        level.maxBlocks = null;

        return;

    }


    level.maxBlocks =
        Math.min(
            50,
            Math.floor(value)
        );
}


function updateMaximumBlocksVisibility() {

    if (!maxBlocksInput) {
        return;
    }


    const settingGroup =
        maxBlocksInput.closest(
            ".setting-group"
        );


    if (!settingGroup) {
        return;
    }


    if (isRepetitionLesson()) {

        settingGroup.style.display =
            "block";

    } else {

        settingGroup.style.display =
            "none";

    }
}


/* =========================================================
   CREATE LEVEL
========================================================= */

function createEmptyLevel(levelNumber) {

    if (isCoordinateLesson()) {

        return {

            level: levelNumber,

            title: `Level ${levelNumber}`,

            gridSize: COORDINATE_GRID_SIZE,

            start: {

                x: -14,

                y: 0,

                direction: 0

            },

            goal: {

                x: 14,

                y: 0

            },

            path: [],

            blocked: [],

            availableBlocks:
                getDefaultBlocksForLesson(),

            maxBlocks: null,

            buildingTargets:
                createEmptyBuildingTargets()

        };

    }


    return {

        level: levelNumber,

        title: `Level ${levelNumber}`,

        gridSize: DEFAULT_GRID_SIZE,

        start: {

            x: 0,

            y: 0,

            direction: 0

        },

        goal: {

            x: DEFAULT_GRID_SIZE - 1,

            y: 0

        },

        path: [],

        blocked: [],

        availableBlocks:
            getDefaultBlocksForLesson(),

        maxBlocks:
            isRepetitionLesson()
                ? null
                : null,

        buildingTargets:
            createEmptyBuildingTargets()

    };
}


/* =========================================================
   PREPARE LEVELS
========================================================= */

function prepareLevels() {

    if (!Array.isArray(lesson.levels)) {

        lesson.levels = [];

    }


    /*
        Create missing levels based on
        the number selected when creating
        the lesson.
    */

    const requestedLevels =
        Math.max(
            1,
            Math.min(
                20,
                Number(
                    lesson.numberOfLevels
                ) || 1
            )
        );


    while (
        lesson.levels.length <
        requestedLevels
    ) {

        const nextLevelNumber =
            lesson.levels.length + 1;


        lesson.levels.push(
            createEmptyLevel(
                nextLevelNumber
            )
        );

    }


    lesson.levels.forEach(
        function(level, index) {

            /*
                Keep level numbers in order.
            */

            level.level =
                index + 1;


            if (!level.title) {

                level.title =
                    `Level ${index + 1}`;

            }


            if (!Array.isArray(level.path)) {

                level.path = [];

            }


            if (!Array.isArray(level.blocked)) {

                level.blocked = [];

            }


            if (
                !Array.isArray(
                    level.availableBlocks
                )
            ) {

                level.availableBlocks =
                    getDefaultBlocksForLesson();

            }


            if (!level.start) {

                if (isCoordinateLesson()) {

                    level.start = {

                        x: -14,

                        y: 0,

                        direction: 0

                    };

                } else {

                    level.start = {

                        x: 0,

                        y: 0,

                        direction: 0

                    };

                }

            }


            if (!level.goal) {

                if (isCoordinateLesson()) {

                    level.goal = {

                        x: 14,

                        y: 0

                    };

                } else {

                    level.goal = {

                        x:
                            (level.gridSize || 8) - 1,

                        y: 0

                    };

                }

            }


            if (
                !level.gridSize ||
                Number(level.gridSize) < 2
            ) {

                level.gridSize =
                    isCoordinateLesson()
                        ? COORDINATE_GRID_SIZE
                        : DEFAULT_GRID_SIZE;

            }


            normalizeBuildingTargets(level);

            normalizeMaxBlocks(level);


            if (isCoordinateLesson()) {

                level.gridSize =
                    COORDINATE_GRID_SIZE;


                level.start.x =
                    normalizeCoordinate(
                        level.start.x
                    );


                level.start.y =
                    normalizeCoordinate(
                        level.start.y
                    );


                level.goal.x =
                    normalizeCoordinate(
                        level.goal.x
                    );


                level.goal.y =
                    normalizeCoordinate(
                        level.goal.y
                    );

            }

        }
    );


    /*
        Save the newly created levels
        immediately so they remain available
        when returning to the lesson.
    */

    localStorage.setItem(
        "robotLessons",
        JSON.stringify(lessons)
    );

}


/* =========================================================
   COORDINATE HELPERS
========================================================= */

function normalizeCoordinate(value) {

    const numericValue =
        Number(value);

    if (!Number.isFinite(numericValue)) {

        return 0;

    }


    let closest =
        COORDINATE_VALUES[0];

    let smallestDifference =
        Math.abs(
            numericValue - closest
        );


    COORDINATE_VALUES.forEach(
        function(item) {

            const difference =
                Math.abs(
                    numericValue - item
                );

            if (
                difference <
                smallestDifference
            ) {

                closest = item;

                smallestDifference =
                    difference;

            }

        }
    );


    return closest;
}


/* =========================================================
   LESSON INFO
========================================================= */

function loadLessonInfo() {

    if (!lesson) return;


    lessonTitle.textContent =
        lesson.title || "Lesson";


    lessonDescription.textContent =
        lesson.description ||
        "Level Editor";

}


/* =========================================================
   LOAD LEVEL
========================================================= */

function loadCurrentLevel() {

    const level =
        lesson.levels[currentLevelIndex];

    if (!level) return;


    normalizeMaxBlocks(level);


    levelTitle.textContent =
        level.title ||
        `Level ${currentLevelIndex + 1}`;


    levelNameInput.value =
        level.title ||
        `Level ${currentLevelIndex + 1}`;


    if (isCoordinateLesson()) {

        gridSizeInput.value =
            COORDINATE_GRID_SIZE;

        gridSizeInput.disabled =
            true;

        gridSizeHint.textContent =
            "Coordinates use the uploaded plane from -14 to 14.";

    } else {

        gridSizeInput.disabled =
            false;

        gridSizeInput.value =
            level.gridSize ||
            DEFAULT_GRID_SIZE;

        gridSizeHint.textContent =
            "Example: 8 = 8×8 grid, coordinates 0–7.";

    }


    /*
        Load Maximum Blocks for this level.
    */

    if (maxBlocksInput) {

        maxBlocksInput.value =
            level.maxBlocks === null
                ? ""
                : level.maxBlocks;

    }


    startDirection.value =
        String(
            level.start?.direction ?? 0
        );


    currentPath =
        Array.isArray(level.path)
            ? [...level.path]
            : [];


    currentBlocked =
        Array.isArray(level.blocked)
            ? [...level.blocked]
            : [];


    currentStart =
        level.start
            ? { ...level.start }
            : null;


    currentGoal =
        level.goal
            ? { ...level.goal }
            : null;


    normalizeBuildingTargets(level);


    currentBuildingTargets = {

        house: [
            ...level.buildingTargets.house
        ],

        school: [
            ...level.buildingTargets.school
        ],

        garden: [
            ...level.buildingTargets.garden
        ]

    };


    setActiveTool("path");


    renderAvailableBlocks();

    renderMap();

    renderLevelList();

    updateBuildingToolsVisibility();

    updateMaximumBlocksVisibility();

    saveStatus.textContent =
        "Not saved";
}


/* =========================================================
   BONUS LEVELS
========================================================= */

function getBonusCount() {

    const max =
        Math.max(
            0,
            lesson.levels.length - 1
        );

    return Math.max(
        0,
        Math.min(
            max,
            Math.floor(
                Number(lesson.bonusLevels) || 0
            )
        )
    );

}


const bonusInput =
    document.getElementById("bonus-levels");

if (bonusInput) {

    bonusInput.value =
        getBonusCount();

    bonusInput.addEventListener(
        "input",
        function() {

            const max =
                Math.max(
                    0,
                    lesson.levels.length - 1
                );

            let value =
                Math.floor(
                    Number(bonusInput.value) || 0
                );

            value =
                Math.max(
                    0,
                    Math.min(
                        max,
                        value
                    )
                );

            lesson.bonusLevels =
                value;

            localStorage.setItem(
                "robotLessons",
                JSON.stringify(lessons)
            );

            saveStatus.textContent =
                "Saved";

            renderLevelList();

        }
    );

    bonusInput.addEventListener(
        "change",
        function() {

            bonusInput.value =
                getBonusCount();

        }
    );

}


/* =========================================================
   LEVEL LIST
========================================================= */

function renderLevelList() {

    levelList.innerHTML = "";


    lesson.levels.forEach(
        function(level, index) {

            const button =
                document.createElement("button");


            button.type = "button";

            button.className =
                "level-list-item";


            if (
                index === currentLevelIndex
            ) {

                button.classList.add(
                    "active"
                );

            }


            button.textContent =
                level.title ||
                `Level ${index + 1}`;


            if (index >= lesson.levels.length - getBonusCount()) {

                button.classList.add(
                    "is-bonus"
                );

            }


            button.addEventListener(
                "click",
                function() {

                    saveCurrentLevelToMemory();

                    currentLevelIndex =
                        index;

                    loadCurrentLevel();

                }
            );


            levelList.appendChild(
                button
            );

        }
    );
}


/* =========================================================
   BUILDING TOOLS
========================================================= */

function updateBuildingToolsVisibility() {

    const buildingTools =
        document.querySelectorAll(
            ".building-tool"
        );


    const show =
        isRepetitionLesson();


    buildingTools.forEach(
        function(button) {

            button.style.display =
                show ? "inline-flex" : "none";

        }
    );


    const legends = {

        house:
            document.getElementById(
                "house-legend"
            ),

        school:
            document.getElementById(
                "school-legend"
            ),

        garden:
            document.getElementById(
                "garden-legend"
            )

    };


    Object.keys(legends).forEach(
        function(key) {

            if (!legends[key]) return;

            legends[key].style.display =
                show ? "flex" : "none";

        }
    );
}


/* =========================================================
   TOOL BUTTONS
========================================================= */

function setActiveTool(tool) {

    currentTool = tool;


    document
        .querySelectorAll(".tool-button")
        .forEach(
            function(button) {

                button.classList.toggle(
                    "active",
                    button.dataset.tool === tool
                );

            }
        );
}


document
    .querySelectorAll(".tool-button")
    .forEach(
        function(button) {

            button.addEventListener(
                "click",
                function() {

                    setActiveTool(
                        button.dataset.tool
                    );

                }
            );

        }
    );


/* =========================================================
   MAP
========================================================= */

function renderMap() {

    mapEditor.innerHTML = "";


    if (isCoordinateLesson()) {

        renderCoordinateMap();

        return;

    }


    const level =
        lesson.levels[currentLevelIndex];


    const size =
        Number(
            level.gridSize ||
            DEFAULT_GRID_SIZE
        );


    mapEditor.style.gridTemplateColumns =
        `repeat(${size}, 1fr)`;


    mapEditor.style.gridTemplateRows =
        `repeat(${size}, 1fr)`;


    mapEditor.classList.remove(
        "coordinate-map"
    );


    for (
        let y = 0;
        y < size;
        y++
    ) {

        for (
            let x = 0;
            x < size;
            x++
        ) {

            const cell =
                document.createElement("div");


            cell.className =
                "map-cell";


            cell.dataset.x = x;

            cell.dataset.y = y;


            cell.addEventListener(
                "click",
                function() {

                    handleCellClick(
                        x,
                        y,
                        cell
                    );

                }
            );


            updateCellAppearance(
                cell,
                x,
                y
            );


            mapEditor.appendChild(
                cell
            );

        }

    }


    renderBuildingShadows();

}


/* =========================================================
   COORDINATE MAP
========================================================= */

function renderCoordinateMap() {

    mapEditor.classList.add(
        "coordinate-map"
    );


    mapEditor.style.display =
        "block";


    mapEditor.style.position =
        "relative";


    mapEditor.style.aspectRatio =
        "1389 / 1132";


    mapEditor.style.backgroundImage =
        `url("${COORDINATE_IMAGE}")`;


    mapEditor.style.backgroundSize =
        "100% 100%";


    mapEditor.style.backgroundPosition =
        "center";


    mapEditor.style.backgroundRepeat =
        "no-repeat";


    for (
        let row = 0;
        row < COORDINATE_GRID_SIZE;
        row++
    ) {

        for (
            let column = 0;
            column < COORDINATE_GRID_SIZE;
            column++
        ) {

            createCoordinateCell(
                row,
                column
            );

        }

    }


    updateCoordinateBuildingState();

}


/* =========================================================
   COORDINATE CELL
========================================================= */

function createCoordinateCell(
    row,
    column
) {

    const cell =
        document.createElement("div");


    cell.className =
        "map-cell coordinate-cell";


    cell.dataset.row =
        row;

    cell.dataset.column =
        column;


    const left =
        COORDINATE_X_POSITIONS[column];


    const top =
        COORDINATE_Y_POSITIONS[row];


    cell.style.position =
        "absolute";


    cell.style.left =
        `${left}%`;


    cell.style.top =
        `${top}%`;


    cell.style.width =
        "38px";


    cell.style.height =
        "38px";


    cell.style.transform =
        "translate(-50%, -50%)";


    cell.style.background =
        "transparent";


    cell.style.border =
        "none";


    cell.addEventListener(
        "click",
        function() {

            const x =
                COORDINATE_VALUES[column];


            const y =
                COORDINATE_VALUES[
                    COORDINATE_GRID_SIZE -
                    1 -
                    row
                ];


            handleCoordinateCellClick(
                x,
                y,
                cell
            );

        }
    );


    updateCoordinateCellAppearance(
        cell,
        row,
        column
    );


    mapEditor.appendChild(
        cell
    );
}


/* =========================================================
   NORMAL CELL CLICK
========================================================= */

function handleCellClick(
    x,
    y,
    cell
) {

    const key =
        `${x},${y}`;


    if (
        currentTool === "path"
    ) {

        removeFromArray(
            currentBlocked,
            key
        );


        toggleArrayValue(
            currentPath,
            key
        );

    }


    else if (
        currentTool === "blocked"
    ) {

        removeFromArray(
            currentPath,
            key
        );


        toggleArrayValue(
            currentBlocked,
            key
        );

    }


    else if (
        currentTool === "start"
    ) {

        currentStart = {

            x: x,

            y: y,

            direction:
                Number(
                    startDirection.value
                )

        };

    }


    else if (
        currentTool === "goal"
    ) {

        currentGoal = {

            x: x,

            y: y

        };

    }


    else if (
        currentTool === "house" ||
        currentTool === "school" ||
        currentTool === "garden"
    ) {

        toggleBuildingTarget(
            currentTool,
            key
        );

    }


    updateAllMapCells();


    saveStatus.textContent =
        "Unsaved changes";
}


/* =========================================================
   COORDINATE CLICK
========================================================= */

function handleCoordinateCellClick(
    x,
    y,
    cell
) {

    if (
        currentTool === "start"
    ) {

        currentStart = {

            x: x,

            y: y,

            direction:
                Number(
                    startDirection.value
                )

        };

    }


    else if (
        currentTool === "goal"
    ) {

        currentGoal = {

            x: x,

            y: y

        };

    }


    saveStatus.textContent =
        "Unsaved changes";


    renderMap();
}


/* =========================================================
   BUILDING TARGET
========================================================= */

function toggleBuildingTarget(
    buildingType,
    key
) {

    if (
        !currentBuildingTargets[
            buildingType
        ]
    ) {

        currentBuildingTargets[
            buildingType
        ] = [];

    }


    const list =
        currentBuildingTargets[
            buildingType
        ];


    const index =
        list.indexOf(key);


    if (index >= 0) {

        list.splice(index, 1);

    } else {

        list.push(key);

    }


    [
        "house",
        "school",
        "garden"
    ].forEach(
        function(type) {

            if (type === buildingType) {
                return;
            }

            removeFromArray(
                currentBuildingTargets[type],
                key
            );

        }
    );
}


/* =========================================================
   ARRAY HELPERS
========================================================= */

function toggleArrayValue(
    array,
    value
) {

    const index =
        array.indexOf(value);


    if (index >= 0) {

        array.splice(index, 1);

    } else {

        array.push(value);

    }
}


function removeFromArray(
    array,
    value
) {

    const index =
        array.indexOf(value);


    if (index >= 0) {

        array.splice(index, 1);

    }
}


/* =========================================================
   CELL APPEARANCE
========================================================= */

function updateCellAppearance(
    cell,
    x,
    y
) {

    const key =
        `${x},${y}`;


    cell.classList.remove(
        "path",
        "blocked",
        "start",
        "goal"
    );


    if (
        currentPath.includes(key)
    ) {

        cell.classList.add(
            "path"
        );

    }


    if (
        currentBlocked.includes(key)
    ) {

        cell.classList.add(
            "blocked"
        );

    }


    if (
        currentStart &&
        currentStart.x === x &&
        currentStart.y === y
    ) {

        cell.classList.add(
            "start"
        );


        const robot =
            document.createElement("img");


        robot.src =
            ROBOT_DIRECTION_IMAGES[
                Number(currentStart.direction) || 0
            ] || ROBOT_IMAGE;


        robot.alt =
            "Robot";


        robot.className =
            "editor-robot";


        robot.draggable =
            false;


        cell.appendChild(
            robot
        );

    }


    if (
        currentGoal &&
        currentGoal.x === x &&
        currentGoal.y === y
    ) {

        cell.classList.add(
            "goal"
        );


        const star =
            document.createElement("span");


        star.textContent =
            "★";


        star.className =
            "editor-goal";


        cell.appendChild(
            star
        );

    }
}


/* =========================================================
   COORDINATE APPEARANCE
========================================================= */

function updateCoordinateCellAppearance(
    cell,
    row,
    column
) {

    cell.innerHTML = "";


    const x =
        COORDINATE_VALUES[column];


    const y =
        COORDINATE_VALUES[
            COORDINATE_GRID_SIZE -
            1 -
            row
        ];


    if (
        currentStart &&
        currentStart.x === x &&
        currentStart.y === y
    ) {

        const robot =
            document.createElement("img");


        robot.src =
            ROBOT_IMAGE;


        robot.alt =
            "Robot";


        robot.className =
            "coordinate-robot";


        robot.draggable =
            false;


        robot.style.width =
            "30px";


        robot.style.height =
            "30px";


        robot.style.maxWidth =
            "30px";


        robot.style.maxHeight =
            "30px";


        robot.style.objectFit =
            "contain";


        robot.style.objectPosition =
            "center";


        robot.style.display =
            "block";


        robot.style.pointerEvents =
            "none";


        robot.style.margin =
            "0";


        robot.style.padding =
            "0";


        robot.style.position =
            "relative";


        robot.style.zIndex =
            "30";


        cell.appendChild(
            robot
        );

    }


    if (
        currentGoal &&
        currentGoal.x === x &&
        currentGoal.y === y
    ) {

        const star =
            document.createElement("span");


        star.textContent =
            "★";


        star.className =
            "coordinate-goal";


        star.style.fontSize =
            "20px";


        star.style.lineHeight =
            "1";


        star.style.width =
            "20px";


        star.style.height =
            "20px";


        star.style.display =
            "flex";


        star.style.alignItems =
            "center";


        star.style.justifyContent =
            "center";


        star.style.pointerEvents =
            "none";


        star.style.position =
            "relative";


        star.style.zIndex =
            "30";


        cell.appendChild(
            star
        );

    }
}


/* =========================================================
   UPDATE ALL CELLS
========================================================= */

function updateAllMapCells() {

    if (isCoordinateLesson()) {

        renderMap();

        return;

    }


    document
        .querySelectorAll(
            ".map-cell"
        )
        .forEach(
            function(cell) {

                cell.innerHTML = "";


                const x =
                    Number(
                        cell.dataset.x
                    );


                const y =
                    Number(
                        cell.dataset.y
                    );


                updateCellAppearance(
                    cell,
                    x,
                    y
                );

            }
        );


    renderBuildingShadows();
}


/* =========================================================
   BUILDING SHADOWS
========================================================= */

function renderBuildingShadows() {

    if (!isRepetitionLesson()) {

        return;

    }


    const buildingTypes = [
        "house",
        "school",
        "garden"
    ];


    buildingTypes.forEach(
        function(type) {

            const cells =
                currentBuildingTargets[
                    type
                ] || [];


            cells.forEach(
                function(key) {

                    const parts =
                        key.split(",");


                    const x =
                        Number(parts[0]);


                    const y =
                        Number(parts[1]);


                    const cell =
                        mapEditor.querySelector(
                            `.map-cell[data-x="${x}"][data-y="${y}"]`
                        );


                    if (!cell) {
                        return;
                    }


                    const shadow =
                        document.createElement(
                            "div"
                        );


                    shadow.className =
                        `building-shadow building-shadow-${type}`;


                    shadow.textContent =
                        getBuildingSymbol(
                            type
                        );


                    shadow.title =
                        getBuildingLabel(
                            type
                        );


                    cell.appendChild(
                        shadow
                    );

                }
            );

        }
    );
}


function getBuildingSymbol(type) {

    if (type === "house") {

        return "⌂";

    }


    if (type === "school") {

        return "▦";

    }


    if (type === "garden") {

        return "✿";

    }


    return "□";
}


function getBuildingLabel(type) {

    if (type === "house") {

        return "House target";

    }


    if (type === "school") {

        return "School target";

    }


    if (type === "garden") {

        return "Garden target";

    }


    return "Building target";
}


function updateCoordinateBuildingState() {

    /*
        Building shadows are not used
        for Coordinate lessons.
    */

    return;
}


/* =========================================================
   AVAILABLE BLOCKS
========================================================= */

function renderAvailableBlocks() {

    availableBlocksList.innerHTML = "";


    const options =
        getBlockOptionsForLesson();


    const level =
        lesson.levels[
            currentLevelIndex
        ];


    options.forEach(
        function(block) {

            const wrapper =
                document.createElement(
                    "label"
                );


            wrapper.className =
                "available-block-item";


            const checkbox =
                document.createElement(
                    "input"
                );


            checkbox.type =
                "checkbox";


            checkbox.value =
                block;


            checkbox.checked =
                (
                    level.availableBlocks ||
                    []
                ).includes(block);


            checkbox.addEventListener(
                "change",
                function() {

                    saveStatus.textContent =
                        "Unsaved changes";

                }
            );


            const text =
                document.createElement(
                    "span"
                );


            text.textContent =
                getBlockLabel(block);


            wrapper.appendChild(
                checkbox
            );


            wrapper.appendChild(
                text
            );


            availableBlocksList.appendChild(
                wrapper
            );

        }
    );
}


/* =========================================================
   SAVE CURRENT LEVEL TO MEMORY
========================================================= */

function saveCurrentLevelToMemory() {

    const level =
        lesson.levels[
            currentLevelIndex
        ];


    if (!level) return;


    level.title =
        levelNameInput.value.trim() ||
        `Level ${currentLevelIndex + 1}`;


    if (!isCoordinateLesson()) {

        const parsedGridSize =
            Number(
                gridSizeInput.value
            );


        if (
            Number.isFinite(
                parsedGridSize
            )
        ) {

            level.gridSize =
                Math.max(
                    2,
                    Math.min(
                        20,
                        Math.round(
                            parsedGridSize
                        )
                    )
                );

        }

    } else {

        level.gridSize =
            COORDINATE_GRID_SIZE;

    }


/*
    SAVE MAXIMUM BLOCKS
    Empty = no limit.
*/

if (
    isRepetitionLesson() &&
    maxBlocksInput
) {

    const rawValue =
        maxBlocksInput.value;


    if (rawValue === "") {

        level.maxBlocks = null;

    } else {

        const parsedMaxBlocks =
            Number(rawValue);


        if (
            Number.isFinite(
                parsedMaxBlocks
            )
        ) {

            level.maxBlocks =
                Math.max(
                    1,
                    Math.min(
                        50,
                        Math.floor(
                            parsedMaxBlocks
                        )
                    )
                );

        } else {

            level.maxBlocks = null;

        }

    }

} else {

    level.maxBlocks = null;

}
    level.start =
        currentStart
            ? {
                ...currentStart,
                direction:
                    Number(
                        startDirection.value
                    )
            }
            : null;


    level.goal =
        currentGoal
            ? {
                ...currentGoal
            }
            : null;


    level.path =
        [...currentPath];


    level.blocked =
        [...currentBlocked];


    level.buildingTargets = {

        house: [
            ...(currentBuildingTargets.house || [])
        ],

        school: [
            ...(currentBuildingTargets.school || [])
        ],

        garden: [
            ...(currentBuildingTargets.garden || [])
        ]

    };


    level.availableBlocks =
        Array.from(
            availableBlocksList
                .querySelectorAll(
                    'input[type="checkbox"]:checked'
                )
        ).map(
            checkbox =>
                checkbox.value
        );

}


/* =========================================================
   SAVE LEVEL
========================================================= */

function saveLevel() {

    saveCurrentLevelToMemory();


    localStorage.setItem(
        "robotLessons",
        JSON.stringify(lessons)
    );


    saveStatus.textContent =
        "Saved";


    renderLevelList();

}


/* =========================================================
   SAVE BUTTON
========================================================= */

saveButton.addEventListener(
    "click",
    function(event) {

        event.preventDefault();

        saveLevel();

    }
);


/* =========================================================
   LEVEL NAME CHANGE
========================================================= */

levelNameInput.addEventListener(
    "input",
    function() {

        saveStatus.textContent =
            "Unsaved changes";

    }
);


/* =========================================================
   MAXIMUM BLOCKS CHANGE
========================================================= */

if (maxBlocksInput) {

    maxBlocksInput.addEventListener(
        "change",
        function() {

            if (!isRepetitionLesson()) {

                return;

            }


            saveStatus.textContent =
                "Unsaved changes";

        }
    );

}

/* =========================================================
   GRID SIZE CHANGE
========================================================= */

gridSizeInput.addEventListener(
    "change",
    function() {

        if (isCoordinateLesson()) {

            return;

        }


        const newSize =
            Math.max(
                2,
                Math.min(
                    20,
                    Number(
                        gridSizeInput.value
                    ) || DEFAULT_GRID_SIZE
                )
            );


        gridSizeInput.value =
            newSize;


        const level =
            lesson.levels[
                currentLevelIndex
            ];


        level.gridSize =
            newSize;


        currentPath =
            currentPath.filter(
                function(key) {

                    const parts =
                        key.split(",");

                    const x =
                        Number(parts[0]);

                    const y =
                        Number(parts[1]);

                    return (
                        x >= 0 &&
                        x < newSize &&
                        y >= 0 &&
                        y < newSize
                    );

                }
            );


        currentBlocked =
            currentBlocked.filter(
                function(key) {

                    const parts =
                        key.split(",");

                    const x =
                        Number(parts[0]);

                    const y =
                        Number(parts[1]);

                    return (
                        x >= 0 &&
                        x < newSize &&
                        y >= 0 &&
                        y < newSize
                    );

                }
            );


        if (
            currentStart &&
            (
                currentStart.x >= newSize ||
                currentStart.y >= newSize
            )
        ) {

            currentStart = null;

        }


        if (
            currentGoal &&
            (
                currentGoal.x >= newSize ||
                currentGoal.y >= newSize
            )
        ) {

            currentGoal = null;

        }


        [
            "house",
            "school",
            "garden"
        ].forEach(
            function(type) {

                currentBuildingTargets[type] =
                    (
                        currentBuildingTargets[type] ||
                        []
                    ).filter(
                        function(key) {

                            const parts =
                                key.split(",");

                            const x =
                                Number(parts[0]);

                            const y =
                                Number(parts[1]);

                            return (
                                x >= 0 &&
                                x < newSize &&
                                y >= 0 &&
                                y < newSize
                            );

                        }
                    );

            }
        );


        renderMap();


        saveStatus.textContent =
            "Unsaved changes";

    }
);


/* =========================================================
   START DIRECTION CHANGE
========================================================= */

startDirection.addEventListener(
    "change",
    function() {

        if (!currentStart) {

            saveStatus.textContent =
                "Unsaved changes";

            return;

        }


        currentStart.direction =
            Number(
                startDirection.value
            );


        renderMap();


        saveStatus.textContent =
            "Unsaved changes";

    }
);


/* =========================================================
   BACK BUTTON
========================================================= */

backButton.addEventListener(
    "click",
    function() {

        saveCurrentLevelToMemory();


        localStorage.setItem(
            "robotLessons",
            JSON.stringify(lessons)
        );


        window.location.href =
            "admin.html";

    }
);


/* =========================================================
   INITIALIZE
========================================================= */

prepareLevels();

if (bonusInput) {

    bonusInput.max =
        Math.max(0, lesson.levels.length - 1);

    bonusInput.value =
        getBonusCount();

}

loadLessonInfo();

loadCurrentLevel();