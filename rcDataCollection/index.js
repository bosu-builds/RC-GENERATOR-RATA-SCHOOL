"use strict";

/* ================================
   DOM ELEMENTS
================================ */
const studentForm = document.getElementById("studentForm");
const scoresForm = document.getElementById("scoresForm");
const ovrPerformanceForm = document.getElementById("ovrPerformance");
const nextStuInfoBtn = document.getElementById("Next-Student-Form");
const nextScoresFormBtn = document.getElementById("Next-Scores-Form");
const genRepCardBtn = document.getElementById("genRepCardBtn");
const saveStuBtn = document.getElementById("saveStudentBtn");
const nextStudentBtn = document.getElementById("nextStudentBtn");
const studentDropdown = document.getElementById("studentDropdown");

// studentInfo DOM
const studentName = document.getElementById("studentName");
const grade = document.getElementById("grade");
const term = document.getElementById("term");
const year = document.getElementById("year");

// scoresForm DOM
const englishSba = document.getElementById("english-sba");
const englishExam = document.getElementById("english-exam");
const mathematicsSba = document.getElementById("mathematics-sba");
const mathematicsExam = document.getElementById("mathematics-exam");
const scienceSba = document.getElementById("science-sba");
const scienceExam = document.getElementById("science-exam");
const historySba = document.getElementById("history-sba");
const historyExam = document.getElementById("history-exam");
const rmeSba = document.getElementById("rme-sba");
const rmeExam = document.getElementById("rme-exam");
const computingSba = document.getElementById("computing-sba");
const computingExam = document.getElementById("computing-exam");
const creativeArtsSba = document.getElementById("creativity-sba");
const creativeArtsExam = document.getElementById("creativity-exam");

// Overall Performance DOM
const attendance = document.getElementById("attendance");
const attitude = document.getElementById("attitude");
const character = document.getElementById("character");
const interest = document.getElementById("interest");
const ctRemarks = document.getElementById("ct-remarks");

// HIDE COMPUTING FOR CLASSES BELOW BASIC 4
const computingContainer = document.getElementById("comHide");

// Hide forms by default
scoresForm.classList.add("hidden");
ovrPerformanceForm.classList.add("hidden");

/* ================================
   APP STATE
================================ */
const studentInfo = {};
const subjectScores = {};
const ovrPerformanceDetails = {};

/* ================================
   HELPERS
================================ */
const enableDatalistReopen = function (inputEl) {
  inputEl.addEventListener("focus", function () {
    this.setAttribute("autocomplete", "off");
    this.value = "";
  });

  // STRIP LEADING NUMBERS LIKE (1), (2), ETC.
  inputEl.addEventListener("input", function () {
    this.value = this.value.replace(/^\(\d+\)\s*/, "");
  });
};

// Apply to all relevant datalist inputs
enableDatalistReopen(grade);
enableDatalistReopen(year);
enableDatalistReopen(term);
enableDatalistReopen(attitude);
enableDatalistReopen(character);
enableDatalistReopen(interest);
enableDatalistReopen(ctRemarks);

const checkScoresFormInputs = function () {
  const hasComputing = studentInfo.class >= 4;

  const requiredInputs = [
    englishSba,
    englishExam,
    mathematicsSba,
    mathematicsExam,
    scienceSba,
    scienceExam,
    historySba,
    historyExam,
    rmeSba,
    rmeExam,
    creativeArtsSba,
    creativeArtsExam,
  ];

  if (hasComputing) {
    requiredInputs.push(computingSba, computingExam);
  }

  let allFilled = true;
  for (let i = 0; i < requiredInputs.length; i++) {
    if (!requiredInputs[i].value.trim()) {
      allFilled = false;
      break;
    }
  }

  nextScoresFormBtn.disabled = !allFilled;
  nextScoresFormBtn.classList.toggle("btn-disabled", !allFilled);
};

const calcSubjectTotals = function (sba, examRaw) {
  const s = Number(sba);
  const e = Number(examRaw);
  const exam70 = Math.round((e * 70) / 100);
  return s + exam70;
};

const getGrade = function (total) {
  if (total >= 80) return "A1";
  if (total >= 70) return "B2";
  if (total >= 65) return "B3";
  if (total >= 60) return "C4";
  if (total >= 55) return "C5";
  if (total >= 50) return "C6";
  if (total >= 45) return "D7";
  if (total >= 40) return "E8";
  return "F9";
};

const checkStuInfoInputs = function () {
  const allFilled =
    studentName.value.trim() &&
    grade.value.trim() &&
    term.value.trim() &&
    year.value.trim();

  nextStuInfoBtn.disabled = !allFilled;
  nextStuInfoBtn.classList.toggle("btn-disabled", !allFilled);
};

const checkOvrPerformanceFormInputs = function () {
  const allFilled =
    attendance.value.trim() &&
    attitude.value.trim() &&
    character.value.trim() &&
    interest.value.trim() &&
    ctRemarks.value.trim();

  saveStuBtn.disabled = !allFilled;
  nextStudentBtn.disabled = !allFilled;
  genRepCardBtn.disabled = !allFilled;

  saveStuBtn.classList.toggle("btn-disabled", !allFilled);
  nextStudentBtn.classList.toggle("btn-disabled", !allFilled);
  genRepCardBtn.classList.toggle("btn-disabled", !allFilled);
};

/* ================================
   EVENT LISTENERS
================================ */
const stuInfoInputs = [studentName, grade, term, year];
stuInfoInputs.forEach((input) =>
  input.addEventListener("input", checkStuInfoInputs)
);

// SCORES inputs
const scoresFormInputs = [
  englishSba,
  englishExam,
  mathematicsSba,
  mathematicsExam,
  scienceSba,
  scienceExam,
  historySba,
  historyExam,
  rmeSba,
  rmeExam,
  computingSba,
  computingExam,
  creativeArtsSba,
  creativeArtsExam,
];

// scoresFormInputs.forEach((input) => {
//   if (input) input.addEventListener("input", checkScoresFormInputs);
// });

scoresFormInputs.forEach((input) => {
  if (!input) return;

  input.addEventListener("input", () => {
    if (input.closest(".hidden")) return;
    checkScoresFormInputs();
  });
});

// SBA ranges
document.querySelectorAll(".sba").forEach((input) => {
  input.addEventListener("input", () => {
    const val = Number(input.value);
    if (isNaN(val) || val < 0 || val > 30) input.value = "";
  });
});

// EXAM ranges
document.querySelectorAll(".exam").forEach((input) => {
  input.addEventListener("input", () => {
    const val = Number(input.value);
    if (isNaN(val) || val < 0 || val > 100) input.value = "";
  });
});

// Performance inputs
const ovrPerformanceInputs = [
  attendance,
  attitude,
  character,
  interest,
  ctRemarks,
];
ovrPerformanceInputs.forEach((input) =>
  input.addEventListener("input", checkOvrPerformanceFormInputs)
);

const mapClassToNumber = {
  "Basic 1": 1,
  "Basic 2": 2,
  "Basic 3": 3,
  "Basic 4": 4,
  "Basic 5": 5,
  "Basic 6": 6,
};

/* ================================
   NEXT BUTTON LOGIC
================================ */
nextStuInfoBtn.addEventListener("click", function (event) {
  event.preventDefault();

  studentInfo.name = studentName.value;
  studentInfo.class = mapClassToNumber[grade.value] ?? null;

  const hasComputing = studentInfo.class >= 4;

  if (!hasComputing) {
    computingContainer.classList.add("hidden");
  } else {
    computingContainer.classList.remove("hidden");
  }

  studentInfo.term = Number(term.value);
  studentInfo.year = Number(year.value);

  localStorage.setItem("studentInfo", JSON.stringify(studentInfo));

  nextScoresFormBtn.disabled = true;
  nextScoresFormBtn.classList.add("btn-disabled");

  studentForm.classList.add("hidden");
  scoresForm.classList.remove("hidden");
});

nextScoresFormBtn.addEventListener("click", function (event) {
  event.preventDefault();

  /* DIRECT ASSIGNMENT (your original style) */
  subjectScores.englishSba = Number(englishSba.value);
  subjectScores.englishExam = Number(englishExam.value);

  subjectScores.mathematicsSba = Number(mathematicsSba.value);
  subjectScores.mathematicsExam = Number(mathematicsExam.value);

  subjectScores.scienceSba = Number(scienceSba.value);
  subjectScores.scienceExam = Number(scienceExam.value);

  subjectScores.historySba = Number(historySba.value);
  subjectScores.historyExam = Number(historyExam.value);

  subjectScores.rmeSba = Number(rmeSba.value);
  subjectScores.rmeExam = Number(rmeExam.value);

  if (studentInfo.class >= 4) {
    subjectScores.computingSba = Number(computingSba.value);
    subjectScores.computingExam = Number(computingExam.value);
  }

  subjectScores.creativeArtsSba = Number(creativeArtsSba.value);
  subjectScores.creativeArtsExam = Number(creativeArtsExam.value);

  localStorage.setItem("subjectScores", JSON.stringify(subjectScores));

  scoresForm.classList.add("hidden");
  ovrPerformanceForm.classList.remove("hidden");
});

/* ================================
   SAVE STUDENT
================================ */
saveStuBtn.addEventListener("click", function (event) {
  event.preventDefault();

  ovrPerformanceDetails.attendance = attendance.value;
  ovrPerformanceDetails.attitude = attitude.value;
  ovrPerformanceDetails.character = character.value;
  ovrPerformanceDetails.interest = interest.value;
  ovrPerformanceDetails.ctRemarks = ctRemarks.value;

  const genClassKey = function (studentInfo) {
    return `B${studentInfo.class}-T${studentInfo.term}-Y${studentInfo.year}`;
  };

  const classKey = genClassKey(studentInfo);
  let classDatasets = JSON.parse(localStorage.getItem("classDatasets")) || {};
  if (!classDatasets[classKey]) classDatasets[classKey] = {};

  // THIS IS THE FUNCTION TO GENERATE THE ID FOR THE STUDENT,
  // IT TAKES ONLY THE FIRST NAME AND LAST NAME OF THE STUDENT,
  // AND HANDLES HYPHENATED NAMES PROPERLY
  const generateStudentId = (fullName) => {
    if (!fullName) return ""; // safeguard

    // Trim and split on spaces, preserve hyphens
    const parts = fullName
      .trim()
      .split(/\s+/) // split by spaces
      .filter(Boolean); // remove empty strings

    // Edge case: single name
    if (parts.length === 1) return parts[0].toLowerCase();

    // Take the first and last elements
    const firstName = parts[0];
    const lastName = parts[parts.length - 1];

    // Normalize: lowercase and replace any internal spaces with underscores
    return `${firstName.toLowerCase().replace(/\s+/g, "_")}_${lastName
      .toLowerCase()
      .replace(/\s+/g, "_")}`;
  };

  // Example usage:
  const studentId = generateStudentId(studentInfo.name);

  // === CALCULATE TOTALS ===
  const subjectTotals = {};
  const subjectGrades = {};

  const subjects = [
    "english",
    "mathematics",
    "science",
    "history",
    "rme",
    "creativeArts",
  ];

  if (studentInfo.class >= 4) {
    subjects.push("computing");
  }

  const coreSubjects = ["english", "mathematics", "science", "history"];
  const electiveSubjects = subjects.filter((s) => !coreSubjects.includes(s));

  const electiveGrades = [];

  // Compute totals and grades for core subjects
  coreSubjects.forEach((sub) => {
    const total = calcSubjectTotals(
      subjectScores[sub + "Sba"],
      subjectScores[sub + "Exam"]
    );
    subjectTotals[sub] = total;
    const grade = getGrade(total);
    subjectGrades[sub] = grade;
  });

  // Compute totals and grades for electives
  electiveSubjects.forEach((sub) => {
    const total = calcSubjectTotals(
      subjectScores[sub + "Sba"],
      subjectScores[sub + "Exam"]
    );
    subjectTotals[sub] = total;
    const grade = getGrade(total);
    subjectGrades[sub] = grade;
    electiveGrades.push({
      subject: sub,
      gradeNum: parseInt(grade.match(/\d+/)[0], 10),
    });
  });

  // === AGGREGATE CALCULATION ===
  let aggregate = 0;

  // Add core grades
  coreSubjects.forEach((sub) => {
    aggregate += parseInt(subjectGrades[sub].match(/\d+/)[0], 10);
  });

  // Pick best 2 electives
  electiveGrades.sort((a, b) => a.gradeNum - b.gradeNum); // ascending

  const bestElectives = electiveGrades.slice(0, 2);

  bestElectives.forEach((el) => {
    aggregate += el.gradeNum;
  });

  // === SAVE STUDENT RECORD ===
  const studentRecord = {
    id: studentId,
    info: studentInfo,
    scores: subjectScores,
    totals: subjectTotals,
    grades: subjectGrades,
    aggregate: aggregate,
    performance: ovrPerformanceDetails,
  };

  classDatasets[classKey][studentId] = studentRecord;

  // === COMPUTE CLASS AVERAGES ===
  const students = Object.values(classDatasets[classKey]);
  const totalScores = {};
  const count = {};

  students.forEach((st) => {
    // Skip invalid entries like _averages
    if (!st.totals) return;

    for (const sub of subjects) {
      if (!totalScores[sub]) {
        totalScores[sub] = 0;
        count[sub] = 0;
      }
      totalScores[sub] += st.totals[sub];
      count[sub] += 1;
    }
  });

  const averages = {};
  subjects.forEach((sub) => {
    averages[sub] =
      count[sub] > 0 ? Math.round(totalScores[sub] / count[sub]) : 0;
  });

  classDatasets[classKey]._averages = averages;

  localStorage.setItem("classDatasets", JSON.stringify(classDatasets));

  alert(`Saved: ${studentInfo.name} (Aggregate: ${aggregate})`);
});

/* ================================
   ENTER NEXT STUDENT
================================ */
nextStudentBtn.addEventListener("click", function () {
  studentForm.reset();
  scoresForm.reset();
  ovrPerformanceForm.reset();

  studentForm.classList.remove("hidden");
  scoresForm.classList.add("hidden");
  ovrPerformanceForm.classList.add("hidden");

  nextStuInfoBtn.disabled = true;
  saveStuBtn.disabled = true;
  nextStudentBtn.disabled = true;
  genRepCardBtn.disabled = true;
  nextScoresFormBtn.disabled = true;

  for (const key in subjectScores) delete subjectScores[key];
  for (const key in ovrPerformanceDetails) delete ovrPerformanceDetails[key];

  alert("Ready for the next student.");
});

/* ================================
   GENERATE REPORT CARD
================================ */
genRepCardBtn.addEventListener("click", function (event) {
  event.preventDefault();

  // Load datasets
  const classDatasets = JSON.parse(localStorage.getItem("classDatasets")) || {};

  // Clear dropdown and add placeholder
  studentDropdown.innerHTML = '<option value="">-- Select Student --</option>';

  // ✅ Loop through ALL classes
  const classKeys = Object.keys(classDatasets);
  for (let i = 0; i < classKeys.length; i++) {
    const classKey = classKeys[i];
    const students = classDatasets[classKey];
    const studentIds = Object.keys(students);

    // ✅ Loop through ALL students in this class
    for (let j = 0; j < studentIds.length; j++) {
      const studentId = studentIds[j];
      if (studentId.startsWith("_")) continue; // skip averages

      const stu = students[studentId];

      const option = document.createElement("option");
      option.value = `${classKey}::${studentId}`; // store both values
      option.textContent = `${stu.info.name} (Basic ${stu.info.class}, Term ${stu.info.term}, ${stu.info.year})`;

      studentDropdown.appendChild(option);
    }
  }

  if (studentDropdown.options.length === 1) {
    alert("⚠️ No students saved yet.");
    return;
  }

  studentDropdown.classList.remove("hidden");

  // Listen for selection
  studentDropdown.addEventListener("change", function () {
    if (this.value) {
      const parts = this.value.split("::");
      const classKey = parts[0];
      const studentId = parts[1];

      window.location.href = `rcPdfSheet/RC-F-B.html?classKey=${classKey}&studentId=${studentId}`;
    }
  });
});
