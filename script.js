(function () {
  "use strict";

  const STORAGE_COURSES = "gpa_calc_courses_v1";
  const STORAGE_SEMESTERS = "gpa_calc_semesters_v1";
  const STORAGE_WEIGHTED = "gpa_calc_weighted_v1";

  const MAX_CREDITS = 6;
  const MIN_CREDITS = 0.5;
  const HONORS_BONUS = 1.0;
  const DEBOUNCE_MS = 300;

  // ---- DOM refs --
  const rowsBody = document.getElementById("courseRows");
  const rowTemplate = document.getElementById("rowTemplate");
  const emptyState = document.getElementById("emptyState");
  const addRowBtn = document.getElementById("addRowBtn");
  const saveSemesterBtn = document.getElementById("saveSemesterBtn");
  const clearAllBtn = document.getElementById("clearAllBtn");
  const weightedToggle = document.getElementById("weightedToggle");

  const gpaStamp = document.getElementById("gpaStamp");
  const gpaValue = document.getElementById("gpaValue");
  const totalCreditsEl = document.getElementById("totalCredits");
  const qualityPointsEl = document.getElementById("qualityPoints");
  const cumulativeGpaEl = document.getElementById("cumulativeGpa");
  const historyList = document.getElementById("historyList");

  let saveTimer = null;

  let courses = loadCourses();
  let semesters = loadSemesters();

  weightedToggle.checked = localStorage.getItem(STORAGE_WEIGHTED) === "true";

  if (courses.length === 0) {
    addRow(); // start with one empty row so the ledger isn't blank
  } else {
    courses.forEach((c) => addRow(c));
  }
  renderHistory();
  recalculate();

  // ---- Event listeners ----
  addRowBtn.addEventListener("click", () => {
    addRow();
    syncCoursesFromDOM();
    recalculate();
  });

  saveSemesterBtn.addEventListener("click", saveSemester);
  clearAllBtn.addEventListener("click", clearAll);

  weightedToggle.addEventListener("change", () => {
    localStorage.setItem(STORAGE_WEIGHTED, weightedToggle.checked);
    recalculate();
  });

  rowsBody.addEventListener("input", (e) => {
    if (e.target.matches(".course-credits")) validateCredits(e.target);
    syncCoursesFromDOM();
    debouncedPersist();
    recalculate();
  });

  rowsBody.addEventListener("change", (e) => {
    if (e.target.matches(".course-grade, .course-honors")) {
      syncCoursesFromDOM();
      debouncedPersist();
      recalculate();
    }
  });

  rowsBody.addEventListener("click", (e) => {
    const btn = e.target.closest(".row-remove");
    if (!btn) return;
    const row = btn.closest("tr");
    row.remove();
    syncCoursesFromDOM();
    debouncedPersist();
    recalculate();
  });

  // ---- Row management ----
  function addRow(course) {
    const frag = rowTemplate.content.cloneNode(true);
    const nameInput = frag.querySelector(".course-name");
    const creditsInput = frag.querySelector(".course-credits");
    const gradeSelect = frag.querySelector(".course-grade");
    const honorsCheck = frag.querySelector(".course-honors");

    if (course) {
      nameInput.value = course.name || "";
      creditsInput.value = course.credits ?? "";
      gradeSelect.value = String(course.gradePoints ?? "");
      honorsCheck.checked = !!course.honors;
    }

    rowsBody.appendChild(frag);
    toggleEmptyState();
  }

  function toggleEmptyState() {
    const hasRows = rowsBody.children.length > 0;
    emptyState.classList.toggle("visible", !hasRows);
  }

  // ---- Validation ----
  function validateCredits(input) {
    const val = parseFloat(input.value);
    const isValid =
      input.value === "" ||
      (!Number.isNaN(val) && val >= MIN_CREDITS && val <= MAX_CREDITS);
    input.classList.toggle("invalid", !isValid);
    return isValid;
  }

  // ---- Sync DOM -> state ----
  function syncCoursesFromDOM() {
    courses = Array.from(rowsBody.querySelectorAll("tr")).map((row) => {
      const name = row.querySelector(".course-name").value.trim();
      const creditsRaw = row.querySelector(".course-credits").value;
      const gradeRaw = row.querySelector(".course-grade").value;
      const honors = row.querySelector(".course-honors").checked;
      return {
        name,
        credits: creditsRaw === "" ? null : parseFloat(creditsRaw),
        gradePoints: gradeRaw === "" ? null : parseFloat(gradeRaw),
        honors,
      };
    });
    toggleEmptyState();
  }

  // ---- Calculation ----
  function recalculate() {
    const weighted = weightedToggle.checked;
    let totalCredits = 0;
    let totalQualityPoints = 0;

    courses.forEach((c) => {
      const credits = c.credits;
      const grade = c.gradePoints;
      if (credits === null || Number.isNaN(credits)) return;
      if (credits < MIN_CREDITS || credits > MAX_CREDITS) return;
      if (grade === null || Number.isNaN(grade)) return;

      let points = grade;
      if (weighted && c.honors) points += HONORS_BONUS;

      totalCredits += credits;
      totalQualityPoints += points * credits;
    });

    const semesterGpa = totalCredits > 0 ? totalQualityPoints / totalCredits : null;

    // Update stamp
    const maxScale = weighted ? 5.0 : 4.0;
    const pct = semesterGpa === null ? 0 : Math.min(100, (semesterGpa / maxScale) * 100);
    gpaStamp.style.setProperty("--pct", pct.toFixed(1));
    gpaValue.textContent = semesterGpa === null ? "—" : semesterGpa.toFixed(2);

    totalCreditsEl.textContent = totalCredits > 0 ? trimNumber(totalCredits) : "0";
    qualityPointsEl.textContent = totalQualityPoints.toFixed(2);

    // Cumulative = saved semesters + current in-progress semester
    const cumulative = computeCumulative(totalCredits, totalQualityPoints);
    cumulativeGpaEl.textContent = cumulative === null ? "—" : cumulative.toFixed(2);
  }

  function computeCumulative(currentCredits, currentQualityPoints) {
    let credits = currentCredits;
    let points = currentQualityPoints;
    semesters.forEach((s) => {
      credits += s.totalCredits;
      points += s.totalQualityPoints;
    });
    return credits > 0 ? points / credits : null;
  }

  function trimNumber(n) {
    return Number.isInteger(n) ? String(n) : n.toFixed(1);
  }

  // ---- Persistence ----
  function debouncedPersist() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persistCourses, DEBOUNCE_MS);
  }

  function persistCourses() {
    localStorage.setItem(STORAGE_COURSES, JSON.stringify(courses));
  }

  function loadCourses() {
    try {
      const raw = localStorage.getItem(STORAGE_COURSES);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function loadSemesters() {
    try {
      const raw = localStorage.getItem(STORAGE_SEMESTERS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function persistSemesters() {
    localStorage.setItem(STORAGE_SEMESTERS, JSON.stringify(semesters));
  }

  // ---- Semester save / history ----
  function saveSemester() {
    syncCoursesFromDOM();

    const weighted = weightedToggle.checked;
    let totalCredits = 0;
    let totalQualityPoints = 0;

    courses.forEach((c) => {
      if (c.credits === null || c.gradePoints === null) return;
      if (c.credits < MIN_CREDITS || c.credits > MAX_CREDITS) return;
      let points = c.gradePoints;
      if (weighted && c.honors) points += HONORS_BONUS;
      totalCredits += c.credits;
      totalQualityPoints += points * c.credits;
    });

    if (totalCredits === 0) {
      alert("Add at least one valid course before saving this semester.");
      return;
    }

    const label = prompt("Name this semester (e.g. Fall 2026):", `Semester ${semesters.length + 1}`);
    if (label === null) return; // cancelled

    semesters.push({
      name: label.trim() || `Semester ${semesters.length + 1}`,
      totalCredits,
      totalQualityPoints,
      gpa: totalQualityPoints / totalCredits,
      savedAt: new Date().toISOString(),
    });
    persistSemesters();
    renderHistory();

    // start a fresh semester
    courses = [];
    persistCourses();
    rowsBody.innerHTML = "";
    addRow();
    recalculate();
  }

  function renderHistory() {
    historyList.innerHTML = "";
    if (semesters.length === 0) {
      const li = document.createElement("li");
      li.className = "history-empty";
      li.textContent = "No semesters saved yet.";
      historyList.appendChild(li);
      return;
    }
    semesters.forEach((s) => {
      const li = document.createElement("li");
      const nameSpan = document.createElement("span");
      nameSpan.textContent = s.name;
      const gpaSpan = document.createElement("span");
      gpaSpan.textContent = s.gpa.toFixed(2);
      li.appendChild(nameSpan);
      li.appendChild(gpaSpan);
      historyList.appendChild(li);
    });
  }

  // ---- Clear all ----
  function clearAll() {
    const confirmed = confirm(
      "This clears all courses and saved semesters from this browser. Continue?"
    );
    if (!confirmed) return;

    courses = [];
    semesters = [];
    localStorage.removeItem(STORAGE_COURSES);
    localStorage.removeItem(STORAGE_SEMESTERS);
    rowsBody.innerHTML = "";
    addRow();
    renderHistory();
    recalculate();
  }
})();