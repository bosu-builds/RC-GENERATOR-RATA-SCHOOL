"use strict";

// IMPORTS
import { db } from "./Database.js";
import { mapClassToNumber } from "./SchoolData.js";
import { getClassKey } from "./HelperTools.js";
import { universalPicker } from "./InterfaceManager.js";

// STATE
let lastCohortStudents = [];

// ============================================
// EXPORTED FUNCTION: Initialize report card flow
// Called from: App.js
// ============================================
export const initReportCardFlow = () => {
  const reportCardForm = document.getElementById("report-card-form");
  const rcStudent = document.getElementById("rc-student");
  const generateReportCardBtn = document.getElementById(
    "generateReportCardBtn",
  );

  // Student picker: Open picker with students from selected cohort
  if (rcStudent) {
    rcStudent.onclick = async () => {
      const grade = document.getElementById("rc-grade").value;
      const term = document.getElementById("rc-term").value;
      const year = document.getElementById("rc-year").value;

      if (!grade) {
        alert("Please select a class first!");
        return;
      }

      try {
        // Load students for this cohort
        const classNum = mapClassToNumber[grade];
        const classKey = getClassKey(classNum, term, year);

        const students = await db.master_records
          .where("classKey")
          .equals(classKey)
          .toArray();

        if (!students || students.length === 0) {
          alert("No students found in this cohort.");
          return;
        }

        // Cache students for later use
        lastCohortStudents = students;

        // Build student list for picker
        const studentList = students
          .sort((a, b) => (a.info.name || "").localeCompare(b.info.name || ""))
          .map((s) => s.info.name);

        // Open universal picker
        universalPicker.open("rc-student", "Select Student", studentList);
      } catch (error) {
        console.error("Error loading students:", error);
        alert("Failed to load students. Please try again.");
      }
    };
  }

  // Form submission: Generate report card
  if (generateReportCardBtn) {
    generateReportCardBtn.addEventListener("click", async (e) => {
      e.preventDefault();

      const studentName = document.getElementById("rc-student").value;
      const grade = document.getElementById("rc-grade").value;
      const term = document.getElementById("rc-term").value;
      const year = document.getElementById("rc-year").value;

      if (!studentName || !grade) {
        alert("Please select a class and student.");
        return;
      }

      try {
        // Find the selected student in the cached list
        const selectedStudent = lastCohortStudents.find(
          (s) => s.info.name === studentName,
        );

        if (!selectedStudent) {
          alert("Student not found. Please select again.");
          return;
        }

        // Navigate to report card page
        const classKey = selectedStudent.classKey;
        const studentId = selectedStudent.id;

        window.location.href = `rcPdfSheet/RC-F-B.html?classKey=${classKey}&studentId=${studentId}`;
      } catch (error) {
        console.error("Error generating report card:", error);
        alert("Failed to generate report card. Please try again.");
      }
    });
  }
};

// Export alias for backward compatibility
export const initReportCardDropdown = initReportCardFlow;
