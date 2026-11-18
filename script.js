
/* ==========================================
   WORD GARDEN — COMPLETE JAVASCRIPT
========================================== */

"use strict";

/* ==========================================
   1. ELEMENTS AND APP STATE
========================================== */

const pageIds = [
    "welcomePage",
    "listsPage",
    "wordsPage",
    "addWordPage",
    "calendarPage",
    "flashcardsPage",
    "profilePage",
    "profileEditPage"
];

const pages = Object.fromEntries(
    pageIds.map(id => [id, document.getElementById(id)])
);

const $ = id => document.getElementById(id);

const STORAGE_KEY = "wordGardenData";
const PROFILE_KEY = "wordGardenProfile";
const STUDY_KEY = "wordGardenStudyDates";
const REVIEWS_KEY = "wordGardenDailyReviews";

let lists = [];
let currentListId = null;
let currentCardIndex = 0;
let currentFilter = "all";
let editingListId = null;
let sortAlphabetically = false;

let selectedAvatar = "./images/round-image.jpg";
let selectedName = "Your Name";
let currentPage = "welcomePage";

const today = new Date();

let displayedMonth = new Date(
    today.getFullYear(),
    today.getMonth(),
    1
);

let selectedDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
);


/* ==========================================
   2. STORAGE
========================================== */

function safeRead(key, fallback) {
    try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : fallback;
    } catch (error) {
        console.error("Storage error:", error);
        return fallback;
    }
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
}

function loadData() {
    const saved = safeRead(STORAGE_KEY, []);

    lists = Array.isArray(saved) ? saved : [];

    lists.forEach(list => {
        if (!list.id) list.id = createId();

        if (!Array.isArray(list.words)) {
            list.words = [];
        }

        list.words.forEach(word => {
            if (!word.id) word.id = createId();
            if (!word.status) word.status = "unsure";
        });
    });

    if (lists.length && !getCurrentList()) {
        currentListId = lists[0].id;
    }

    const profile = safeRead(PROFILE_KEY, {});

    selectedName = profile.name || "Your Name";
    selectedAvatar = profile.avatar || "./images/round-image.jpg";
}

function saveProfile() {
    localStorage.setItem(PROFILE_KEY, JSON.stringify({
        name: selectedName,
        avatar: selectedAvatar
    }));
}

function createId() {
    return Date.now().toString(36) +
        Math.random().toString(36).slice(2, 9);
}

function getCurrentList() {
    return lists.find(list =>
        String(list.id) === String(currentListId)
    );
}


/* ==========================================
   3. PAGE NAVIGATION
========================================== */

function showPage(pageId) {
    if (!pages[pageId]) {
        console.error("Page does not exist:", pageId);
        return;
    }

    Object.values(pages).forEach(page => {
        if (page) page.hidden = true;
    });

    pages[pageId].hidden = false;
    currentPage = pageId;

    updateNavigation();
    updateAvatarImages();

    if (pageId === "listsPage") renderLists();
    if (pageId === "wordsPage") renderWords();
    if (pageId === "flashcardsPage") {
        fillFlashcardsListSelect();
        renderFlashcard();
    }
    if (pageId === "calendarPage") {
        renderCalendar();
        updateStatistics();
        updateSelectedDate();
    }
    if (pageId === "profilePage") renderProfile();

    window.scrollTo(0, 0);
}

function updateNavigation() {
    document.querySelectorAll("[data-open-page]").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.openPage === currentPage
        );
    });
}

// All bottom navigation buttons use this one listener.

document.addEventListener("click", event => {
    const button = event.target.closest("[data-open-page]");

    if (!button) return;

    event.preventDefault();

    const destination = button.dataset.openPage;

    if (destination === "flashcardsPage" && lists.length === 0) {
        alert("Create a list first!");
        return;
    }

    if (destination === "flashcardsPage" && !getCurrentList()) {
        currentListId = lists[0].id;
    }

    showPage(destination);
});


/* ==========================================
   4. WELCOME PAGE
========================================== */

$("startButton").addEventListener("click", () => {
    showPage("listsPage");
});


/* ==========================================
   5. LISTS
========================================== */

function openListModal(list = null) {
    editingListId = list ? list.id : null;

    $("listNameInput").value = list ? list.name : "";

    $("listModalTitle").innerHTML = list
        ? "Rename your list"
        : "Type the name of<br>your new list";

    $("modalOverlay").classList.add("active");

    $("listNameInput").focus();
}

function closeListModal() {
    $("modalOverlay").classList.remove("active");
    $("listNameInput").value = "";
    editingListId = null;
}

$("addButton").addEventListener("click", () => {
    openListModal();
});

$("closeModal").addEventListener("click", closeListModal);

$("modalOverlay").addEventListener("click", event => {
    if (event.target === $("modalOverlay")) {
        closeListModal();
    }
});

$("listNameInput").addEventListener("keydown", event => {
    if (event.key === "Enter") saveList();
});

$("confirmButton").addEventListener("click", saveList);

function saveList() {
    const name = $("listNameInput").value.trim();

    if (!name) {
        alert("Please enter a list name.");
        return;
    }

    if (editingListId !== null) {
        const list = lists.find(item =>
            String(item.id) === String(editingListId)
        );

        if (list) list.name = name;

    } else {
        const newList = {
            id: createId(),
            name,
            words: []
        };

        lists.push(newList);
        currentListId = newList.id;
    }

    saveData();
    closeListModal();
    renderLists();
}

function renderLists() {
    const container = $("listsContainer");

    container.innerHTML = "";

    let visibleLists = [...lists];

    const search = $("searchInput").value.trim().toLowerCase();

    if (search) {
        visibleLists = visibleLists.filter(list =>
            list.name.toLowerCase().includes(search)
        );
    }

    if (sortAlphabetically) {
        visibleLists.sort((a, b) =>
            a.name.localeCompare(b.name)
        );
    }

    if (!visibleLists.length) {
        const message = document.createElement("p");

        message.className = "no-lists-message";
        message.textContent = lists.length
            ? "No lists found."
            : "Your garden is empty. Create your first list!";

        container.appendChild(message);
        return;
    }

    visibleLists.forEach(list => {
        const card = document.createElement("article");
        card.className = "list-card";

        const content = document.createElement("div");
        content.className = "list-card-content";

        const title = document.createElement("h2");
        title.className = "list-title";
        title.textContent = list.name;

        const meta = document.createElement("div");
        meta.className = "list-meta";
        meta.textContent = `🪶 ${list.words.length}`;

        content.append(title, meta);

        const dots = document.createElement("button");
        dots.className = "dots-button";
        dots.textContent = "⋮";
        dots.setAttribute("aria-label", "List options");

        const menu = document.createElement("div");
        menu.className = "context-menu";

        const rename = createMenuButton("Rename");
        const duplicate = createMenuButton("Duplicate");
        const remove = createMenuButton("Delete");

        menu.append(rename, duplicate, remove);
        card.append(content, dots, menu);

        content.addEventListener("click", () => {
            currentListId = list.id;
            currentFilter = "all";
            showPage("wordsPage");
        });

        dots.addEventListener("click", event => {
            event.stopPropagation();

            document.querySelectorAll(".context-menu").forEach(item => {
                if (item !== menu) item.classList.remove("active");
            });

            menu.classList.toggle("active");
        });

        rename.addEventListener("click", event => {
            event.stopPropagation();
            openListModal(list);
        });

        duplicate.addEventListener("click", event => {
            event.stopPropagation();

            const copy = {
                id: createId(),
                name: list.name + " copy",
                words: list.words.map(word => ({
                    ...word,
                    id: createId()
                }))
            };

            lists.push(copy);
            saveData();
            renderLists();
        });

        remove.addEventListener("click", event => {
            event.stopPropagation();

            if (!confirm(`Delete "${list.name}" and all its words?`)) {
                return;
            }

            lists = lists.filter(item =>
                String(item.id) !== String(list.id)
            );

            if (String(currentListId) === String(list.id)) {
                currentListId = lists.length ? lists[0].id : null;
            }

            saveData();
            renderLists();
        });

        container.appendChild(card);
    });
}

function createMenuButton(text) {
    const button = document.createElement("button");
    button.className = "context-menu-item";
    button.textContent = text;
    return button;
}

$("searchInput").addEventListener("input", renderLists);

$("sortButton").addEventListener("click", () => {
    sortAlphabetically = !sortAlphabetically;
    $("sortButton").classList.toggle("active", sortAlphabetically);
    renderLists();
});

document.addEventListener("click", event => {
    if (!event.target.closest(".list-card")) {
        document.querySelectorAll(".context-menu").forEach(menu => {
            menu.classList.remove("active");
        });
    }
});


/* ==========================================
   6. WORDS PAGE
========================================== */

function openWordsPage() {
    const list = getCurrentList();
    if (!list) return;

    $("currentListName").textContent = list.name;
    $("addWordListName").textContent = list.name;

    showPage("wordsPage");
}

$("wordsBackButton").addEventListener("click", () => {
    showPage("listsPage");
});

$("wordAddButton").addEventListener("click", () => {
    const list = getCurrentList();

    if (!list) return;

    $("wordForm").reset();
    $("addWordListName").textContent = list.name;

    showPage("addWordPage");
});

document.querySelectorAll(".filter-dot").forEach(button => {
    button.addEventListener("click", () => {
        currentFilter = button.dataset.filter;

        document.querySelectorAll(".filter-dot").forEach(item => {
            item.classList.toggle(
                "active",
                item.dataset.filter === currentFilter
            );
        });

        renderWords();
    });
});

function renderWords() {
    const list = getCurrentList();

    if (!list) return;

    const container = $("wordsContainer");
    container.innerHTML = "";

    $("currentListName").textContent = list.name;
    $("wordTotal").textContent = list.words.length;

    const filtered = list.words.filter(word => {
        if (currentFilter === "all") return true;
        return word.status === currentFilter;
    });

    if (!filtered.length) {
        const message = document.createElement("p");

        message.className = "no-words";
        message.textContent = list.words.length
            ? "No words in this category."
            : "No words yet. Add your first word!";

        container.appendChild(message);
        return;
    }

    filtered.forEach(word => {
        const card = document.createElement("article");
        card.className = "word-card";

        const title = document.createElement("h3");
        title.className = "word-card-word";
        title.textContent = word.word;

        const status = document.createElement("button");
        status.className = "word-status";
        status.dataset.status = word.status || "unsure";
        status.title = "Change word status";

        const number = document.createElement("span");
        number.className = "word-number";
        number.textContent = list.words.indexOf(word) + 1;

        const details = document.createElement("div");
        details.className = "word-details";

        addWordDetail(details, "Translation:", word.translation);
        addWordDetail(details, "Transcription:", word.transcription);
        addWordDetail(details, "Definition:", word.definition);

        const deleteButton = document.createElement("button");
        deleteButton.className = "delete-word-button";
        deleteButton.textContent = "Delete word";

        deleteButton.addEventListener("click", event => {
            event.stopPropagation();

            if (!confirm(`Delete "${word.word}"?`)) return;

            list.words = list.words.filter(item =>
                item.id !== word.id
            );

            saveData();
            renderWords();
        });

        status.addEventListener("click", event => {
            event.stopPropagation();

            const statuses = ["unsure", "unknown", "known"];
            const index = statuses.indexOf(word.status || "unsure");

            word.status = statuses[(index + 1) % statuses.length];

            saveData();
            renderWords();
        });

        card.append(title, status, number, details, deleteButton);

        card.addEventListener("click", () => {
            card.classList.toggle("expanded");
        });

        container.appendChild(card);
    });
}

function addWordDetail(container, label, value) {
    const heading = document.createElement("p");
    heading.className = "detail-heading";

    const strong = document.createElement("strong");
    strong.textContent = label;
    heading.appendChild(strong);

    const text = document.createElement("p");
    text.className = "detail-text";
    text.textContent = value || "Not added yet";

    container.append(heading, text);
}


/* ==========================================
   7. ADD WORD PAGE
========================================== */

$("addWordBackButton").addEventListener("click", () => {
    showPage("wordsPage");
});

$("wordForm").addEventListener("submit", event => {
    event.preventDefault();

    const list = getCurrentList();
    if (!list) return;

    const word = {
        id: createId(),
        word: $("wordInput").value.trim(),
        translation: $("translationInput").value.trim(),
        transcription: $("transcriptionInput").value.trim(),
        definition: $("definitionInput").value.trim(),
        status: "unsure"
    };

    if (!word.word) return;

    list.words.push(word);

    saveData();

    $("wordForm").reset();

    currentFilter = "all";

    document.querySelectorAll(".filter-dot").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.filter === "all"
        );
    });

    showPage("wordsPage");
});


/* ==========================================
   8. FLASHCARDS
========================================== */

function fillFlashcardsListSelect() {
    const select = $("flashcardsListSelect");

    select.innerHTML = "";

    lists.forEach(list => {
        const option = document.createElement("option");

        option.value = list.id;
        option.textContent = list.name;

        select.appendChild(option);
    });

    if (getCurrentList()) {
        select.value = currentListId;
    }
}

$("flashcardsListSelect").addEventListener("change", event => {
    currentListId = event.target.value;
    currentCardIndex = 0;
    renderFlashcard();
});

function renderFlashcard() {
    const list = getCurrentList();

    const card = $("flashcard");
    const empty = $("flashcardEmpty");
    const actions = document.querySelector(".flashcard-actions");
    const previous = $("previousWordButton");

    if (!list || !list.words.length) {
        card.hidden = true;
        empty.hidden = false;
        actions.hidden = true;
        previous.hidden = true;
        return;
    }

    card.hidden = false;
    empty.hidden = true;
    actions.hidden = false;
    previous.hidden = false;

    currentCardIndex =
        (currentCardIndex + list.words.length) % list.words.length;

    const word = list.words[currentCardIndex];

    $("flashcardNumber").textContent = currentCardIndex + 1;
    $("flashcardWord").textContent = word.word;
    $("flashcardTranscription").textContent = word.transcription || "";

    $("flashcardTranslation").textContent =
        word.translation || "Not added yet";

    $("flashcardOriginalWord").textContent = word.word;

    $("flashcardBackTranscription").textContent =
        word.transcription || "";

    $("flashcardStatusDot").dataset.status =
        word.status || "unsure";

    card.classList.remove("revealed");
}

$("flashcard").addEventListener("click", () => {
    $("flashcard").classList.toggle("revealed");
});

function markFlashcard(status) {
    const list = getCurrentList();

    if (!list || !list.words.length) return;

    const word = list.words[currentCardIndex];

    word.status = status;

    recordStudy();

    saveData();

    currentCardIndex++;

    if (currentCardIndex >= list.words.length) {
        currentCardIndex = 0;
    }

    renderFlashcard();
}

$("unknownButton").addEventListener("click", () => {
    markFlashcard("unknown");
});

$("unsureButton").addEventListener("click", () => {
    markFlashcard("unsure");
});

$("knownButton").addEventListener("click", () => {
    markFlashcard("known");
});

$("previousWordButton").addEventListener("click", () => {
    const list = getCurrentList();

    if (!list || !list.words.length) return;

    currentCardIndex--;
    renderFlashcard();
});

$("flashcardsBackToLists").addEventListener("click", () => {
    showPage("listsPage");
});


/* ==========================================
   9. CALENDAR
========================================== */

const monthNames = [
    "January", "February", "March",
    "April", "May", "June",
    "July", "August", "September",
    "October", "November", "December"
];

function dateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function getStudiedDays() {
    const data = safeRead(STUDY_KEY, []);
    return Array.isArray(data) ? data : [];
}

function getDailyReviews() {
    const data = safeRead(REVIEWS_KEY, {});
    return data && typeof data === "object" ? data : {};
}

function renderCalendar() {
    const year = displayedMonth.getFullYear();
    const month = displayedMonth.getMonth();

    $("calendarMonth").textContent = monthNames[month];
    $("calendarYear").textContent = year;

    const container = $("calendarDays");
    container.innerHTML = "";

    const startingDay =
        (new Date(year, month, 1).getDay() + 6) % 7;

    const daysInMonth =
        new Date(year, month + 1, 0).getDate();

    const studiedDays = getStudiedDays();

    // Empty spaces before day 1.

    for (let i = 0; i < startingDay; i++) {
        const empty = document.createElement("div");
        empty.className = "calendar-day empty";
        container.appendChild(empty);
    }

    // Every actual date in the month.

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const key = dateKey(date);

        const button = document.createElement("button");

        button.type = "button";
        button.className = "calendar-day";
        button.textContent = day;

        if (key === dateKey(today)) {
            button.classList.add("today");
        }

        if (key === dateKey(selectedDate)) {
            button.classList.add("selected");
        }

        if (studiedDays.includes(key)) {
            button.classList.add("studied");
        }

        button.addEventListener("click", () => {
            selectedDate = date;
            renderCalendar();
            updateSelectedDate();
        });

        container.appendChild(button);
    }
}

$("previousMonth").addEventListener("click", () => {
    displayedMonth.setMonth(displayedMonth.getMonth() - 1);
    renderCalendar();
});

$("nextMonth").addEventListener("click", () => {
    displayedMonth.setMonth(displayedMonth.getMonth() + 1);
    renderCalendar();
});


/* ==========================================
   10. STREAK AND DAILY GOAL
========================================== */

function calculateStreak() {
    const studied = new Set(getStudiedDays());

    let current = new Date(today);

    if (!studied.has(dateKey(current))) {
        current.setDate(current.getDate() - 1);
    }

    if (!studied.has(dateKey(current))) {
        return 0;
    }

    let streak = 0;

    while (studied.has(dateKey(current))) {
        streak++;

        current.setDate(current.getDate() - 1);
    }

    return streak;
}

function updateStatistics() {
    const streak = calculateStreak();

    $("streakNumber").textContent = streak;

    const reviews = getDailyReviews();
    const count = reviews[dateKey(today)] || 0;

    const goal = 10;

    const progress = Math.min(count / goal * 100, 100);

    $("goalProgressFill").style.width = progress + "%";

    $("goalCount").textContent =
        `${count} / ${goal} words reviewed`;

    $("goalMessage").textContent =
        count >= goal
            ? "Amazing! You reached your daily goal!"
            : "Keep learning, you're doing great!";

    $("streakMessage").textContent = streak === 0
        ? "Start today and grow your learning streak!"
        : streak === 1
            ? "Your streak is 1 day. Keep growing!"
            : `Your streak is already ${streak} days. Congratulations!`;
}

function updateSelectedDate() {
    const day = String(selectedDate.getDate()).padStart(2, "0");
    const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const year = selectedDate.getFullYear();

    $("selectedDate").textContent = `${day}.${month}.${year}`;

    $("selectedTime").textContent =
        selectedDate.toLocaleDateString("en-US", {
            weekday: "short"
        });

    const key = dateKey(selectedDate);

    if (getStudiedDays().includes(key)) {
        $("streakMessage").textContent =
            "You studied on this day. Well done!";
    } else if (key === dateKey(today)) {
        $("streakMessage").textContent =
            "Today is a new chance to learn something!";
    } else if (selectedDate > today) {
        $("streakMessage").textContent =
            "A new day, a new opportunity!";
    } else {
        $("streakMessage").textContent =
            "Every day is another chance to grow.";
    }
}

function recordStudy() {
    const key = dateKey(new Date());

    const studied = getStudiedDays();

    if (!studied.includes(key)) {
        studied.push(key);

        localStorage.setItem(
            STUDY_KEY,
            JSON.stringify(studied)
        );
    }

    const reviews = getDailyReviews();

    reviews[key] = (reviews[key] || 0) + 1;

    localStorage.setItem(
        REVIEWS_KEY,
        JSON.stringify(reviews)
    );

    updateStatistics();
    renderCalendar();
}


/* ==========================================
   11. PROFILE PAGE
========================================== */

function renderProfile() {
    const totalWords = lists.reduce(
        (total, list) => total + list.words.length,
        0
    );

    $("profileName").textContent = selectedName;
    $("profileStreak").textContent = calculateStreak();
    $("profileLists").textContent = lists.length;
    $("profileWords").textContent = totalWords;

    $("profileStreakText").textContent =
        calculateStreak() > 0
            ? `Your learning streak is ${calculateStreak()} days!`
            : "Your learning journey starts here.";

    $("profileAvatar").src = selectedAvatar;
}

function updateAvatarImages() {
    document.querySelectorAll(
        ".avatar-nav img, .top-avatar, .profile-small"
    ).forEach(img => {
        img.src = selectedAvatar;
    });
}

$("editProfileButton").addEventListener("click", () => {
    $("profileNameInput").value = selectedName;

    $("editAvatarPreview").src = selectedAvatar;

    document.querySelectorAll(".avatar-choice").forEach(button => {
        button.classList.toggle(
            "selected",
            button.dataset.avatar === selectedAvatar
        );
    });

    showPage("profileEditPage");
});

$("profileEditBackButton").addEventListener("click", () => {
    showPage("profilePage");
});

document.querySelectorAll(".avatar-choice").forEach(button => {
    button.addEventListener("click", () => {
        const image = button.dataset.avatar;

        $("editAvatarPreview").src = image;

        document.querySelectorAll(".avatar-choice").forEach(item => {
            item.classList.remove("selected");
        });

        button.classList.add("selected");
    });
});

$("saveProfileButton").addEventListener("click", () => {
    selectedName =
        $("profileNameInput").value.trim() || "Your Name";

    const selected = document.querySelector(
        ".avatar-choice.selected"
    );

    if (selected) {
        selectedAvatar = selected.dataset.avatar;
    }

    saveProfile();

    updateAvatarImages();

    showPage("profilePage");
});


/* ==========================================
   12. INITIALIZE
========================================== */

loadData();

updateAvatarImages();

showPage("welcomePage");

console.log("Word Garden successfully initialized!");
