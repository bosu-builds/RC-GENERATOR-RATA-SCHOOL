"use strict";

// IMPORTS
import { db } from "./Database.js";
import { saveToCloudDirect } from "./CloudSync.js";
import { mapClassToNumber } from "./SchoolData.js";
import {
  getLevelByGrade,
  getClassKey,
  validateNumberRange,
} from "./HelperTools.js";
import { schoolSubjects } from "./SchoolData.js";
import { universalPicker } from "./InterfaceManager.js";

// ============================================
// EXPORTED FUNCTION: Initialize assignment flow
// Called from: App.js
// ============================================
export const initAssignmentFlow = () => {
  const assignmentGrade = document.getElementById("assignment-grade");
  const subjectOptions = document.getElementById("subjectOptions");
  const assignmentFormElement = document.getElementById("assignmentForm");
  const gradingContainer = document.getElementById("grading-container");
  const saveAssignmentScoresBtn = document.getElementById("save-scores-btn");
  const assignmentSubject = document.getElementById("assignment-subject");

  // Subject selection: Check cohort and pull subjects from database
  if (assignmentSubject) {
    assignmentSubject.onclick = async () => {
      const year = document.getElementById("assignment-year").value;
      const grade = document.getElementById("assignment-grade").value;
      const term = document.getElementById("assignment-term").value;

      if (!year || !grade || !term) {
        return alert("Please enter Year, Class, and Term first.");
      }

      const level = getLevelByGrade(grade);
      const cNum = mapClassToNumber[grade] || grade;
      const classKey = getClassKey(cNum, term, year);

      const cohort = await db.master_records
        .where("classKey")
        .equals(classKey)
        .toArray();

      if (cohort.length === 0) {
        return alert("No students found for this class. Please sync vault or check details.");
      }

      // Start with full class subject list when available.
      const subjects = new Set();
      if (level && schoolSubjects[level]) {
        schoolSubjects[level].forEach((sub) => subjects.add(sub.name));
      }

      // Add already-used subject names from cohort granularScores (if any), without overwriting class list.
      cohort.forEach((stu) => {
        if (stu.granularScores) {
          Object.keys(stu.granularScores).forEach((sub) => subjects.add(sub));
        }
      });

      const subjectList = Array.from(subjects);

      // Use universal picker to select subject
      universalPicker.open("assignment-subject", "Select Subject", subjectList);
    };
  }

  // Form submit: Prepare assignment table
  if (assignmentFormElement) {
    assignmentFormElement.addEventListener("submit", async (e) => {
      e.preventDefault();
      await prepareAssignmentTable();
    });
  }

  // Validation for grading inputs
  if (gradingContainer) {
    gradingContainer.addEventListener("input", (inputEventDetails) => {
      const activeInput = inputEventDetails.target;

      // Guard check: Only care about SBA score boxes
      if (activeInput.classList.contains("grading-score-input")) {
        // Dynamic max extraction
        const currentMax = parseFloat(activeInput.getAttribute("max")) || 100;

        // Fire validator with dynamic max
        validateNumberRange(activeInput, 0, currentMax);
      }
    });
  }

  // Save assignment scores
  if (saveAssignmentScoresBtn) {
    saveAssignmentScoresBtn.addEventListener("click", async () => {
      await saveAssignmentScores();
    });
  }
};

// ============================================
// EXPORTED FUNCTION: Prepare assignment grading table
// Called from: initAssignmentFlow() (form submit)
// ============================================
export const prepareAssignmentTable = async () => {
  // 1. Data Gathering
  const maxInput = document.getElementById("assignment-max");
  let max = maxInput.value;

  const year = document.getElementById("assignment-year").value;
  const grade = document.getElementById("assignment-grade").value;
  const term = document.getElementById("assignment-term").value;
  const subjectName = document.getElementById("assignment-subject").value;
  const typeFull = document.getElementById("assignment-type").value;
  const num = document.getElementById("assignment-number").value;

  // 2. ID Generation
  const level = getLevelByGrade(grade);
  const subObj = schoolSubjects[level].find((s) => s.name === subjectName);
  const subCode = subObj ? subObj.code : subjectName.substring(0, 3);
  const typeMatch = typeFull.match(/\(([^)]+)\)/);
  const typeCode = typeMatch ? typeMatch[1] : typeFull.substring(0, 3);
  const cNum = mapClassToNumber[grade] || grade;
  const targetClassKey = getClassKey(cNum, term, year);
  const assignmentId = `${subCode}-${typeCode}${num}-${targetClassKey}`;

  // 3. Fetch Cohort
  const cohort = await db.master_records
    .where("classKey")
    .equals(targetClassKey)
    .toArray();

  if (cohort.length === 0) return alert("No students found. Sync Vault.");

  // 4. PRE-FILL & HEADER LOGIC
  const studentListBody = document.getElementById("student-list-body");
  studentListBody.innerHTML = "";
  const titleElement = document.getElementById("grading-title");
  const subtitleElement = document.getElementById("grading-subtitle");

  // Human-readable timestamp helper
  const formatTime = (isoString) => {
    if (!isoString) return "New";
    const date = new Date(isoString);
    return date.toLocaleString("en-GB", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // SAFETY CHECK & MAX SCORE RESOLUTION
  const sampleEntry = cohort[0]?.granularScores?.[subjectName]?.find(
    (item) => item.assignmentId === assignmentId,
  );

  if (!max && !sampleEntry) {
    maxInput.focus();
    return alert("⚠️ This is a new assignment. Please enter a Max Score.");
  }

  // Determine activeMax ONCE (Fallback to DB if form is empty)
  const activeMax = max === "" && sampleEntry ? sampleEntry.max : max;

  // Update Header with the resolved data
  titleElement.textContent = `Grading: ${subjectName} (${typeCode}-${num})`;
  subtitleElement.textContent = `Max Score: ${activeMax}`;

  // 5. Generate Table Rows
  cohort.forEach((stu) => {
    const existingEntry = stu.granularScores?.[subjectName]?.find(
      (item) => item.assignmentId === assignmentId,
    );

    const scoreToLoad = existingEntry ? existingEntry.score : "";
    const lastUpdate = formatTime(existingEntry?.updatedAt);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${stu.info.name}</td>
      <td>
        <div class="score-cell">
          <input 
            type="number" 
            class="grading-score-input" 
            data-student-id="${stu.id}" 
            data-assignment-id="${assignmentId}" 
            min="0" 
            max="${activeMax}" 
            value="${scoreToLoad}" 
            placeholder="0-${activeMax}"
          >
          <small class="update-ts" id="ts-${stu.id}">${lastUpdate}</small>
        </div>
      </td>`;
    studentListBody.appendChild(tr);
  });

  // 6. UI Transition
  const assignmentFormElement = document.getElementById("assignmentForm");
  const gradingContainer = document.getElementById("grading-container");
  assignmentFormElement.classList.add("hidden");
  gradingContainer.classList.remove("hidden");
};

// ============================================
// EXPORTED FUNCTION: Save assignment scores
// Called from: initAssignmentFlow() (save button)
// ============================================
export const saveAssignmentScores = async () => {
  const inputs = document.querySelectorAll(".grading-score-input");
  const subject = document.getElementById("assignment-subject").value;
  const typeKey = `${document.getElementById("assignment-type").value}_${document.getElementById("assignment-number").value}`;
  const maxVal = document.getElementById("assignment-max").value;
  const dateVal = document.getElementById("assignment-date").value;

  const syncPromises = Array.from(inputs).map(async (input) => {
    const student = await db.master_records.get(input.dataset.studentId);
    if (!student) return;

    // Ensure data structure exists
    if (!student.granularScores) student.granularScores = {};
    if (!student.granularScores[subject]) student.granularScores[subject] = [];

    const assignmentId = input.dataset.assignmentId;
    const inputValue = input.value;

    // 1. Find if this specific assignment already exists for the student
    const existingIndex = student.granularScores[subject].findIndex(
      (item) => item.assignmentId === assignmentId,
    );

    let isModified = false;

    // Always keep assignment registered in granularScores, even if score is empty.
    const updatedEntry = {
      assignmentId: assignmentId,
      type: typeKey,
      score: inputValue === "" ? "" : inputValue,
      max: maxVal,
      date: dateVal,
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex !== -1) {
      // Update existing record (including empties)
      student.granularScores[subject][existingIndex] = updatedEntry;
      isModified = true;
    } else {
      // Create new record with empty score if needed
      student.granularScores[subject].push(updatedEntry);
      isModified = true;
    }

    // 6. Only sync if modified
    if (isModified) {
      const success = await saveToCloudDirect(student);

      // LIVE UI UPDATE
      if (success) {
        const tsLabel = document.getElementById(
          `ts-${input.dataset.studentId}`,
        );
        if (tsLabel) tsLabel.innerText = "Just Now";
      }
    }
  });

  await Promise.all(syncPromises);
  alert("✅ Continuos Assessment Saved Successfully!");

  // Reset and return to home
  const assignmentFormElement = document.getElementById("assignmentForm");
  const gradingContainer = document.getElementById("grading-container");
  const activityBox = document.getElementById("activity-box");

  assignmentFormElement.reset();
  gradingContainer.classList.add("hidden");
  activityBox.classList.remove("hidden");
};
