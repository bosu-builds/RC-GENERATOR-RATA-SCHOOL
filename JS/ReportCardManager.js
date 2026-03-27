"use strict";

// IMPORTS
import { db } from "./Database.js";

// ============================================
// EXPORTED FUNCTION: Initialize report card flow
// Called from: App.js
// ============================================
export const initReportCardDropdown = () => {
  const genRepCardBtn = document.getElementById("genRepCardBtn");
  const studentDropdown = document.getElementById("studentDropdown");

  // Button: Generate report card (populates dropdown)
  if (genRepCardBtn) {
    genRepCardBtn.addEventListener("click", async () => {
      await populateStudentDropdown();
    });
  }

  // Dropdown: Navigate to report card
  if (studentDropdown) {
    studentDropdown.addEventListener("change", function () {
      if (this.value) {
        const [ck, sid] = this.value.split("::");
        window.location.href = `rcPdfSheet/RC-F-B.html?classKey=${ck}&studentId=${sid}`;
      }
    });
  }
};

// ============================================
// EXPORTED FUNCTION: Populate student dropdown
// Called from: initReportCardDropdown() (gen button)
// ============================================
export const populateStudentDropdown = async () => {
  const data = await db.master_records.toArray();
  const studentDropdown = document.getElementById("studentDropdown");

  studentDropdown.innerHTML = '<option value="">-- Select Student --</option>';

  // Sort alphabetically by student name
  data
    .sort((a, b) => a.info.name.localeCompare(b.info.name))
    .forEach((s) => {
      const opt = document.createElement("option");
      opt.value = `${s.classKey}::${s.id}`;
      opt.textContent = `${s.info.name} (${s.info.class})`;
      studentDropdown.appendChild(opt);
    });

  // Show dropdown
  studentDropdown.classList.remove("hidden");
};
