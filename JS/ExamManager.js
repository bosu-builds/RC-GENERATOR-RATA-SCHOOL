"use strict";

// IMPORTS
import { db, _supabase } from "./Database.js";
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
// EXPORTED FUNCTION: Initialize exam flow
// Called from: App.js
// ============================================
export const initExamFlow = () => {
  const examEntryInfoForm = document.getElementById("Exam-Entry-Info");
  const NextExamEntryInfoFormBtn = document.getElementById(
    "Next-Exam-Entry-Info",
  );
  const saveExamScoreBtn = document.getElementById("save-exam-scores-btn");
  const goBackFromExamBtn = document.getElementById(
    "goBackToHomePageFromStudentForm",
  );
  const nextStudentBtn = document.getElementById("nextStudentBtn");
  const examEntryInfoFormElement = document.getElementById("Exam-Entry-Info");

  // Subject picker dependency
  const subjectName = document.getElementById("subjectName");
  if (subjectName) {
    subjectName.onclick = () => {
      const grade = document.getElementById("grade").value;
      if (!grade) return alert("Please select a class first!");

      const level = getLevelByGrade(grade);
      const subjects = schoolSubjects[level].map((s) => s.name);

      // Use universal picker (from InterfaceManager)
      // This is the SPECIAL CASE for exam subject selection
      universalPicker.open("subjectName", "Select Subject", subjects);
    };
  }

  // Next button: Build exam grading table
  if (NextExamEntryInfoFormBtn) {
    NextExamEntryInfoFormBtn.onclick = async (e) => {
      e.preventDefault();
      await prepareExamTable();
    };
  }

  // Save exam scores button
  if (saveExamScoreBtn) {
    saveExamScoreBtn.onclick = async () => {
      await saveExamScores();
    };
  }

  // Go back button
  if (goBackFromExamBtn) {
    goBackFromExamBtn.addEventListener("click", function () {
      examEntryInfoFormElement.reset();
      examEntryInfoFormElement.classList.add("hidden");
      document.getElementById("activity-box").classList.remove("hidden");
    });
  }

  // Next student button
  if (nextStudentBtn) {
    nextStudentBtn.addEventListener("click", () => {
      [
        examEntryInfoFormElement,
        document.getElementById("ovrPerformance"),
      ].forEach((f) => f.reset());
      currentStudentId = "";
      examEntryInfoFormElement.classList.remove("hidden");
      document.getElementById("ovrPerformance").classList.add("hidden");
      alert("Ready for the next student.");
    });
  }
};

// ============================================
// EXPORTED FUNCTION: Prepare exam grading table
// Called from: initExamFlow() (Next button)
// ============================================
export const prepareExamTable = async () => {
  // STEP 1: Get form values
  const grade = document.getElementById("grade").value;
  const subjectName = document.getElementById("subjectName").value;
  const term = document.getElementById("term").value;
  const year = document.getElementById("year").value;

  if (!grade || !subjectName) {
    return alert("Please select Class and Subject.");
  }

  // STEP 2: Resolve IDs and keys
  const level = getLevelByGrade(grade);
  const subjectObj = schoolSubjects[level].find((s) => s.name === subjectName);
  const cNum = mapClassToNumber[grade] || grade;
  const classKey = getClassKey(cNum, term, year);

  // Create unique exam ID
  const getExamId = function (subjectCode, subjectId, classKey) {
    return `${subjectCode}-${subjectId}-${classKey}`;
  };

  const examId = getExamId(subjectObj.code, subjectObj.id, classKey);

  // STEP 3: Fetch students from local IndexedDB
  const students = await db.master_records
    .where("classKey")
    .equals(classKey)
    .toArray();

  if (students.length === 0) {
    return alert(`No students found for ${grade}.`);
  }

  // STEP 4: Pre-fill table with students and existing scores
  const listBody = document.getElementById("exam-student-list-body");
  listBody.innerHTML = "";
  document.getElementById("exam-grading-title").innerText =
    `${subjectName} - ${grade}`;

  students.forEach((student) => {
    // Look inside 'examScores' for existing data
    const existingScore =
      (student.examScores && student.examScores[examId]) || "";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${student.info.name}</td>
      <td style="text-align: center;">
        <input type="number" 
               class="score-input exam-batch-input" 
               data-student-id="${student.id}" 
               data-exam-id="${examId}" 
               placeholder="0-100" 
               value="${existingScore}">
      </td>
    `;
    listBody.appendChild(tr);
  });

  // STEP 5: Switch UI visibility
  const examEntryInfoForm = document.getElementById("Exam-Entry-Info");
  const examGradingContainer = document.getElementById(
    "exam-grading-container",
  );
  examEntryInfoForm.classList.add("hidden");
  examGradingContainer.classList.remove("hidden");

  // Add validation to exam inputs
  if (examGradingContainer) {
    examGradingContainer.addEventListener("input", (inputEventDetails) => {
      const activeInput = inputEventDetails.target;

      // Guard check: Only care about exam score inputs
      if (activeInput.classList.contains("exam-batch-input")) {
        // Fire validator with 0-100 range
        validateNumberRange(activeInput, 0, 100);
      }
    });
  }
};

// ============================================
// EXPORTED FUNCTION: Save exam scores
// Called from: initExamFlow() (save button)
// ============================================
export const saveExamScores = async () => {
  const inputs = document.querySelectorAll(".exam-batch-input");
  const cloudUpdates = [];

  // Collect all students with updated scores
  for (const input of inputs) {
    const stuId = input.dataset.studentId;
    const examId = input.dataset.examId;
    const newScore = input.value;

    // Use local record as baseline
    const student = await db.master_records.get(stuId);

    if (student) {
      // Ensure examScores object exists
      if (!student.examScores) student.examScores = {};

      // Update score
      student.examScores[examId] = newScore;
      student.updatedAt = new Date().toISOString();

      cloudUpdates.push(student);
    }
  }

  // Save all to cloud
  try {
    // Save each student via CloudSync
    const savePromises = cloudUpdates.map((student) =>
      saveToCloudDirect(student),
    );

    await Promise.all(savePromises);

    // Enhanced alert with detailed exam progress info
    const examId = inputs[0]?.dataset.examId;
    if (examId) {
      // Parse classKey from examId (format: subjectCode-subjectId-classKey)
      const parts = examId.split("-");
      const classKey = parts.slice(2).join("-");

      // Determine level from classKey
      let level;
      if (classKey.startsWith("KG")) {
        level = "KG";
      } else {
        const num = parseInt(classKey.split("-")[0].slice(1));
        if (num >= 7) level = "JHS";
        else if (num >= 4) level = "Upper Primary";
        else level = "Lower Primary";
      }

      // Fetch all students in the class
      const allStudents = await db.master_records
        .where("classKey")
        .equals(classKey)
        .toArray();

      // Collect entered subject codes from examScores
      const enteredSubjectCodes = new Set();
      allStudents.forEach((stu) => {
        if (stu.examScores) {
          Object.keys(stu.examScores).forEach((eid) => {
            const subjectCode = eid.split("-")[0];
            enteredSubjectCodes.add(subjectCode);
          });
        }
      });

      // Get all possible subjects for the level
      const allSubjectCodes = schoolSubjects[level]?.map((s) => s.code) || [];
      const remainingSubjectCodes = allSubjectCodes.filter(
        (code) => !enteredSubjectCodes.has(code),
      );

      // Count students with scores for this specific exam
      const studentsWithScores = cloudUpdates.filter((stu) => {
        const score = stu.examScores[examId];
        return score && score !== "";
      }).length;

      // Map codes to names
      const enteredSubjects = Array.from(enteredSubjectCodes)
        .map(
          (code) =>
            schoolSubjects[level]?.find((s) => s.code === code)?.name || code,
        )
        .join(", ");

      const remainingSubjects = remainingSubjectCodes
        .map(
          (code) =>
            schoolSubjects[level]?.find((s) => s.code === code)?.name || code,
        )
        .join(", ");

      // Build detailed alert message
      const message =
        `✅ Successfully saved ${cloudUpdates.length} students' exam records!\n\n` +
        `📊 Exam Progress for ${classKey}:\n` +
        `- Students with scores entered: ${studentsWithScores}/${cloudUpdates.length}\n` +
        `- Subjects Entered: ${enteredSubjects || "None"}\n` +
        `- Subjects remaining: ${remainingSubjects || "None"}`;

      alert(message);
    } else {
      alert(`✅ Successfully saved ${cloudUpdates.length} exam records!`);
    }

    // Reset and return to home
    const examEntryInfoForm = document.getElementById("Exam-Entry-Info");
    const examGradingContainer = document.getElementById(
      "exam-grading-container",
    );
    const activityBox = document.getElementById("activity-box");

    examEntryInfoForm.reset();
    examGradingContainer.classList.add("hidden");
    activityBox.classList.remove("hidden");
  } catch (err) {
    console.error(err);
    alert("❌ Cloud save failed. Check your internet.");
  }
};
