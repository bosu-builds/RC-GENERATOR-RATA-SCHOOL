"use strict";

// SUPABASE CONNECTION & CREDENTIALS
const supabaseUrl = "https://dlcraalewausdcatouqp.supabase.co";
const supabaseKey = "sb_publishable_LBkGLuDop84iUCB6Yxd_Dg_LpaC-kyG";
const _supabase = window.supabase
  ? window.supabase.createClient(supabaseUrl, supabaseKey)
  : null;

// CLOUD SYNC ENGINE: Merges local data with cloud data to prevent overwriting other teachers' work
const syncToCloud = async (localStudent) => {
  if (!_supabase) return console.warn("Supabase not initialized.");
  if (!navigator.onLine)
    return console.warn("⚠️ Device offline. Local save only.");

  try {
    // 1. Check if this student already exists in the cloud
    const { data: cloudEntry, error: fetchError } = await _supabase
      .from("students_sync")
      .select("data")
      .eq("id", localStudent.id)
      .maybeSingle();

    let finalData = localStudent;

    // 2. SMART MERGE: If cloud data exists, combine it with local data
    // This ensures that if Teacher A enters Math and Teacher B enters English, both are saved.
    if (cloudEntry && cloudEntry.data) {
      const cloudStudent = cloudEntry.data;
      finalData = {
        ...cloudStudent,
        ...localStudent,
        scores: {
          ...(cloudStudent.scores || {}),
          ...(localStudent.scores || {}),
        },
        performance: {
          ...(cloudStudent.performance || {}),
          ...(localStudent.performance || {}),
        },
        granularScores: {
          ...(cloudStudent.granularScores || {}),
          ...(localStudent.granularScores || {}),
        },
        updatedAt: new Date().toISOString(),
      };
    }

    // 3. Update the local Dexie database with the merged version
    await db.students.put(finalData);

    // 4. Push the final merged record back to the cloud
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
    console.log(`☁️ Smart Sync Success: ${finalData.info.name}`);
  } catch (err) {
    console.error("❌ Cloud Sync Failed:", err.message);
  }
};

// MASTER VAULT SYNC: Downloads everything from the cloud to the official records for printing
const syncMasterVault = async () => {
  if (!_supabase) return alert("Supabase not initialized.");
  try {
    const { data, error } = await _supabase
      .from("students_sync")
      .select("data");
    if (error) throw error;

    await db.master_records.clear();
    const officialRecords = data.map((row) => row.data);
    await db.master_records.bulkPut(officialRecords);

    alert(
      `✅ VAULT UPDATED: ${data.length} student records synced from the cloud.`,
    );
  } catch (err) {
    alert("❌ Vault sync failed. Check your internet connection.");
  }
};

// HELPER FUNCTIONS: Date formatting and ID generation
const formatPolishedDate = (isoString) => {
  if (!isoString) return "None (First Save)";
  const date = new Date(isoString);
  let hours = date.getHours();
  let minutes = date.getMinutes();
  const ampm = hours >= 12 ? "pm" : "am";
  hours = hours % 12 || 12;
  const strTime = `${hours}:${minutes < 10 ? "0" + minutes : minutes} ${ampm}`;
  const day = date.getDate();
  let suffix = "th";
  if (day % 10 === 1 && day !== 11) suffix = "st";
  else if (day % 10 === 2 && day !== 12) suffix = "nd";
  else if (day % 10 === 3 && day !== 13) suffix = "rd";
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return `${strTime} ${day}${suffix} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
};

const generateSmartId = (name, cNum, term, year) => {
  const parts = name.trim().toLowerCase().split(/\s+/);
  return `${parts[0]}_${parts[parts.length - 1]}_b${cNum}_t${term}_${year}`;
};

// DATABASE SETUP: Dexie DB configuration and school subject lists
const db = new Dexie("RataSchoolDB");
db.version(2).stores({
  students: "id, classKey",
  master_records: "id, classKey",
});

const schoolSubjects = {
  KG: [
    { id: 101, name: "Literacy" },
    { id: 102, name: "Listening" },
    { id: 103, name: "Vocabulary" },
    { id: 104, name: "Alphabet" },
    { id: 105, name: "Phonics" },
    { id: 106, name: "Writing" },
    { id: 107, name: "Numeracy" },
    { id: 301, name: "Creative Arts" },
    { id: 108, name: "Print" },
    { id: 109, name: "Nature Science" },
  ],
  "Lower Primary": [
    { id: 201, name: "English" },
    { id: 202, name: "Maths" },
    { id: 203, name: "Science" },
    { id: 205, name: "RME" },
    { id: 301, name: "Creative Arts" },
    { id: 204, name: "History" },
  ],
  "Upper Primary": [
    { id: 201, name: "English" },
    { id: 202, name: "Maths" },
    { id: 203, name: "Science" },
    { id: 204, name: "History" },
    { id: 302, name: "Computing" },
    { id: 205, name: "RME" },
    { id: 301, name: "Creative Arts" },
  ],
  JHS: [
    { id: 201, name: "English" },
    { id: 202, name: "Maths" },
    { id: 203, name: "Science" },
    { id: 206, name: "Social Studies" },
    { id: 304, name: "Career Tech" },
    { id: 205, name: "RME" },
    { id: 302, name: "Computing" },
    { id: 303, name: "Creative Arts" },
    { id: 401, name: "Twi" },
  ],
};

const mapClassToNumber = {
  "Basic 1": 1,
  "Basic 2": 2,
  "Basic 3": 3,
  "Basic 4": 4,
  "Basic 5": 5,
  "Basic 6": 6,
  "KG 1": "KG1",
  "KG 2": "KG2",
  "JHS 1": 7,
  "JHS 2": 8,
  "JHS 3": 9,
};

const getLevelByGrade = (gradeValue) => {
  if (gradeValue.includes("KG")) return "KG";
  if (gradeValue.includes("JHS")) return "JHS";
  const num = parseInt(gradeValue.replace(/\D/g, ""));
  if (num >= 1 && num <= 3) return "Lower Primary";
  if (num >= 4 && num <= 6) return "Upper Primary";
  return null;
};

// UI ELEMENTS: References to DOM containers and buttons
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

if (syncVaultBtn) syncVaultBtn.addEventListener("click", syncMasterVault);

// INPUT VALIDATION: Keeps scores within allowed ranges (0-100 or 0-Max)
studentListBody.addEventListener("input", (e) => {
  if (e.target.classList.contains("grading-score-input")) {
    const input = e.target;
    const max = parseFloat(input.getAttribute("max")) || 100;
    const val = parseFloat(input.value);
    if (input.value !== "" && (val > max || val < 0)) input.value = "";
  }
});

dynamicSubjectsContainer.addEventListener("input", (e) => {
  if (e.target.classList.contains("exam")) {
    const input = e.target;
    const val = parseFloat(input.value);
    if (input.value !== "" && (val > 100 || val < 0)) input.value = "";
  }
});

// NAVIGATION HANDLERS: Controlling which forms are visible
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

// STUDENT REGISTRATION: Creates a new student record and pushes to cloud
const saveNewStudentBtn = document.getElementById("saveNewStudentBtn");
saveNewStudentBtn.addEventListener("click", async (e) => {
  e.preventDefault();
  const name = document.getElementById("new-student-name").value;
  const gradeVal = document.getElementById("new-grade").value;
  if (!name || !gradeVal) return alert("Fill all fields");

  const cNum = mapClassToNumber[gradeVal] || gradeVal;
  const term = document.getElementById("new-term").value;
  const year = document.getElementById("new-year").value;
  const id = generateSmartId(name, cNum, term, year);

  const newStudentData = {
    id,
    classKey: `B${cNum}-T${term}-Y${year}`,
    info: { name, class: cNum, term, year },
    scores: {},
    performance: {},
    updatedAt: new Date().toISOString(),
  };

  await db.students.put(newStudentData);
  await syncToCloud(newStudentData);
  alert("Student Added!");
  addStudentForm.reset();
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

// SBA & ASSIGNMENT GRADING: Bulk entry for class assignments/classwork
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
  const year = document.getElementById("assignment-year").value;
  const grade = assignmentGrade.value;
  const term = document.getElementById("assignment-term").value;
  const max = document.getElementById("assignment-max").value || 100;

  const cNum = mapClassToNumber[grade] || grade;
  const targetClassKey = `B${cNum}-T${term}-Y${year}`;

  const cohort = await db.students
    .where("classKey")
    .equals(targetClassKey)
    .toArray();
  if (cohort.length === 0)
    return alert("No students found. Register students first.");

  studentListBody.innerHTML = "";
  cohort.forEach((stu) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${stu.info.name}</td><td><input type="number" class="grading-score-input" data-student-id="${stu.id}" min="0" max="${max}" placeholder="0-${max}"></td>`;
    studentListBody.appendChild(tr);
  });

  document.getElementById("grading-title").innerText =
    `Grading: ${document.getElementById("assignment-subject").value}`;
  assignmentFormElement.classList.add("hidden");
  gradingContainer.classList.remove("hidden");
});

document
  .getElementById("save-scores-btn")
  .addEventListener("click", async () => {
    const inputs = document.querySelectorAll(".grading-score-input");
    const subject = document.getElementById("assignment-subject").value;
    const typeKey = `${document.getElementById("assignment-type").value}_${document.getElementById("assignment-number").value}`;

    for (const input of inputs) {
      const student = await db.students.get(input.dataset.studentId);
      if (student) {
        if (!student.granularScores) student.granularScores = {};
        if (!student.granularScores[subject])
          student.granularScores[subject] = [];
        student.granularScores[subject].push({
          type: typeKey,
          score: input.value,
          max: document.getElementById("assignment-max").value,
          date: document.getElementById("assignment-date").value,
          updatedAt: new Date().toISOString(),
        });
        await db.students.put(student);
        await syncToCloud(student);
      }
    }
    alert("Scores saved!");
    gradingContainer.classList.add("hidden");
    activityBox.classList.remove("hidden");
    assignmentFormElement.reset();
  });

// EXAM ENTRY & PERFORMANCE REMARKS: Individual student scoring flow
let currentStudentId = "";

nextStuInfoBtn.addEventListener("click", async (e) => {
  e.preventDefault();
  const nameVal = document.getElementById("studentName").value;
  const gradeInput = document.getElementById("grade").value;
  currentStudentId = generateSmartId(
    nameVal,
    mapClassToNumber[gradeInput],
    document.getElementById("term").value,
    document.getElementById("year").value,
  );

  const existing = await db.students.get(currentStudentId);
  if (!existing) return alert(`❌ Student "${nameVal}" is not registered!`);

  const subjects = schoolSubjects[getLevelByGrade(gradeInput)];
  dynamicSubjectsContainer.innerHTML = "";
  subjects.forEach((sub) => {
    const div = document.createElement("div");
    div.className = "subject-row";
    div.innerHTML = `<label>${sub.name}</label><input type="number" id="s_${sub.id}_exam" class="exam" placeholder="0-100" min="0" max="100">`;
    dynamicSubjectsContainer.appendChild(div);
    document.getElementById(`s_${sub.id}_exam`).value =
      existing.scores[`s_${sub.id}_exam`] || "";
  });

  if (existing.performance) {
    ["attendance", "attitude", "character", "interest", "ct-remarks"].forEach(
      (id) => {
        const field = document.getElementById(id);
        if (field) field.value = existing.performance[id] || "";
      },
    );
  }

  studentForm.classList.add("hidden");
  examScoresForm.classList.remove("hidden");
});

saveStuBtn.addEventListener("click", async (e) => {
  e.preventDefault();
  const existingRecord = await db.students.get(currentStudentId);
  let updatedScores = { ...existingRecord.scores };
  const subjects =
    schoolSubjects[getLevelByGrade(document.getElementById("grade").value)];

  subjects.forEach((sub) => {
    const input = document.getElementById(`s_${sub.id}_exam`);
    if (input) updatedScores[`s_${sub.id}_exam`] = input.value;
  });

  const fullyUpdatedStudent = {
    ...existingRecord,
    scores: updatedScores,
    performance: {
      attendance: document.getElementById("attendance").value,
      attitude: document.getElementById("attitude").value,
      character: document.getElementById("character").value,
      interest: document.getElementById("interest").value,
      ctRemarks: document.getElementById("ct-remarks").value,
    },
    updatedAt: new Date().toISOString(),
  };

  await db.students.put(fullyUpdatedStudent);
  await syncToCloud(fullyUpdatedStudent);
  alert(`Done! ${existingRecord.info.name}'s record updated.`);
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

const goBackToHomePageFromOvrPerformance = document.getElementById(
  "goBackToHomePageFromOvrPerformance",
);
if (goBackToHomePageFromOvrPerformance) {
  goBackToHomePageFromOvrPerformance.addEventListener("click", () => {
    [studentForm, examScoresForm, ovrPerformanceForm].forEach((f) => f.reset());
    ovrPerformanceForm.classList.add("hidden");
    activityBox.classList.remove("hidden");
  });
}

nextStudentBtn.addEventListener("click", () => {
  [studentForm, examScoresForm, ovrPerformanceForm].forEach((f) => f.reset());
  currentStudentId = "";
  studentForm.classList.remove("hidden");
  examScoresForm.classList.add("hidden");
  ovrPerformanceForm.classList.add("hidden");
  alert("Ready for the next student.");
});

// REPORT CARDS & DIRECTORY: Functions to view student lists or select a student for PDF generation
genRepCardBtn.addEventListener("click", async () => {
  const allMasterData = await db.master_records.toArray();
  if (allMasterData.length === 0)
    return alert("Please Sync Master Vault first.");

  studentDropdown.innerHTML =
    '<option value="">-- Select Student (Official Vault) --</option>';
  allMasterData
    .sort((a, b) => a.info.name.localeCompare(b.info.name))
    .forEach((stu) => {
      const opt = document.createElement("option");
      opt.value = `${stu.classKey}::${stu.id}`;
      opt.textContent = `${stu.info.name} (${stu.info.class})`;
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

const viewStudentsBtn = document.getElementById("view-students-btn");
const viewAllStudents = async () => {
  const allStudents = await db.students.toArray();
  if (allStudents.length === 0) return alert("Your list is empty.");
  allStudents.sort((a, b) => a.info.name.localeCompare(b.info.name));
  const grouped = {};
  allStudents.forEach((s) => {
    if (!grouped[s.classKey]) grouped[s.classKey] = [];
    grouped[s.classKey].push(`${s.info.name} : ${s.id}`);
  });
  let message = "📋 Student Directory (By Class)\n\n";
  Object.keys(grouped)
    .sort()
    .forEach((classKey) => {
      message += `${classKey} : {\n`;
      grouped[classKey].forEach(
        (entry, i) => (message += `   ${i + 1}. ${entry}\n`),
      );
      message += `}\n\n`;
    });
  alert(message);
};

if (viewStudentsBtn) viewStudentsBtn.onclick = viewAllStudents;
