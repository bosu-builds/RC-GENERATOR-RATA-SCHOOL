"use strict";

// IMPORT FIX: Added syncAllData so the background sync works
import { getGroupedDirectory, syncAllData } from "./CloudSync.js";
import { pickerData, schoolSubjects } from "./SchoolData.js";
import { getLevelByGrade } from "./HelperTools.js";

// 1. Grab UI Elements
const dirOverlay = document.getElementById("modal-overlay");
const dirWindow = document.getElementById("directory-modal");
const dirList = document.getElementById("directory-list");
const dirCloseBtn = document.getElementById("close-modal-btn");
const dirTotalCount = document.getElementById("total-count");
const dirSyncStatus = document.getElementById("sync-status");
const dirSearchInput = document.getElementById("directory-search");

// 2. INTERNAL EVENT LISTENERS (Search and Close)
if (dirCloseBtn) {
  dirCloseBtn.addEventListener("click", () =>
    dirOverlay.classList.add("hidden"),
  );
}

if (dirOverlay) {
  dirOverlay.addEventListener("click", (e) => {
    if (e.target === dirOverlay) dirOverlay.classList.add("hidden");
  });
}

if (dirSearchInput) {
  dirSearchInput.addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase();
    const items = document.querySelectorAll(".student-item");
    const groups = document.querySelectorAll(".class-group");

    items.forEach((item) => {
      const name = item.querySelector(".stu-name").innerText.toLowerCase();
      const id = item.querySelector(".stu-id").innerText.toLowerCase();
      item.style.display =
        name.includes(term) || id.includes(term) ? "flex" : "none";
    });

    groups.forEach((group) => {
      const visibleItems = Array.from(
        group.querySelectorAll(".student-item"),
      ).some((item) => item.style.display !== "none");
      group.style.display = visibleItems ? "block" : "none";
    });
  });
}

// 3. OPEN & RENDER LOGIC (Merged into one function)
export const openDirectory = async () => {
  // Open the modal immediately
  dirOverlay.classList.remove("hidden");
  dirList.innerHTML = `<div class="loading">Loading local records...</div>`;
  dirSearchInput.value = ""; // Clear search on open

  // Fetch from IndexedDB
  const data = await getGroupedDirectory();

  if (!data || Object.keys(data).length === 0) {
    dirList.innerHTML = `<div class="empty">No students found in the vault.</div>`;
    dirTotalCount.innerText = "0";
    return;
  }

  dirList.innerHTML = "";
  let totalCounter = 0;

  // Sort Classes (Basic 1 -> Basic 9)
  const sortedClasses = Object.keys(data).sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, "")) || 0;
    const numB = parseInt(b.replace(/\D/g, "")) || 0;
    return numA - numB;
  });

  // Render HTML
  sortedClasses.forEach((className) => {
    const groupDiv = document.createElement("div");
    groupDiv.className = "class-group";

    // Get the number of students in THIS specific class
    const studentCount = data[className].length;

    let studentRows = "";
    data[className].forEach((stu) => {
      totalCounter++;
      studentRows += `
        <div class="student-item">
          <span class="stu-name">${stu.name}</span>
          <code class="stu-id">${stu.id}</code>
        </div>`;
    });

    // HEADER: Now includes the count on the right
    groupDiv.innerHTML = `
      <div class="class-header">
        <span>📂 ${className}</span>
        <span class="class-count">${studentCount} Students</span>
      </div>
      <div class="class-body">${studentRows}</div>
    `;
    dirList.appendChild(groupDiv);
  });

  dirTotalCount.innerText = totalCounter;

  // Background Sync Trigger
  if (typeof syncAllData === "function") {
    if (dirSyncStatus) {
      dirSyncStatus.className = "";
      dirSyncStatus.classList.add("syncing");
      dirSyncStatus.innerText = "Syncing...";
    }

    syncAllData()
      .then(() => {
        if (dirSyncStatus) {
          dirSyncStatus.className = "";
          dirSyncStatus.classList.add("cloud-synced");
          dirSyncStatus.innerText = "Cloud Synced";
        }
      })
      .catch(() => {
        if (dirSyncStatus) {
          dirSyncStatus.className = "";
          dirSyncStatus.classList.add("offline-mode");
          dirSyncStatus.innerText = "Offline Mode";
        }
      });
  }
};

// --- UNIVERSAL PICKER ENGINE ---
export const universalPicker = {
  overlay: document.getElementById("u-picker-overlay"),
  title: document.getElementById("u-picker-title"),
  search: document.getElementById("u-picker-search"),
  list: document.getElementById("u-picker-list"),
  close: document.getElementById("close-u-picker"),
  activeTarget: null,
  currentData: [],

  open(targetId, title, data) {
    this.activeTarget = document.getElementById(targetId);
    this.title.innerText = title;
    this.currentData = data;
    this.render(data);
    this.overlay.classList.remove("hidden");
    this.search.value = "";
    this.search.focus();
  },

  render(items) {
    this.list.innerHTML = items
      .map(
        (item) => `
      <div class="pk-item" data-value="${item}">${item}</div>
    `,
      )
      .join("");
  },

  closePicker() {
    this.overlay.classList.add("hidden");
  },
};

// Map Input IDs to their Picker Data
export const pickerMap = [
  { id: "new-grade", title: "Select Class", data: pickerData.classes },
  { id: "assignment-grade", title: "Select Class", data: pickerData.classes },
  { id: "sba-grade", title: "Select Class", data: pickerData.classes },
  { id: "grade", title: "Select Class", data: pickerData.classes },
  { id: "rc-grade", title: "Select Class", data: pickerData.classes },
  {
    id: "assignment-type",
    title: "Assignment Type",
    data: pickerData.assignmentTypes,
  },
  { id: "attitude", title: "Select Attitude", data: pickerData.attitudes },
  { id: "character", title: "Select Conduct", data: pickerData.characters },
  { id: "interest", title: "Select Interest", data: pickerData.interests },
  { id: "ct-remarks", title: "Teacher's Remarks", data: pickerData.remarks },
];

// ============================================
// NEW EXPORTED FUNCTION: Initialize universal picker
// Called from: App.js bootstrap
// ============================================
export const initUniversalPicker = () => {
  // Picker Event Listeners
  universalPicker.close.onclick = () => universalPicker.closePicker();

  universalPicker.search.oninput = (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = universalPicker.currentData.filter((i) =>
      i.toLowerCase().includes(term),
    );
    universalPicker.render(filtered);
  };

  universalPicker.list.onclick = (e) => {
    const item = e.target.closest(".pk-item");
    if (item && universalPicker.activeTarget) {
      // Strips out numbering like (1), (2) from the selection automatically
      const cleanValue = item.dataset.value.replace(/^\(\d+\)\s*/, "");
      universalPicker.activeTarget.value = cleanValue;

      // Dispatch input event to trigger any dependent logic
      universalPicker.activeTarget.dispatchEvent(new Event("input"));
      universalPicker.closePicker();
    }
  };

  // Wire up all picker buttons
  pickerMap.forEach((config) => {
    const el = document.getElementById(config.id);
    if (el)
      el.onclick = () =>
        universalPicker.open(config.id, config.title, config.data);
  });
};

// ============================================
// NEW EXPORTED FUNCTION: Initialize action buttons
// Called from: App.js bootstrap
// ============================================
export const initActionButtons = () => {
  const activityBox = document.getElementById("activity-box");
  const addStudentForm = document.getElementById("addStudentForm");
  const sbaEntryForm = document.getElementById("SBA-Entry-Info");
  const examEntryInfoForm = document.getElementById("Exam-Entry-Info");
  const ovrPerformanceForm = document.getElementById("ovrPerformance");
  const reportCardForm = document.getElementById("report-card-form");

  const activityAddStudent = document.getElementById("add-student-btn");
  const activitySba = document.getElementById("sba-btn");
  const activityExam = document.getElementById("exam-btn");
  const activityReportCard = document.getElementById("genRepCardBtn");

  // Initialize: Hide all forms on startup
  [
    addStudentForm,
    sbaEntryForm,
    examEntryInfoForm,
    ovrPerformanceForm,
    reportCardForm,
  ].forEach((f) => f.classList.add("hidden"));

  // Button: Add Student
  if (activityAddStudent) {
    activityAddStudent.addEventListener("click", () => {
      activityBox.classList.add("hidden");
      addStudentForm.classList.remove("hidden");
    });
  }

  // Button: SBA
  if (activitySba) {
    activitySba.addEventListener("click", () => {
      activityBox.classList.add("hidden");
      sbaEntryForm.classList.remove("hidden");
    });
  }

  // Button: Exam
  if (activityExam) {
    activityExam.addEventListener("click", () => {
      activityBox.classList.add("hidden");
      examEntryInfoForm.classList.remove("hidden");
    });
  }

  // Button: Report Card
  if (activityReportCard) {
    activityReportCard.addEventListener("click", () => {
      activityBox.classList.add("hidden");
      reportCardForm.classList.remove("hidden");
    });
  }
};

// ============================================
// NEW EXPORTED FUNCTION: Setup back buttons
// Called from: App.js bootstrap (or specific modules)
// ============================================
export const setupBackButtons = () => {
  const activityBox = document.getElementById("activity-box");
  const addStudentForm = document.getElementById("addStudentForm");
  const sbaEntryInfoForm = document.getElementById("SBA-Entry-Info");
  const examEntryInfoForm = document.getElementById("Exam-Entry-Info");
  const ovrPerformanceForm = document.getElementById("ovrPerformance");
  const reportCardForm = document.getElementById("report-card-form");

  const goBackFromAddStudent = document.getElementById(
    "goBackToHomePageFromAddStudent",
  );
  const goBackFromSBA = document.getElementById("goBackToHomePageFromSBAForm");
  const goBackFromOvrPerformance = document.getElementById(
    "goBackToHomePageFromOvrPerformance",
  );
  const goBackFromReportCard = document.getElementById(
    "goBackToHomePageFromReportCard",
  );

  // Go back from add student form
  if (goBackFromAddStudent) {
    goBackFromAddStudent.addEventListener("click", () => {
      activityBox.classList.remove("hidden");
      addStudentForm.classList.add("hidden");
    });
  }

  // Go back from SBA form
  if (goBackFromSBA) {
    goBackFromSBA.addEventListener("click", () => {
      sbaEntryInfoForm.reset();
      activityBox.classList.remove("hidden");
      sbaEntryInfoForm.classList.add("hidden");
    });
  }

  // Go back from performance form
  if (goBackFromOvrPerformance) {
    goBackFromOvrPerformance.addEventListener("click", () => {
      examEntryInfoForm.reset();
      ovrPerformanceForm.reset();
      ovrPerformanceForm.classList.add("hidden");
      activityBox.classList.remove("hidden");
    });
  }

  // Go back from report card form
  if (goBackFromReportCard) {
    goBackFromReportCard.addEventListener("click", () => {
      reportCardForm.reset();
      reportCardForm.classList.add("hidden");
      activityBox.classList.remove("hidden");
    });
  }
};
