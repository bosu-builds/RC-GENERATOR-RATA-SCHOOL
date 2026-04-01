"use strict";

import { pickerData, schoolSubjects } from "./SchoolData.js";
import { openDirectory } from "./InterfaceManager.js";
import { universalPicker } from "./InterfaceManager.js";
import { pickerMap } from "./InterfaceManager.js";
import {
  initUniversalPicker,
  initActionButtons,
  setupBackButtons,
} from "./InterfaceManager.js";
import { initStudentRegistration } from "./StudentRegistration.js";
import { initAssignmentFlow } from "./AssignmentManager.js";
import { initSBAFlow } from "./SBAManager.js";
import { initExamFlow } from "./ExamManager.js";
import { initReportCardDropdown } from "./ReportCardManager.js";
import { syncAllData } from "./CloudSync.js";
import { getLevelByGrade, validateNumberRange } from "./HelperTools.js";

// SPECIAL CASE: Subjects (Depends on the Grade selected)
// This connects your Subject input to the Picker
const subjectName = document.getElementById("subjectName");
if (subjectName) {
  subjectName.onclick = () => {
    const grade = document.getElementById("grade").value;
    if (!grade) return alert("Please select a class first!");

    const level = getLevelByGrade(grade); // e.g., "primary" or "jhs"
    const subjects = schoolSubjects[level]?.map((s) => s.name) || [];

    universalPicker.open("subjectName", "Select Subject", subjects);
  };
}

// UI ELEMENTS & NAVIGATION
const activityBox = document.getElementById("activity-box");
const examEntryInfoForm = document.getElementById("Exam-Entry-Info");
const NextExamEntryInfoFormBtn = document.getElementById(
  "Next-Exam-Entry-Info",
);
const saveExamScoreBtn = document.getElementById("save-exam-scores-btn");
const dynamicSubjectsContainer = document.getElementById(
  "dynamic-subjects-container",
);
const ovrPerformanceForm = document.getElementById("ovrPerformance");
const genRepCardBtn = document.getElementById("genRepCardBtn");
const saveStuBtn = document.getElementById("saveStudentBtn");
const nextStudentBtn = document.getElementById("nextStudentBtn");
const studentDropdown = document.getElementById("studentDropdown");
const addStudentForm = document.getElementById("addStudentForm");
const assignmentForm = document.getElementById("assignmentForm");
const activityAddStudent = document.getElementById("add-student-btn");
const activitySba = document.getElementById("sba-btn");
const activityExam = document.getElementById("exam-btn");
const assignmentGrade = document.getElementById("assignment-grade");
const subjectOptions = document.getElementById("subjectOptions");
const gradingContainer = document.getElementById("grading-container");
const studentListBody = document.getElementById("student-list-body");
const syncVaultBtn = document.getElementById("syncVaultBtn");

// PERFORMANCE FORM VALIDATION: Controlling ranges for CON and Attendance
ovrPerformanceForm.addEventListener("input", (inputEventDetails) => {
  const activeInput = inputEventDetails.target;

  // 1. Validation for Contribution Score (CON)
  if (activeInput.id === "con") {
    // Strictly 0 to 5 based on my 5% contribution score
    validateNumberRange(activeInput, 0, 5);
  }

  // 2. Validation for Attendance
  if (activeInput.id === "attendance") {
    // A max of 78 days per term
    validateNumberRange(activeInput, 0, 78);
  }
});

if (syncVaultBtn)
  syncVaultBtn.addEventListener("click", () => syncAllData(false));

// The Trigger
const viewAllBtn = document.getElementById("view-students-btn");

if (viewAllBtn) {
  viewAllBtn.addEventListener("click", openDirectory);
}

// ============================================
// BOOTSTRAP: Initialize all modules
// ============================================
initUniversalPicker();
initActionButtons();
setupBackButtons();
initStudentRegistration();
initSBAFlow();
// initAssignmentFlow();
initExamFlow();
initReportCardDropdown();
