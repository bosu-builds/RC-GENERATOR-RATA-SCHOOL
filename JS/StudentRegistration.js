"use strict";

// IMPORTS
import { db } from "./Database.js";
import { saveToCloudDirect } from "./CloudSync.js";
import { mapClassToNumber } from "./SchoolData.js";
import {
  generateSmartId,
  getClassKey,
} from "./HelperTools.js";

// ============================================
// EXPORTED FUNCTION: Initialize student registration
// Called from: App.js
// ============================================
export const initStudentRegistration = () => {
  const saveNewStudentBtn = document.getElementById("saveNewStudentBtn");
  const goBackBtn = document.getElementById("goBackToHomePageFromAddStudent");
  const addStudentForm = document.getElementById("addStudentForm");

  // Button: Save new student
  if (saveNewStudentBtn) {
    saveNewStudentBtn.addEventListener("click", async (e) => {
      e.preventDefault();

      // 1. Harvest inputs from form
      const payload = {
        name: document.getElementById("new-student-name").value,
        gradeVal: document.getElementById("new-grade").value,
        term: document.getElementById("new-term").value,
        year: document.getElementById("new-year").value,
      };

      // 2. Create student (handles validation, duplicate check, save)
      await createStudent(payload);
    });
  }

  // Button: Go back to home
  if (goBackBtn) {
    goBackBtn.addEventListener("click", () => {
      const activityBox = document.getElementById("activity-box");
      activityBox.classList.remove("hidden");
      addStudentForm.classList.add("hidden");
    });
  }
};

// ============================================
// EXPORTED FUNCTION: Create and save student
// Called from: initStudentRegistration()
// ============================================
export const createStudent = async (payload) => {
  const { name, gradeVal, term, year } = payload;

  // VALIDATION: Check all fields filled
  if (!name || !gradeVal) {
    return alert("Fill all fields");
  }

  // STEP 1: PROCESS DATA WITH HELPERS
  const cNum = mapClassToNumber[gradeVal] || gradeVal;
  const id = generateSmartId(name, cNum, term, year);
  const classKey = getClassKey(cNum, term, year);

  // STEP 2: DUPLICATE CHECK
  const existingRecord = await db.master_records.get(id);
  if (existingRecord) {
    return alert(`🚫 DUPLICATE DETECTED: ${name} is already registered!`);
  }

  // STEP 3: PREPARE THE DATA OBJECT
  const newStudentData = {
    id,
    classKey,
    updatedAt: new Date().toISOString(),
    info: {
      name,
      class: cNum,
      term,
      year,
    },
    // Initialize empty fields to prevent "undefined" errors
    performance: {
      con: "",
      attitude: "",
      interest: "",
      character: "",
      ctRemarks: "",
      attendance: "",
    },
    examScores: {},
    granularScores: {},
  };

  // STEP 4: SAVE TO CLOUD AND DEXIE
  const success = await saveToCloudDirect(newStudentData);
  if (success) {
    alert("✅ Student Registered Successfully!");
    document.getElementById("addStudentForm").reset();
  }
};
