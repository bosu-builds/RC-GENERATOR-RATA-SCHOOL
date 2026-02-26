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

// DATA STRUCTURES
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

const generateSmartId = (name, cNum, term, year) => {
  const parts = name.trim().toLowerCase().split(/\s+/);
  return `${parts[0]}_${parts[parts.length - 1]}_b${cNum}_t${term}_${year}`;
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
  const year = document.getElementById("assignment-year").value;
  const grade = assignmentGrade.value;
  const term = document.getElementById("assignment-term").value;
  const max = document.getElementById("assignment-max").value || 100;
  const subjectName = document.getElementById("assignment-subject").value;
  const typeFull = document.getElementById("assignment-type").value; // e.g. "Class Exercise (CE)"
  const num = document.getElementById("assignment-number").value;

  const level = getLevelByGrade(grade);
  const subObj = schoolSubjects[level].find((s) => s.name === subjectName);
  const subCode = subObj ? subObj.code : subjectName.substring(0, 3);

  // --- NEW: ABBREVIATION LOGIC ---
  // This looks for the text inside ( ) brackets
  const typeMatch = typeFull.match(/\(([^)]+)\)/);
  const typeCode = typeMatch ? typeMatch[1] : typeFull.substring(0, 3);
  // -------------------------------

  const cNum = mapClassToNumber[grade] || grade;
  const targetClassKey = `B${cNum}-T${term}-Y${year}`;

  // Clean ID: Eng-CE1-B4-T2-Y2026
  const assignmentId = `${subCode}-${typeCode}${num}-${targetClassKey}`;

  const cohort = await db.master_records
    .where("classKey")
    .equals(targetClassKey)
    .toArray();

  if (cohort.length === 0) return alert("No students found. Sync Vault.");

  const exists = cohort.some((s) =>
    s.granularScores?.[subjectName]?.some(
      (i) => i.assignmentId === assignmentId,
    ),
  );
  if (exists) return alert(`🚫 Duplicate Assignment ID!`);

  studentListBody.innerHTML = "";
  cohort.forEach((stu) => {
    const tr = document.createElement("tr");
    // The input stores the CLEAN assignmentId in its data attribute
    tr.innerHTML = `<td>${stu.info.name}</td><td><input type="number" class="grading-score-input" data-student-id="${stu.id}" data-assignment-id="${assignmentId}" min="0" max="${max}" placeholder="0-${max}"></td>`;
    studentListBody.appendChild(tr);
  });

  document.getElementById("grading-title").innerText =
    `Grading: ${subjectName}`;
  assignmentFormElement.classList.add("hidden");
  gradingContainer.classList.remove("hidden");
});

const saveAssignmentScoresBtn = document.getElementById("save-scores-btn");
saveAssignmentScoresBtn.addEventListener("click", async () => {
  const inputs = document.querySelectorAll(".grading-score-input");
  const subject = document.getElementById("assignment-subject").value;
  const typeKey = `${document.getElementById("assignment-type").value}_${document.getElementById("assignment-number").value}`;
  const syncPromises = Array.from(inputs).map(async (input) => {
    if (input.value === "") return;
    const student = await db.master_records.get(input.dataset.studentId);
    if (student) {
      if (!student.granularScores) student.granularScores = {};
      if (!student.granularScores[subject])
        student.granularScores[subject] = [];
      student.granularScores[subject].push({
        assignmentId: input.dataset.assignmentId,
        type: typeKey,
        score: input.value,
        max: document.getElementById("assignment-max").value || 100,
        date: document.getElementById("assignment-date").value,
        updatedAt: new Date().toISOString(),
      });
      await saveToCloudDirect(student);
    }
  });
  await Promise.all(syncPromises);
  alert("SBA Saved!");
  gradingContainer.classList.add("hidden");
  activityBox.classList.remove("hidden");
});

// EXAM & PERFORMANCE LOGIC
nextStuInfoBtn.addEventListener("click", async (e) => {
  e.preventDefault();
  const name = document.getElementById("studentName").value;
  const grade = document.getElementById("grade").value;
  const id = generateSmartId(
    name,
    mapClassToNumber[grade],
    document.getElementById("term").value,
    document.getElementById("year").value,
  );
  currentStudentId = id;

  const existing = await db.master_records.get(id);
  if (!existing) return alert("Register student first.");

  const level = getLevelByGrade(grade);
  dynamicSubjectsContainer.innerHTML = "";
  schoolSubjects[level].forEach((sub) => {
    const div = document.createElement("div");
    div.className = "subject-row";
    div.innerHTML = `<label>${sub.name}</label><input type="number" id="s_${sub.id}_exam" class="exam" value="${existing.scores[`s_${sub.id}_exam`] || ""}">`;
    dynamicSubjectsContainer.appendChild(div);
  });

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
  studentForm.classList.add("hidden");
  examScoresForm.classList.remove("hidden");
});

saveStuBtn.addEventListener("click", async (e) => {
  e.preventDefault();
  const existing = await db.master_records.get(currentStudentId);
  let scores = { ...existing.scores };
  const grade = document.getElementById("grade").value;
  schoolSubjects[getLevelByGrade(grade)].forEach((sub) => {
    const input = document.getElementById(`s_${sub.id}_exam`);
    if (input) scores[`s_${sub.id}_exam`] = input.value;
  });
  const updated = {
    ...existing,
    scores,
    performance: {
      con: document.getElementById("con")?.value || "",
      attendance: document.getElementById("attendance").value,
      attitude: document.getElementById("attitude").value,
      character: document.getElementById("character").value,
      interest: document.getElementById("interest").value,
      ctRemarks: document.getElementById("ct-remarks").value,
    },
    updatedAt: new Date().toISOString(),
  };
  if (await saveToCloudDirect(updated)) alert("Exam/Performance Saved!");
});

// DIRECTORY & PDF LOGIC
const viewStudentsBtn = document.getElementById("view-students-btn");
const viewAllStudents = async () => {
  if (!_supabase) return alert("Supabase not initialized.");
  try {
    const { data, error } = await _supabase
      .from("students_sync")
      .select("student_name, class_key, id")
      .order("class_key", { ascending: true });
    if (error) throw error;
    if (data.length === 0) return alert("Cloud is empty.");

    const grouped = {};
    data.forEach((row) => {
      if (!grouped[row.class_key]) grouped[row.class_key] = [];
      grouped[row.class_key].push(`${row.student_name} : ${row.id}`);
    });

    let message = "☁️ GLOBAL Student Directory (Live from Cloud)\n\n";
    Object.keys(grouped).forEach((ck) => {
      message += `📂 ${ck} : {\n`;
      grouped[ck].forEach((entry, i) => (message += `   ${i + 1}. ${entry}\n`));
      message += `}\n\n`;
    });
    alert(message);
  } catch (err) {
    alert("❌ Directory fetch failed.");
  }
};

if (viewStudentsBtn) viewStudentsBtn.onclick = viewAllStudents;

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
