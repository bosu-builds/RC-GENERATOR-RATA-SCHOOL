"use strict";

// ============================================
// DATABASE SETUP
// ============================================
const db = new Dexie("RataSchoolDB");
db.version(3).stores({
  master_records: "id, classKey",
});

// ============================================
// GRADING SCALE
// ============================================
const getGradeInfo = (total) => {
  const t = Number(total);
  if (t >= 80) return ["A1", "Excellent"];
  if (t >= 70) return ["B2", "Very Good"];
  if (t >= 65) return ["B3", "Good"];
  if (t >= 60) return ["C4", "Credit"];
  if (t >= 55) return ["C5", "Credit"];
  if (t >= 50) return ["C6", "Credit"];
  if (t >= 45) return ["D7", "Pass"];
  if (t >= 35) return ["E8", "Pass"];
  return ["F9", "Fail"];
};

// ============================================
// SUBJECT MAPPING (from SchoolData)
// ============================================
const subjectCodeToHtmlId = {
  Lit: "lit",
  Lst: "lst",
  Voc: "voc",
  Alph: "alph",
  Phon: "phon",
  Wri: "wri",
  Num: "num",
  Prnt: "prnt",
  NatSci: "natsci",
  Eng: "eng",
  Math: "math",
  Sci: "sci",
  Hist: "history",
  RME: "rme",
  Soc: "social",
  CA: "arts",
  Comp: "comp",
  CTech: "ctech",
  Twi: "twi",
};

const formalSubjectNames = {
  101: "Literacy",
  102: "Listening",
  103: "Vocabulary",
  104: "Alphabet",
  105: "Phonics",
  106: "Writing",
  107: "Numeracy",
  108: "Print",
  109: "Nature Science",
  201: "English Language",
  202: "Mathematics",
  203: "Integrated Science",
  204: "History",
  205: "Religious & Moral Education",
  206: "Social Studies",
  301: "Creative Arts",
  302: "Computing",
  303: "Creative Arts",
  304: "Career & Technical Education",
  401: "Twi Language",
};

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

// ============================================
// UTILITY: Get Photo Folder Path
// KG1 → kg1, KG 1 → kg1, 1-3 → basic1-3, 4-9 → basic4-9
// ============================================
const getPhotoFolder = (classValue) => {
  const classStr = String(classValue).toUpperCase().trim();

  // Check for KG classes
  if (classStr.includes("KG")) {
    if (classStr.includes("1")) return "kg1";
    if (classStr.includes("2")) return "kg2";
  }

  // For Basic classes, extract number
  const match = classStr.match(/\d+/);
  if (match) {
    const num = parseInt(match[0]);
    return `basic${num}`;
  }

  return "basic1"; // fallback
};

// ============================================
// UTILITY: Number to Words
// ============================================
const numberToWords = (num) => {
  const words = {
    1: "One",
    2: "Two",
    3: "Three",
    4: "Four",
    5: "Five",
    6: "Six",
    7: "Seven",
    8: "Eight",
    9: "Nine",
  };
  return words[num] || num;
};

// ============================================
// UTILITY: Format Basic Level Display
// BASIC: Four, PRE-SCHOOL: Kindergarten One
// ============================================
const formatBasicDisplay = (classValue) => {
  const classStr = String(classValue).trim();

  // Check if KG
  if (classStr === "KG1" || classStr === "KG 1") {
    return "Kindergarten One";
  }
  if (classStr === "KG2" || classStr === "KG 2") {
    return "Kindergarten Two";
  }

  // Extract number from "Basic 4" or just "4"
  const match = classStr.match(/\d+/);
  if (match) {
    const num = parseInt(match[0]);
    return `${numberToWords(num)}`;
  }

  return classStr;
};

// ============================================
// UTILITY: Determine Level by Class Number
// ============================================
const getLevelByClassNum = (classNum) => {
  if (classNum === "KG1" || classNum === "KG2") return "KG";
  const num = Number(classNum);
  if (isNaN(num)) return "KG";
  if (num >= 1 && num <= 3) return "Lower Primary";
  if (num >= 4 && num <= 6) return "Upper Primary";
  if (num >= 7) return "JHS";
  return "Upper Primary";
};

// ============================================
// UTILITY: Calculate SBA with CON
// Formula: SBA 30% = (con/5 × 5%) + (sba/30 × 25%)
// Default: con=4 (out of 5), sba=10 (out of 30)
// ============================================
const calculateSBA = (sbaScore, conScore) => {
  const sba = Number(sbaScore) || 10; // Default 10 if missing
  const con = Number(conScore) || 4; // Default 4 if missing

  const conPortion = (con / 5) * 5; // 5% of scale
  const sbaPortion = (sba / 30) * 25; // 25% of scale

  return Math.round(conPortion + sbaPortion);
};

// ============================================
// UTILITY: Calculate Exam Score (70%)
// Default: 15 if missing, scale to 70%
// ============================================
const calculateExam = (examScore) => {
  const exam = Number(examScore) || 15; // Default 15 if missing
  return Math.round((exam / 100) * 70);
};

// ============================================
// UTILITY: Calculate Total Score
// Total = SBA 30% + Exam 70%
// ============================================
const calculateTotal = (sbaScore, conScore, examScore) => {
  const sba = calculateSBA(sbaScore, conScore);
  const exam = calculateExam(examScore);
  return Math.round(sba + exam);
};

// ============================================
// UTILITY: Calculate Class Average
// Only count students with actual scores
// ============================================
const calculateClassAverage = (allStudents, subjectCode, subjectId) => {
  const scores = [];

  allStudents.forEach((st) => {
    // Find exam score for this subject
    const examKey = Object.keys(st.examScores || {}).find(
      (k) => k.startsWith(subjectCode + "-") && k.includes(String(subjectId)),
    );
    const examScore = examKey ? st.examScores[examKey] : null;

    if (examScore && examScore !== "") {
      const con = st.performance?.con || 4;
      const sbaKey = Object.keys(st.sbaScores || {}).find(
        (k) => k.startsWith(subjectCode + "-") && k.includes(String(subjectId)),
      );
      const sbaScore = sbaKey ? st.sbaScores[sbaKey] : 10;
      const total = calculateTotal(sbaScore, con, examScore);
      scores.push(total);
    }
  });

  if (scores.length === 0) return "--";
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
};

// ============================================
// UTILITY: Extract remark text from numbered list
// ============================================
const extractRemarkText = (remark) => {
  if (!remark) return "--";
  // Remove leading number like "(1)" and return the rest
  return remark.replace(/^\(\d+\)\s*/, "") || "--";
};

// ============================================
// MAIN: Generate Dynamic Report Card
// ============================================
async function loadReportCard() {
  const urlParams = new URLSearchParams(window.location.search);
  const classKey = urlParams.get("classKey");
  const studentId = urlParams.get("studentId");

  if (!classKey || !studentId) {
    alert("Missing student data. Please select a student again.");
    return;
  }

  try {
    // Load student data
    const student = await db.master_records.get(studentId);
    if (!student) throw new Error("Student not found");

    // Load all classmates for averages
    const classmates = await db.master_records
      .where("classKey")
      .equals(classKey)
      .toArray();

    // Determine educational level
    const level = getLevelByClassNum(student.info.class);
    const subjects = schoolSubjects[level] || [];

    // ============================================
    // POPULATE FRONT PAGE (Student Info)
    // ============================================
    document.getElementById("childName").textContent = student.info.name;
    document.getElementById("year").textContent = student.info.year;
    document.getElementById("basic").textContent = formatBasicDisplay(
      student.info.class,
    );
    document.getElementById("term").textContent = numberToWords(
      student.info.term,
    );

    // Update level display
    const levelDisplay = document.getElementById("primary-jhs");
    if (levelDisplay) {
      levelDisplay.textContent = level === "KG" ? "Kindergarten" : level;
    }

    // Student Photo
    const studentPhoto = document.getElementById("studentPhoto");
    if (studentPhoto) {
      const photoFolder = getPhotoFolder(student.info.class);
      studentPhoto.src = `../images/studentPhotos/${photoFolder}/${student.id}.png`;
    }

    // ============================================
    // GENERATE DYNAMIC REPORT TABLE
    // ============================================
    const tbody = document.querySelector("table.report tbody");
    if (tbody) tbody.innerHTML = ""; // Clear existing rows

    let totalSBA = 0,
      totalExam = 0,
      totalScore = 0,
      subjectCount = 0;

    // Create a row for each subject in the student's level
    subjects.forEach((subject) => {
      const htmlId =
        subjectCodeToHtmlId[subject.code] || subject.code.toLowerCase();
      const formalName = formalSubjectNames[subject.id] || subject.name;

      // Find exam score for this subject
      const examKey = Object.keys(student.examScores || {}).find(
        (k) =>
          k.startsWith(subject.code + "-") && k.includes(String(subject.id)),
      );
      const examScore = examKey ? student.examScores[examKey] : null;

      // Find SBA score for this subject
      const sbaKey = Object.keys(student.sbaScores || {}).find(
        (k) =>
          k.startsWith(subject.code + "-") && k.includes(String(subject.id)),
      );
      const sbaScore = sbaKey ? student.sbaScores[sbaKey] : null;

      // Calculate scores
      const sbaValue = calculateSBA(sbaScore, student.performance?.con);
      const examValue = calculateExam(examScore);
      const totalValue = sbaValue + examValue;
      const [grade, remarks] = getGradeInfo(totalValue);

      // Calculate class average
      const classAverage = calculateClassAverage(
        classmates,
        subject.code,
        subject.id,
      );

      // Create table row
      const row = document.createElement("tr");
      row.innerHTML = `
        <td class="subject">${formalName}</td>
        <td id="rc-${htmlId}-sba">${sbaValue}</td>
        <td id="rc-${htmlId}-exam">${examValue}</td>
        <td id="rc-${htmlId}-total">${totalValue}</td>
        <td id="rc-${htmlId}-grade">${grade}</td>
        <td id="rc-${htmlId}-average">${classAverage}</td>
        <td id="rc-${htmlId}-remarks">${remarks}</td>
      `;

      tbody.appendChild(row);

      // Accumulate totals
      totalSBA += sbaValue;
      totalExam += examValue;
      totalScore += totalValue;
      subjectCount++;
    });

    // ============================================
    // POPULATE TOTALS ROW
    // ============================================
    // Sum of all individual SBA, Exam, and Total scores (NOT averages)
    const totalSBARounded = Math.round(totalSBA);
    const totalExamRounded = Math.round(totalExam);
    const totalScoreRounded = Math.round(totalScore);

    document.getElementById("rc-total-sba").textContent = totalSBARounded;
    document.getElementById("rc-total-exam").textContent = totalExamRounded;
    document.getElementById("rc-total-score").textContent = totalScoreRounded;
    document.getElementById("rc-total-grade").textContent = ""; // Leave blank for total row

    // Promotion logic
    const promotionClass = document.getElementById("promotion-class");
    if (student.info.term === "3" || student.info.term === 3) {
      // Determine next class
      if (student.info.class === "KG1") {
        promotionClass.textContent = `KG 2`;
      } else if (student.info.class === "KG2") {
        promotionClass.textContent = `BASIC 1`;
      } else {
        const classNum = Number(student.info.class);
        const nextClass = classNum < 6 ? `BASIC ${classNum + 1}` : "";
        promotionClass.textContent = `${nextClass}`;
      }
    } else {
      promotionClass.textContent = "N/A";
    }

    // ============================================
    // POPULATE PERFORMANCE DATA
    // ============================================
    document.getElementById("rc-attendance").textContent =
      student.performance?.attendance || "--";
    document.getElementById("rc-attitude-value").textContent =
      extractRemarkText(student.performance?.attitude);
    document.getElementById("rc-conduct-value").textContent = extractRemarkText(
      student.performance?.character,
    );
    document.getElementById("rc-interest-value").textContent =
      extractRemarkText(student.performance?.interest);
    document.getElementById("rc-remarks-value").textContent = extractRemarkText(
      student.performance?.ctRemarks,
    );
  } catch (error) {
    console.error("Error loading report card:", error);
    alert("Failed to load report card: " + error.message);
  }
}

loadReportCard();

// ============================================
// PRINT FUNCTION
// ============================================
window.printReportCard = function () {
  const frontPage = document.getElementById("report-card-fp").innerHTML;
  const backPage = document.getElementById("report-card-bp").innerHTML;

  const myWindow = window.open("", "", "width=1200,height=800");
  myWindow.document.write(`
    <html>
      <head>
        <title>${student.id}</title>
        <link rel="stylesheet" type="text/css" href="RC-F-B.css">
        <style>
          @page { size: A4 landscape; margin: 0; }
          body { margin: 0; background: white; }
          img { -webkit-print-color-adjust: exact; }
        </style>
      </head>
      <body>
        ${frontPage}
        <div style="page-break-after: always;"></div>
        ${backPage}
      </body>
    </html>
  `);

  myWindow.document.close();
  myWindow.onload = function () {
    myWindow.focus();
    setTimeout(() => {
      myWindow.print();
      myWindow.close();
    }, 500);
  };
};
