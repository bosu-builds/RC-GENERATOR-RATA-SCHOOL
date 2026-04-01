"use strict";

import { db } from "./Database.js";
import { saveToCloudDirect, syncAllData } from "./CloudSync.js";
import { mapClassToNumber } from "./SchoolData.js";
import {
  getLevelByGrade,
  getClassKey,
  validateNumberRange,
} from "./HelperTools.js";
import { schoolSubjects } from "./SchoolData.js";
import { universalPicker } from "./InterfaceManager.js";

// ============================================
// EXPORTED FUNCTION: Initialize SBA flow
// Called from: App.js
// ============================================
export const initSBAFlow = () => {
  const sbaEntryInfoForm = document.getElementById("SBA-Entry-Info");
  const nextSBAEntryFormBtn = document.getElementById("Next-SBA-Entry-Info");
  const saveSBAScoresBtn = document.getElementById("save-sba-scores-btn");
  const goBackFromSBABtn = document.getElementById(
    "goBackToHomePageFromSBAForm",
  );

  const sbaSubjectName = document.getElementById("sba-subjectName");

  if (sbaSubjectName) {
    sbaSubjectName.onclick = () => {
      const grade = document.getElementById("sba-grade").value;
      if (!grade) return alert("Please select a class first!");

      const level = getLevelByGrade(grade);
      const subjects = schoolSubjects[level]?.map((s) => s.name) || [];

      universalPicker.open("sba-subjectName", "Select Subject", subjects);
    };
  }

  if (nextSBAEntryFormBtn) {
    nextSBAEntryFormBtn.onclick = async (e) => {
      e.preventDefault();
      await prepareSBATable();
    };
  }

  if (saveSBAScoresBtn) {
    saveSBAScoresBtn.onclick = async () => {
      await saveSBAScores();
    };
  }

  if (goBackFromSBABtn) {
    goBackFromSBABtn.addEventListener("click", () => {
      sbaEntryInfoForm.reset();
      sbaEntryInfoForm.classList.add("hidden");
      document.getElementById("activity-box").classList.remove("hidden");
    });
  }
};

// ============================================
// EXPORTED FUNCTION: Prepare SBA grading table
// Called from: initSBAFlow() (Next button)
// ============================================
export const prepareSBATable = async () => {
  const grade = document.getElementById("sba-grade").value;
  const subjectName = document.getElementById("sba-subjectName").value;
  const term = document.getElementById("sba-term").value;
  const year = document.getElementById("sba-year").value;

  if (!grade || !subjectName) {
    return alert("Please select Class and Subject.");
  }

  const level = getLevelByGrade(grade);
  const subjectObj = schoolSubjects[level].find((s) => s.name === subjectName);
  if (!subjectObj) {
    return alert("Selected subject one is not found in subject list.");
  }

  const cNum = mapClassToNumber[grade] || grade;
  const classKey = getClassKey(cNum, term, year);

  const getSBAId = (subjectCode, subjectId, classKeyPayload) =>
    `${subjectCode}-${subjectId}-sba-${classKeyPayload}`;

  const sbaId = getSBAId(subjectObj.code, subjectObj.id, classKey);

  const students = await db.master_records
    .where("classKey")
    .equals(classKey)
    .toArray();

  if (students.length === 0) {
    return alert(`No students found for ${grade}.`);
  }

  const existingScoreCount = students.reduce((count, student) => {
    return count + (student.sbaScores && sbaId in student.sbaScores ? 1 : 0);
  }, 0);

  const listBody = document.getElementById("sba-student-list-body");
  listBody.innerHTML = "";
  document.getElementById("sba-grading-title").innerText =
    `${subjectName} - ${grade}`;

  students.forEach((student) => {
    const existingScore = (student.sbaScores && student.sbaScores[sbaId]) || "";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${student.info.name}</td>
      <td style="text-align: center;">
        <input type="number"
               class="score-input sba-batch-input"
               data-student-id="${student.id}"
               data-sba-id="${sbaId}"
               min="0"
               max="30"
               placeholder="0-30"
               value="${existingScore}">
      </td>
    `;
    listBody.appendChild(tr);
  });

  const sbaEntryInfoForm = document.getElementById("SBA-Entry-Info");
  const sbaGradingContainer = document.getElementById("sba-grading-container");
  sbaEntryInfoForm.classList.add("hidden");
  sbaGradingContainer.classList.remove("hidden");

  if (sbaGradingContainer) {
    sbaGradingContainer.addEventListener("input", (inputEventDetails) => {
      const activeInput = inputEventDetails.target;
      if (activeInput.classList.contains("sba-batch-input")) {
        validateNumberRange(activeInput, 0, 30);
      }
    });
  }
};

// ============================================
// EXPORTED FUNCTION: Save SBA scores
// Called from: initSBAFlow() (save button)
// ============================================
export const saveSBAScores = async () => {
  const inputs = document.querySelectorAll(".sba-batch-input");
  const cloudUpdates = [];

  for (const input of inputs) {
    const stuId = input.dataset.studentId;
    const sbaId = input.dataset.sbaId;
    const newScore = input.value;

    const student = await db.master_records.get(stuId);
    if (!student) continue;

    if (!student.sbaScores) student.sbaScores = {};
    student.sbaScores[sbaId] = newScore;
    student.updatedAt = new Date().toISOString();

    cloudUpdates.push(student);
  }

  if (cloudUpdates.length === 0) {
    alert("No scores to save.");
    return;
  }

  try {
    const savePromises = cloudUpdates.map((student) =>
      saveToCloudDirect(student, { local: false }),
    );

    await Promise.all(savePromises);

    alert(
      `✅ Successfully saved ${cloudUpdates.length} SBA records (cloud only).`,
    );

    const sbaEntryInfoForm = document.getElementById("SBA-Entry-Info");
    const sbaGradingContainer = document.getElementById(
      "sba-grading-container",
    );
    const activityBox = document.getElementById("activity-box");

    sbaEntryInfoForm.reset();
    sbaGradingContainer.classList.add("hidden");
    activityBox.classList.remove("hidden");
  } catch (err) {
    console.error(err);
    alert("❌ Cloud save failed. Check your internet.");
  }
};
