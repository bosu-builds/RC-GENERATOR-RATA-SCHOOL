"use strict";

// SUPABASE CONNECTION & CREDENTIALS
const supabaseUrl = "https://dlcraalewausdcatouqp.supabase.co";
const supabaseKey = "sb_publishable_LBkGLuDop84iUCB6Yxd_Dg_LpaC-kyG";
const _supabase = window.supabase
  ? window.supabase.createClient(supabaseUrl, supabaseKey)
  : null;

// DATABASE SETUP
const db = new Dexie("RataSchoolDB");
db.version(3).stores({
  master_records: "id, classKey",
});

// MASTER VAULT SYNC
const syncMasterVault = async (silent = false) => {
  if (!_supabase) {
    if (!silent) alert("Supabase not initialized.");
    return;
  }
  try {
    const { data, error } = await _supabase
      .from("students_sync")
      .select("data");
    if (error) throw error;
    await db.master_records.clear();
    const officialRecords = data.map((row) => row.data);
    await db.master_records.bulkPut(officialRecords);
    if (!silent) alert(`✅ VAULT UPDATED: ${data.length} records synced.`);
  } catch (err) {
    if (!silent) alert("❌ Vault sync failed.");
  }
};

window.onload = () => syncMasterVault(true);

// CLOUD-DIRECT SAVE ENGINE
const saveToCloudDirect = async (studentData) => {
  if (!_supabase) return alert("Supabase not initialized.");
  if (!navigator.onLine) return alert("⚠️ Device offline.");
  try {
    const { data: cloudEntry } = await _supabase
      .from("students_sync")
      .select("data")
      .eq("id", studentData.id)
      .maybeSingle();

    let finalData = studentData;
    if (cloudEntry && cloudEntry.data) {
      const cloudStudent = cloudEntry.data;
      finalData = {
        ...cloudStudent,
        ...studentData,
        scores: {
          ...(cloudStudent.scores || {}),
          ...(studentData.scores || {}),
        },
        performance: {
          ...(cloudStudent.performance || {}),
          ...(studentData.performance || {}),
        },
        granularScores: {
          ...(cloudStudent.granularScores || {}),
          ...(studentData.granularScores || {}),
        },
        updatedAt: new Date().toISOString(),
      };
    }
    const { error: upsertError } = await _supabase
      .from("students_sync")
      .upsert({
        id: finalData.id,
        class_key: finalData.classKey,
        student_name: finalData.info.name,
        data: finalData,
        updated_at: finalData.updatedAt,
      });
    if (upsertError) throw upsertError;
    await db.master_records.put(finalData);
    return true;
  } catch (err) {
    alert("❌ Save failed.");
    return false;
  }
};

// NUMBER RANGE VALIDATOR
const validateNumberRange = (activeInputField, min, max) => {
  // 1. Store the NUMBER for calculation
  const numericValue = parseFloat(activeInputField.value);

  // 2. Use the "Live Link" (.value) to check if it's empty
  // AND check the calculated number against your rules
  if (
    activeInputField.value !== "" &&
    (isNaN(numericValue) || numericValue < min || numericValue > max)
  ) {
    // 3. This will target the .value of the activeInputField
    // to actually wipe the box on the user's screen.
    activeInputField.value = "";

    console.warn(`Input cleared: Value must be between ${min} and ${max}`);
  }
};

// DATA STRUCTURES& HELPERS (UPDATED)
// I have to add the subject codes here dirctly so
// i will have all the info about the subject in one place, but am tired now,
// so i will do this at dawn
const schoolSubjects = {
  KG: [
    { id: 101, name: "Literacy", code: "Lit" },
    { id: 102, name: "Listening", code: "Lst" },
    { id: 103, name: "Vocabulary", code: "Voc" },
    { id: 104, name: "Alphabet", code: "Alph" },
    { id: 105, name: "Phonics", code: "Phon" },
    { id: 106, name: "Writing", code: "Wri" },
    { id: 107, name: "Numeracy", code: "Num" },
    { id: 301, name: "Creative Arts", code: "CA" },
    { id: 108, name: "Print", code: "Prnt" },
    { id: 109, name: "Nature Science", code: "NatSci" },
  ],
  "Lower Primary": [
    { id: 201, name: "English", code: "Eng" },
    { id: 202, name: "Maths", code: "Math" },
    { id: 203, name: "Science", code: "Sci" },
    { id: 205, name: "RME", code: "RME" },
    { id: 301, name: "Creative Arts", code: "CA" },
    { id: 204, name: "History", code: "Hist" },
  ],
  "Upper Primary": [
    { id: 201, name: "English", code: "Eng" },
    { id: 202, name: "Maths", code: "Math" },
    { id: 203, name: "Science", code: "Sci" },
    { id: 204, name: "History", code: "Hist" },
    { id: 302, name: "Computing", code: "Comp" },
    { id: 205, name: "RME", code: "RME" },
    { id: 301, name: "Creative Arts", code: "CA" },
  ],
  JHS: [
    { id: 201, name: "English", code: "Eng" },
    { id: 202, name: "Maths", code: "Math" },
    { id: 203, name: "Science", code: "Sci" },
    { id: 206, name: "Social Studies", code: "Soc" },
    { id: 304, name: "Career Tech", code: "CTech" },
    { id: 205, name: "RME", code: "RME" },
    { id: 302, name: "Computing", code: "Comp" },
    { id: 303, name: "Creative Arts", code: "CA" },
    { id: 401, name: "Twi", code: "Twi" },
  ],
};

const mapClassToNumber = {
  "Basic 1": 1,
  "Basic 2": 2,
  "Basic 3": 3,
  "Basic 4": 4,
  "Basic 5": 5,
  "Basic 6": 6,
  "Basic 7": 7,
  "Basic 8": 8,
  "Basic 9": 9,
  "KG 1": "KG1",
  "KG 2": "KG2",
};

const getLevelByGrade = (gradeValue) => {
  if (gradeValue.includes("KG")) return "KG";
  // This regex handles "Basic 7" or "JHS 1" by extracting the digit
  const num = parseInt(gradeValue.replace(/\D/g, ""));
  if (num >= 7) return "JHS";
  if (num >= 1 && num <= 3) return "Lower Primary";
  if (num >= 4 && num <= 6) return "Upper Primary";
  return null;
};

// Helper for the searchable Class Key (Handles the B vs KG prefix)
const getClassKey = (cNum, term, year) => {
  const isKG = typeof cNum === "string" && cNum.startsWith("KG");
  return `${isKG ? "" : "B"}${cNum}-T${term}-Y${year}`;
};

/**
 * COMPOUND-SAFE ID GENERATOR
 */
const generateSmartId = (fullName, cNum, term, year) => {
  if (!fullName) return "";
  const cleanInput = fullName
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "");
  const parts = cleanInput.split(/\s+/).filter(Boolean);
  const first = parts[0];
  const last = parts.length > 1 ? parts[parts.length - 1] : "student";

  let levelPart =
    typeof cNum === "string" && cNum.startsWith("KG")
      ? cNum.toLowerCase()
      : `b${cNum}`;

  return `${first}_${last}_${levelPart}_t${term}_${year}`;
};
// UI ELEMENTS & NAVIGATION
const activityBox = document.getElementById("activity-box");
const studentForm = document.getElementById("studentForm");
const examScoresForm = document.getElementById("examScoresForm");
const dynamicSubjectsContainer = document.getElementById(
  "dynamic-subjects-container",
);
const ovrPerformanceForm = document.getElementById("ovrPerformance");
const nextStuInfoBtn = document.getElementById("Next-Student-Form");
const nextExamScoresFormBtn = document.getElementById("Next-Exam-Scores-Form");
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

// EXAM FORM VALIDATION: For Dynamically Generated Subject Scores
examScoresForm.addEventListener("input", (inputEventDetails) => {
  const activeInput = inputEventDetails.target;

  // We only trigger the guard if the user is typing in an exam score box
  if (activeInput.classList.contains("exam")) {
    // Enforcing the 0-100 range for all exam scores
    validateNumberRange(activeInput, 0, 100);
  }
});

if (syncVaultBtn)
  syncVaultBtn.addEventListener("click", () => syncMasterVault(false));

[
  addStudentForm,
  assignmentForm,
  studentForm,
  examScoresForm,
  ovrPerformanceForm,
].forEach((f) => f.classList.add("hidden"));

activityAddStudent.addEventListener("click", () => {
  activityBox.classList.add("hidden");
  addStudentForm.classList.remove("hidden");
});
activitySba.addEventListener("click", () => {
  activityBox.classList.add("hidden");
  assignmentForm.classList.remove("hidden");
});
activityExam.addEventListener("click", () => {
  activityBox.classList.add("hidden");
  studentForm.classList.remove("hidden");
});

// STUDENT REGISTRATION: I implemented this in the afternoon to
// create a new record with DUPLICATE CHECK

const saveNewStudentBtn = document.getElementById("saveNewStudentBtn");

saveNewStudentBtn.addEventListener("click", async (e) => {
  e.preventDefault();

  // 1. HARVEST INPUTS
  const name = document.getElementById("new-student-name").value;
  const gradeVal = document.getElementById("new-grade").value;
  const term = document.getElementById("new-term").value;
  const year = document.getElementById("new-year").value;

  if (!name || !gradeVal) return alert("Fill all fields");

  // 2. PROCESS DATA WITH HELPERS
  const cNum = mapClassToNumber[gradeVal] || gradeVal;

  // Use the new helpers we added to Section 5
  const id = generateSmartId(name, cNum, term, year);
  const classKey = getClassKey(cNum, term, year);

  // 3. DUPLICATE CHECK
  const existingRecord = await db.master_records.get(id);
  if (existingRecord) {
    return alert(`🚫 DUPLICATE DETECTED: ${name} is already registered!`);
  }

  // 4. PREPARE THE DATA OBJECT
  const newStudentData = {
    id,
    classKey, // Uses the smart prefix logic (B7 vs KG1)
    info: { name, class: cNum, term, year },
    scores: {},
    performance: {},
    granularScores: {},
    updatedAt: new Date().toISOString(),
  };

  // 5. SAVE TO CLOUD AND DEXIE
  const success = await saveToCloudDirect(newStudentData);
  if (success) {
    alert("✅ Student Registered Successfully!");
    addStudentForm.reset();
  }
});

const goBackToHomePageFromAddStudent = document.getElementById(
  "goBackToHomePageFromAddStudent",
);

if (goBackToHomePageFromAddStudent) {
  goBackToHomePageFromAddStudent.addEventListener("click", () => {
    activityBox.classList.remove("hidden");
    addStudentForm.classList.add("hidden");
  });
}

const goBackToHomePageFromOvrPerformance = document.getElementById(
  "goBackToHomePageFromOvrPerformance",
);
if (goBackToHomePageFromOvrPerformance) {
  goBackToHomePageFromOvrPerformance.addEventListener("click", () => {
    studentForm.reset();
    ovrPerformanceForm.reset();
    examScoresForm.reset();

    ovrPerformanceForm.classList.add("hidden");
    activityBox.classList.remove("hidden");
  });
}
// Enter Exam Scores And OVR performance for next student
nextStudentBtn.addEventListener("click", () => {
  [studentForm, examScoresForm, ovrPerformanceForm].forEach((f) => f.reset());
  currentStudentId = "";
  studentForm.classList.remove("hidden");
  examScoresForm.classList.add("hidden");
  ovrPerformanceForm.classList.add("hidden");
  alert("Ready for the next student.");
});

// SBA GRADING LOGIC (Gatekeeper)
assignmentGrade.addEventListener("input", () => {
  const level = getLevelByGrade(assignmentGrade.value);
  subjectOptions.innerHTML = "";
  if (level && schoolSubjects[level]) {
    schoolSubjects[level].forEach((sub) => {
      const opt = document.createElement("option");
      opt.value = sub.name;
      subjectOptions.appendChild(opt);
    });
  }
});

const assignmentFormElement = document.getElementById("assignmentForm");
assignmentFormElement.addEventListener("submit", async (e) => {
  e.preventDefault();

  // 1. Data Gathering
  const maxInput = document.getElementById("assignment-max");
  let max = maxInput.value;

  const year = document.getElementById("assignment-year").value;
  const grade = assignmentGrade.value;
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
  const targetClassKey = `B${cNum}-T${term}-Y${year}`;
  const assignmentId = `${subCode}-${typeCode}${num}-${targetClassKey}`;

  // 3. Fetch Cohort
  const cohort = await db.master_records
    .where("classKey")
    .equals(targetClassKey)
    .toArray();

  if (cohort.length === 0) return alert("No students found. Sync Vault.");

  // 4. PRE-FILL & HEADER LOGIC
  studentListBody.innerHTML = "";
  const titleElement = document.getElementById("grading-title");
  const subtitleElement = document.getElementById("grading-subtitle");

  // RESTORED: Your human-readable timestamp helper
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

  //SAFETY CHECK & MAX SCORE RESOLUTION
  // Find a sample entry to see if this assignment already exists in the DB
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
  assignmentFormElement.classList.add("hidden");
  gradingContainer.classList.remove("hidden");
});

// SBA FORM VALIDATION: For Dynamically Generated Assignment Scores
gradingContainer.addEventListener("input", (inputEventDetails) => {
  const activeInput = inputEventDetails.target;

  // 1. Guard check:  I only care if they are typing in an SBA score box
  if (activeInput.classList.contains("grading-score-input")) {
    // 2. Dynamic Max Extraction: I have to Grab the specific max value the code generated for this assignment
    const currentMax = parseFloat(activeInput.getAttribute("max")) || 100;

    // 3. Fire my exact validator with the dynamic max
    validateNumberRange(activeInput, 0, currentMax);
  }
});

// SBA SAVING ENGINE: Handles creation, updates, and deletion of granular scores
const saveAssignmentScoresBtn = document.getElementById("save-scores-btn");
saveAssignmentScoresBtn.addEventListener("click", async () => {
  const inputs = document.querySelectorAll(".grading-score-input");
  const subject = document.getElementById("assignment-subject").value;
  const typeKey = `${document.getElementById("assignment-type").value}_${document.getElementById("assignment-number").value}`;
  const maxVal = document.getElementById("assignment-max").value;
  const dateVal = document.getElementById("assignment-date").value;

  const syncPromises = Array.from(inputs).map(async (input) => {
    const student = await db.master_records.get(input.dataset.studentId);
    if (!student) return;

    // This Ensure the data structure exists
    if (!student.granularScores) student.granularScores = {};
    if (!student.granularScores[subject]) student.granularScores[subject] = [];

    const assignmentId = input.dataset.assignmentId;
    const inputValue = input.value;

    // 1. Find if this specific assignment already exists for the student
    const existingIndex = student.granularScores[subject].findIndex(
      (item) => item.assignmentId === assignmentId,
    );

    let isModified = false;

    if (inputValue === "") {
      // 2. THE GHOST SCORE FIX: If the box is empty and a record exists, It will DELETE it
      if (existingIndex !== -1) {
        student.granularScores[subject].splice(existingIndex, 1);
        isModified = true;
      }
    } else {
      // 3. Prepare the new or updated entry
      const updatedEntry = {
        assignmentId: assignmentId,
        type: typeKey,
        score: inputValue,
        max: maxVal,
        date: dateVal,
        updatedAt: new Date().toISOString(),
      };

      if (existingIndex !== -1) {
        // 4. DUPLICATE FIX: Update the existing record instead of pushing a duplicate
        student.granularScores[subject][existingIndex] = updatedEntry;
        isModified = true;
      } else {
        // 5. Create a brand new record
        student.granularScores[subject].push(updatedEntry);
        isModified = true;
      }
    }

    // 6. Only trigger the Cloud sync if a change actually happened
    // inside the saveAssignmentScoresBtn.map loop
    if (isModified) {
      const success = await saveToCloudDirect(student);

      // LIVE UI UPDATE: Change the "New" or old timestamp to "Just Now"
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
  assignmentFormElement.reset();
  gradingContainer.classList.add("hidden");
  activityBox.classList.remove("hidden");
});

let currentStudentId = "";

// NEWLY ADDED BLOCK OOF CODE FOR

/* ============================================================
   DYNAMIC STUDENT DROPDOWN LOGIC
============================================================ */
const updateStudentDropdown = async () => {
  const nameInput = document.getElementById("studentName");
  const nameDatalist = document.getElementById("studentNameOptions");
  const gradeVal = document.getElementById("grade").value.trim();
  const term = document.getElementById("term").value.trim();
  const year = document.getElementById("year").value.trim();

  // 1. Guard clause: Ensure all fields exist and have values
  if (!gradeVal || !term || !year || !nameDatalist) return;

  // 2. Use your existing helpers to get the exact database key (e.g., B7-T2-Y2026)
  const cNum = mapClassToNumber[gradeVal] || gradeVal;
  const targetClassKey = getClassKey(cNum, term, year);

  try {
    // 3. Query IndexedDB for this specific cohort
    const matchingStudents = await db.master_records
      .where("classKey")
      .equals(targetClassKey)
      .toArray();

    // 4. Reset the datalist and the name input
    nameDatalist.innerHTML = "";
    nameInput.value = "";

    // 5. Populate the datalist alphabetically
    matchingStudents
      .sort((a, b) => a.info.name.localeCompare(b.info.name))
      .forEach((stu) => {
        const option = document.createElement("option");
        option.value = stu.info.name;
        nameDatalist.appendChild(option);
      });
  } catch (err) {
    console.error("Dropdown Sync Error:", err);
  }
};

// 6. Attach listeners to trigger the update when the teacher changes Class, Term, or Year
["grade", "term", "year"].forEach((id) => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener("change", updateStudentDropdown);
    el.addEventListener("input", updateStudentDropdown); // Catches typing before clicking away
  }
});

// EXAM & PERFORMANCE LOGIC (Verified & Aligned)
nextStuInfoBtn.addEventListener("click", async (e) => {
  e.preventDefault();

  // 1. Gather Inputs into clean variables first
  const name = document.getElementById("studentName").value;
  const grade = document.getElementById("grade").value;
  const term = document.getElementById("term").value;
  const year = document.getElementById("year").value;

  // 2. Map the grade (e.g., "Basic 7" -> 7)
  const cNum = mapClassToNumber[grade] || grade;

  // 3. Generate ID (Matches Registration 1:1)
  const id = generateSmartId(name, cNum, term, year);
  currentStudentId = id;

  // 4. Search the Dexie Vault
  const existing = await db.master_records.get(id);

  if (!existing) {
    return alert(
      `🔍 STUDENT NOT FOUND IN THE SYSTEM\n\n` +
        `The system searched for:\n` +
        `• ID: "${id}"\n` + // Now shows the clean 'b7' or 'kg1' ID
        `• Name: ${name}\n` +
        `• Grade: ${grade}\n` +
        `• Term: ${term}\n` +
        `• Year: ${year}\n\n` +
        `💡 TIP: Please ensure the student is registered for THIS specific class, term and year before entering scores.`,
    );
  }

  // 5. Load Subjects (Uses your restored schoolSubjects object)
  const level = getLevelByGrade(grade);
  dynamicSubjectsContainer.innerHTML = "";

  if (schoolSubjects[level]) {
    schoolSubjects[level].forEach((sub) => {
      const div = document.createElement("div");
      div.className = "subject-row";
      div.innerHTML = `
        <label>${sub.name}</label>
        <input type="number" 
               id="s_${sub.id}_exam" 
               class="exam" 
               placeholder="0 - 100" 
               value="${existing.scores[`s_${sub.id}_exam`] || ""}">`;
      dynamicSubjectsContainer.appendChild(div);
    });
  }

  // 6. Populate Performance Fields
  if (existing.performance) {
    [
      "attendance",
      "attitude",
      "character",
      "interest",
      "ct-remarks",
      "con",
    ].forEach((f) => {
      const el = document.getElementById(f);
      if (el) el.value = existing.performance[f] || "";
    });
  }

  // 7. UI Transition
  studentForm.classList.add("hidden");
  examScoresForm.classList.remove("hidden");
});

saveStuBtn.addEventListener("click", async (e) => {
  e.preventDefault();

  const existing = await db.master_records.get(currentStudentId);
  if (!existing)
    return alert("❌ Error: Student record not found in the system.");

  const studentName = existing.info.name;
  const grade = document.getElementById("grade").value;
  const subjects = schoolSubjects[getLevelByGrade(grade)];

  let scores = { ...existing.scores };
  let filledCount = 0;
  let missingSubjects = []; // 1. Create a container for missing names

  // 2. Loop through and capture EVERY state (filled or empty)
  subjects.forEach((sub) => {
    const input = document.getElementById(`s_${sub.id}_exam`);

    if (input) {
      //  Always assign the value to the scores object.
      // Even if it is "", it will overwrite the old score in the Cloud.
      scores[`s_${sub.id}_exam`] = input.value;

      if (input.value !== "") {
        filledCount++;
      } else {
        missingSubjects.push(sub.name);
      }
    }
  });
  // 3. Prepare the update package
  const updated = {
    ...existing,
    scores,
    performance: {
      con: document.getElementById("con")?.value || "",
      attendance: document.getElementById("attendance").value || "",
      attitude: document.getElementById("attitude").value || "",
      character: document.getElementById("character").value || "",
      interest: document.getElementById("interest").value || "",
      ctRemarks: document.getElementById("ct-remarks").value || "",
    },
    updatedAt: new Date().toISOString(),
  };

  // 4. Save and provide the detailed alert
  const success = await saveToCloudDirect(updated);
  if (success) {
    // 5. Create a clean string for the missing subjects
    const pendingText =
      missingSubjects.length > 0
        ? `Pending: ${missingSubjects.join(", ")}`
        : `All subjects completed! 🌟`;

    alert(
      `✅ VAULT UPDATED SUCCESSFULLY\n\n` +
        `Student: ${studentName}\n` +
        `Class: ${grade}\n` +
        `Progress: ${filledCount} of ${subjects.length} subjects recorded.\n` +
        `${pendingText}\n\n` + // 6. Insert the list here
        `You can leave and finish the rest later!`,
    );
  }
});

nextExamScoresFormBtn.addEventListener("click", (e) => {
  e.preventDefault();
  examScoresForm.classList.add("hidden");
  ovrPerformanceForm.classList.remove("hidden");
});

// REMARKS CLEANER: Strips out reference numbers like (1) or (2) from text fields
const performanceFields = ["attitude", "character", "interest", "ct-remarks"];
performanceFields.forEach((id) => {
  const inputEl = document.getElementById(id);
  if (inputEl) {
    inputEl.addEventListener("input", (e) => {
      e.target.value = e.target.value.replace(/^\(\d+\)\s*/, "");
    });
  }
});

genRepCardBtn.addEventListener("click", async () => {
  const data = await db.master_records.toArray();
  studentDropdown.innerHTML = '<option value="">-- Select Student --</option>';
  data
    .sort((a, b) => a.info.name.localeCompare(b.info.name))
    .forEach((s) => {
      const opt = document.createElement("option");
      opt.value = `${s.classKey}::${s.id}`;
      opt.textContent = `${s.info.name} (${s.info.class})`;
      studentDropdown.appendChild(opt);
    });
  studentDropdown.classList.remove("hidden");
});

studentDropdown.addEventListener("change", function () {
  if (this.value) {
    const [ck, sid] = this.value.split("::");
    window.location.href = `rcPdfSheet/RC-F-B.html?classKey=${ck}&studentId=${sid}`;
  }
});

// FULL MODAL WINDOW CODE
/* ============================================================
   DIRECTORY DATA ENGINE
============================================================ */
const getGroupedDirectory = async () => {
  if (typeof db === "undefined") return null;

  try {
    const allStudents = await db.master_records.toArray();
    if (!allStudents || allStudents.length === 0) return {};

    const grouped = {};
    allStudents.forEach((stu) => {
      const ck = stu.classKey || "Unassigned";
      if (!grouped[ck]) grouped[ck] = [];
      grouped[ck].push({
        name: stu.info?.name || "Unknown",
        id: stu.id,
      });
    });
    return grouped;
  } catch (err) {
    console.error("Vault Read Error:", err);
    return null;
  }
};

/* ============================================================
   MODAL & OVERLAY ELEMENTS
============================================================ */
const dirOverlay = document.getElementById("modal-overlay");
const dirWindow = document.getElementById("directory-modal");
const dirList = document.getElementById("directory-list");
const dirCloseBtn = document.getElementById("close-modal-btn");
const dirTotalCount = document.getElementById("total-count");
const dirSyncStatus = document.getElementById("sync-status");
const dirSearchInput = document.getElementById("directory-search");
const viewAllBtn = document.getElementById("view-students-btn");

/* ============================================================
   OPEN & RENDER LOGIC
============================================================ */
const openDirectory = async () => {
  // 1. Open the modal immediately
  dirOverlay.classList.remove("hidden");
  dirList.innerHTML = `<div class="loading">Loading local records...</div>`;
  dirSearchInput.value = ""; // Clear search on open

  // 2. Fetch from IndexedDB
  const data = await getGroupedDirectory();

  if (!data || Object.keys(data).length === 0) {
    dirList.innerHTML = `<div class="empty">No students found in the vault.</div>`;
    dirTotalCount.innerText = "0";
    return;
  }

  dirList.innerHTML = "";
  let totalCounter = 0;

  // 3. Sort Classes (Basic 1 -> Basic 9)
  const sortedClasses = Object.keys(data).sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, "")) || 0;
    const numB = parseInt(b.replace(/\D/g, "")) || 0;
    return numA - numB;
  });

  // 4. Render HTML
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

    // UPDATED HEADER: Now includes the count on the right
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

  // 5. Background Sync Trigger
  if (typeof syncAllData === "function") {
    dirSyncStatus.innerText = "Syncing...";
    dirSyncStatus.style.background = "#ff9800"; // Orange while syncing

    syncAllData()
      .then(() => {
        dirSyncStatus.innerText = "Cloud Synced";
        dirSyncStatus.style.background = "#4CAF50"; // Green on success
      })
      .catch(() => {
        dirSyncStatus.innerText = "Offline Mode";
        dirSyncStatus.style.background = "#f44336"; // Red on fail
      });
  }
};

/* ============================================================
   EVENT LISTENERS
============================================================ */
// Open Directory
if (viewAllBtn) {
  viewAllBtn.addEventListener("click", openDirectory);
}

// Close Modal
if (dirCloseBtn) {
  dirCloseBtn.addEventListener("click", () =>
    dirOverlay.classList.add("hidden"),
  );
}

// Close on Overlay Click
if (dirOverlay) {
  dirOverlay.addEventListener("click", (e) => {
    if (e.target === dirOverlay) dirOverlay.classList.add("hidden");
  });
}

// Real-Time Search Filter
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
