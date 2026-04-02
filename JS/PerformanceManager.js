"use strict";

import { pickerData, mapClassToNumber } from "./SchoolData.js";
import { universalPicker } from "./InterfaceManager.js";
import { getLevelByGrade, validateNumberRange } from "./HelperTools.js";
import { db, _supabase } from "./Database.js";
import { saveToCloudDirect } from "./CloudSync.js";

// UI ELEMENTS - Step 1
const activityBox = document.getElementById("activity-box");
const performanceBtn = document.getElementById("performance-btn");
const performanceStep1Form = document.getElementById("performance-step1");
const perfStep1Grade = document.getElementById("perf-step1-grade");
const perfStep1Term = document.getElementById("perf-step1-term");
const perfStep1Year = document.getElementById("perf-step1-year");
const nextToStep2Btn = document.getElementById("nextToPerformanceStep2");
const backFromStep1Btn = document.getElementById(
  "goBackToHomePageFromPerfStep1",
);

// UI ELEMENTS - Step 2
const ovrPerformanceForm = document.getElementById("ovrPerformance");
const perfStudent = document.getElementById("perf-student");
const saveStudentBtn = document.getElementById("saveStudentBtn");
const nextStudentBtn = document.getElementById("nextStudentBtn");
const goBackBtn = document.getElementById("goBackToHomePageFromOvrPerformance");

// Performance form inputs
const conInput = document.getElementById("con");
const attendanceInput = document.getElementById("attendance");
const attitudeInput = document.getElementById("attitude");
const characterInput = document.getElementById("character");
const interestInput = document.getElementById("interest");
const ctRemarksInput = document.getElementById("ct-remarks");

// State management
let currentCohort = null; // {class, term, year, classKey}
let currentStudent = null;
let lastCohortStudents = null; // Cache students for picker

// Initialize performance flow
export function initPerformanceFlow() {
  if (!performanceBtn) return;

  // Main button click handler - Show Step 1
  performanceBtn.addEventListener("click", () => {
    showPerformanceStep1();
  });

  // Step 1 handlers
  setupStep1Handlers();

  // Step 2 handlers
  setupStep2Handlers();
}

function setupStep1Handlers() {
  // Back button from Step 1
  if (backFromStep1Btn) {
    backFromStep1Btn.addEventListener("click", () => {
      hidePerformanceStep1();
    });
  }

  // Class picker for Step 1
  if (perfStep1Grade) {
    perfStep1Grade.onclick = () => {
      universalPicker.open(
        "perf-step1-grade",
        "Select Class",
        pickerData.classes,
      );
    };
  }

  // Student picker (filtered by classKey) - MOVED TO STEP 1
  if (perfStudent) {
    perfStudent.onclick = () => {
      const grade = perfStep1Grade?.value;
      const term = perfStep1Term?.value;
      const year = perfStep1Year?.value;

      if (!grade) {
        alert("Please select a class first!");
        return;
      }

      // Generate classKey like "KG1-T2-Y2026", "B4-T2-Y2026"
      const classNum = mapClassToNumber[grade];
      const classKey = grade.startsWith("KG")
        ? `${String(classNum)}-T${term}-Y${year}`
        : `B${classNum}-T${term}-Y${year}`;

      loadStudentsForCohort(classKey);
    };
  }

  // Next button from Step 1 to Step 2
  if (nextToStep2Btn) {
    nextToStep2Btn.addEventListener("click", (e) => {
      e.preventDefault();
      moveToStep2();
    });
  }
}

function setupStep2Handlers() {
  // Back button from Step 2
  if (goBackBtn) {
    goBackBtn.addEventListener("click", () => {
      hidePerformanceStep2();
    });
  }

  // Performance field pickers
  setupPerformancePickers();

  // Save and Next buttons
  if (saveStudentBtn) {
    saveStudentBtn.addEventListener("click", savePerformanceData);
  }

  if (nextStudentBtn) {
    nextStudentBtn.addEventListener("click", () => {
      savePerformanceData();
      clearPerformanceForm();
      // Go back to step 1 to select next student
      hidePerformanceStep2();
      showPerformanceStep1();
    });
  }

  // Form validation
  setupFormValidation();
}

function showPerformanceStep1() {
  if (activityBox) activityBox.classList.add("hidden");
  if (performanceStep1Form) performanceStep1Form.classList.remove("hidden");
}

function hidePerformanceStep1() {
  if (performanceStep1Form) performanceStep1Form.classList.add("hidden");
  if (activityBox) activityBox.classList.remove("hidden");
  clearStep1Form();
}

function showPerformanceStep2() {
  if (performanceStep1Form) performanceStep1Form.classList.add("hidden");
  if (ovrPerformanceForm) ovrPerformanceForm.classList.remove("hidden");
}

function hidePerformanceStep2() {
  if (ovrPerformanceForm) ovrPerformanceForm.classList.add("hidden");
  if (activityBox) activityBox.classList.remove("hidden");
  clearPerformanceForm();
  currentCohort = null;
}

function moveToStep2() {
  const grade = perfStep1Grade?.value;
  const term = perfStep1Term?.value;
  const year = perfStep1Year?.value;
  const student = perfStudent?.value;

  if (!grade) {
    alert("Please select a class!");
    return;
  }

  if (!student) {
    alert("Please select a student!");
    return;
  }

  // Find the student from cached cohort students
  if (lastCohortStudents && lastCohortStudents.length > 0) {
    const selectedStudent = lastCohortStudents.find(
      (s) => s.info.name === student,
    );
    if (selectedStudent) {
      currentStudent = selectedStudent;
      loadStudentPerformance(selectedStudent);
    }
  }

  // Generate classKey like "KG1-T2-Y2026", "B4-T2-Y2026"
  const classNum = mapClassToNumber[grade];
  const classKey = grade.startsWith("KG")
    ? `${String(classNum)}-T${term}-Y${year}`
    : `B${classNum}-T${term}-Y${year}`;

  currentCohort = {
    class: grade,
    term: term,
    year: year,
    classKey: classKey,
  };

  showPerformanceStep2();
}

function clearStep1Form() {
  if (perfStep1Grade) perfStep1Grade.value = "";
  if (perfStep1Term) perfStep1Term.value = "2";
  if (perfStep1Year) perfStep1Year.value = "2026";
  if (perfStudent) perfStudent.value = "";
}

function clearPerformanceForm() {
  currentStudent = null;
  if (perfStudent) perfStudent.value = "";
  if (conInput) conInput.value = "";
  if (attendanceInput) attendanceInput.value = "";
  if (attitudeInput) attitudeInput.value = "";
  if (characterInput) characterInput.value = "";
  if (interestInput) interestInput.value = "";
  if (ctRemarksInput) ctRemarksInput.value = "";
}

function setupPerformancePickers() {
  // Attitude picker
  if (attitudeInput) {
    attitudeInput.onclick = () => {
      universalPicker.open("attitude", "Select Attitude", pickerData.attitudes);
    };
  }

  // Character picker
  if (characterInput) {
    characterInput.onclick = () => {
      universalPicker.open(
        "character",
        "Select Conduct",
        pickerData.characters,
      );
    };
  }

  // Interest picker
  if (interestInput) {
    interestInput.onclick = () => {
      universalPicker.open("interest", "Select Interest", pickerData.interests);
    };
  }

  // Remarks picker
  if (ctRemarksInput) {
    ctRemarksInput.onclick = () => {
      universalPicker.open("ct-remarks", "Select Remarks", pickerData.remarks);
    };
  }
}

function setupFormValidation() {
  if (!ovrPerformanceForm) return;

  ovrPerformanceForm.addEventListener("input", (inputEventDetails) => {
    const activeInput = inputEventDetails.target;

    // Validation for Contribution Score (CON) - 0 to 5
    if (activeInput.id === "con") {
      validateNumberRange(activeInput, 0, 5);
    }

    // Validation for Attendance - 0 to 78 days
    if (activeInput.id === "attendance") {
      validateNumberRange(activeInput, 0, 78);
    }
  });
}

// Replace loadStudentsForCohort to use local IndexedDB
async function loadStudentsForCohort(classKey) {
  try {
    const students = await db.master_records
      .where("classKey")
      .equals(classKey)
      .toArray();
    if (!students || students.length === 0) {
      alert("No students found for this class/term/year combination.");
      return;
    }
    lastCohortStudents = students; // Cache for moveToStep2
    const studentNames = students.map((student) => student.info.name);
    universalPicker.open("perf-student", "Select Student", studentNames);
  } catch (error) {
    console.error("Error in loadStudentsForCohort (local):", error);
    alert("Error loading students. Please try again.");
  }
}

function loadStudentPerformance(student) {
  if (!student || !student.performance) return;

  const perf = student.performance;

  if (conInput) conInput.value = perf.con || "";
  if (attendanceInput) attendanceInput.value = perf.attendance || "";
  if (attitudeInput) attitudeInput.value = perf.attitude || "";
  if (characterInput) characterInput.value = perf.character || "";
  if (interestInput) interestInput.value = perf.interest || "";
  if (ctRemarksInput) ctRemarksInput.value = perf.ctRemarks || "";
}

async function savePerformanceData() {
  if (!currentStudent) {
    alert("Please select a student first.");
    return;
  }

  // Collect all performance fields (allow partial saves)
  const con = conInput?.value;
  const attendance = attendanceInput?.value;
  const attitude = attitudeInput?.value;
  const character = characterInput?.value;
  const interest = interestInput?.value;
  const ctRemarks = ctRemarksInput?.value;

  try {
    const performanceData = {
      con: con || "",
      attitude: attitude || "",
      interest: interest || "",
      character: character || "",
      ctRemarks: ctRemarks || "",
      attendance: attendance || "",
    };

    // Update student object
    currentStudent.performance = performanceData;
    currentStudent.updatedAt = new Date().toISOString();

    // Save to cloud via CloudSync (cloud + local DB)
    const success = await saveToCloudDirect(currentStudent);

    if (!success) {
      alert("Error saving performance data. Please try again.");
      return;
    }

    alert("Performance data saved successfully!");
  } catch (error) {
    console.error("Error in savePerformanceData:", error);
    alert("Error saving performance data. Please try again.");
  }
}
