"use strict";

// 1. INITIALIZE DATABASE, I will do this tonight (midnight)
const db = new Dexie("RataSchoolDB");
db.version(1).stores({
  students: "id, classKey",
});

// 2. HELPER FUNCTIONS
const examScaled = (rawExam) => Math.round((Number(rawExam) * 70) / 100);

// NEW: Dynamically calculate SBA from granular scores (Scaled to 30%)
const calculateSBA = (granularScores, searchKey) => {
  if (!granularScores) return 0;

  // Find the exact subject key in the database (e.g., "Mathematics" matches "Math")
  const actualKey = Object.keys(granularScores).find((k) =>
    k.toLowerCase().includes(searchKey.toLowerCase()),
  );

  if (
    !actualKey ||
    !granularScores[actualKey] ||
    granularScores[actualKey].length === 0
  )
    return 0;

  const records = granularScores[actualKey];
  let totalScore = 0;
  let totalMax = 0;

  records.forEach((r) => {
    totalScore += Number(r.score || 0);
    totalMax += Number(r.max || 0);
  });

  if (totalMax === 0) return 0;
  return Math.round((totalScore / totalMax) * 30); // Scale to 30%
};

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

const toTitleCase = (str) => {
  if (!str) return "";
  return str.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
};

const numberMap = {
  1: "One",
  2: "Two",
  3: "Three",
  4: "Four",
  5: "Five",
  6: "Six",
};

// 3. MAIN LOGIC (Wrapped in Async function)
async function loadReportCard() {
  const urlParams = new URLSearchParams(window.location.search);
  const classKey = urlParams.get("classKey");
  const studentId = urlParams.get("studentId");

  if (!classKey || !studentId) {
    alert("⚠️ Error: Missing Class Key or Student ID in URL.");
    return;
  }

  try {
    // A. Fetch the specific student
    const student = await db.students.get(studentId);
    if (!student) throw new Error("Student not found in Database");

    // B. Fetch ALL students in this class to calculate Averages
    const classmates = await db.students
      .where("classKey")
      .equals(classKey)
      .toArray();

    // C. Configuration for mapping IDs to names and database keys
    const subjectsToFill = [
      { id: "eng", dbId: 201, searchKey: "English" },
      { id: "math", dbId: 202, searchKey: "Math" },
      { id: "sci", dbId: 203, searchKey: "Science" },
      { id: "history", dbId: 204, searchKey: "History" },
      { id: "rme", dbId: 205, searchKey: "Religious" }, // Matches "Religious & Moral Education"
      { id: "arts", dbId: 301, searchKey: "Creative Arts" },
      { id: "comp", dbId: 302, searchKey: "Computing" },
    ];

    // D. Calculate Averages dynamically for the class
    const averages = {};

    subjectsToFill.forEach((sub) => {
      let totalScoreSum = 0;
      let count = 0;

      classmates.forEach((mate) => {
        const sba = calculateSBA(mate.granularScores, sub.searchKey);
        const examRaw = mate.scores[`s_${sub.dbId}_exam`];
        const exam = examRaw ? examScaled(examRaw) : 0;
        const total = sba + exam;

        // Only count classmates who actually have some data for this subject
        if (total > 0) {
          totalScoreSum += total;
          count++;
        }
      });

      averages[sub.id] = count > 0 ? Math.round(totalScoreSum / count) : "-";
    });

    // --- POPULATE THE DOM ---

    // 1. Basic Info
    document.getElementById("childName").textContent = student.info.name;
    document.getElementById("year").textContent = student.info.year;

    // Convert string "Basic 4" to just "4", then map to "Four"
    const rawClass = String(student.info.class).replace(/\D/g, "");
    const basicText = numberMap[rawClass] || rawClass;
    document.getElementById("basic").textContent = basicText;

    const termText = numberMap[student.info.term] || student.info.term;
    document.getElementById("term").textContent = termText;

    // 2. School Level (Primary/Upper)
    const lowerOrUpper = document.getElementById("primary-jhs");
    lowerOrUpper.textContent =
      Number(rawClass) > 3 ? "Upper Primary" : "Lower Primary";

    // 3. Photo Logic (FIXED FOR 404 ERROR)
    const studentPhoto = document.getElementById("studentPhoto");
    const folderName = `basic${rawClass}`; // Guaranteed to be "basic4", not "basicBasic 4"
    studentPhoto.src = `../images/studentPhotos/${folderName}/${student.id}.png`;

    // Handle Image Error (Fallback)
    studentPhoto.onerror = () => {
      console.log("Image not found, using placeholder if needed");
    };

    // 4. Populate Subjects
    const s = student.scores || {};

    const calculateSubTotal = (sba, exam) => {
      if (!sba && !exam) return null;
      return Number(sba || 0) + examScaled(exam || 0);
    };

    let grandTotalSba = 0;
    let grandTotalExam = 0;
    let grandTotalScore = 0;

    subjectsToFill.forEach((sub) => {
      // Get the dynamically calculated SBA from granular scores
      const sbaValue = calculateSBA(student.granularScores, sub.searchKey);

      // Get the exam score using the new database key format
      const examValue = s[`s_${sub.dbId}_exam`];

      const total = calculateSubTotal(sbaValue, examValue);

      // Skip computing if basic < 4
      if (sub.searchKey === "Computing" && Number(rawClass) < 4) {
        const row = document.getElementById(`rc-${sub.id}-sba`)?.closest("tr");
        if (row) row.style.display = "none";
        return;
      }

      // Fill the Row
      const sbaEl = document.getElementById(`rc-${sub.id}-sba`);
      if (sbaEl) {
        sbaEl.textContent = sbaValue > 0 ? sbaValue : "-";
        document.getElementById(`rc-${sub.id}-exam`).textContent = examValue
          ? examScaled(examValue)
          : "-";
        document.getElementById(`rc-${sub.id}-total`).textContent =
          total !== null ? total : "-";
        document.getElementById(`rc-${sub.id}-average`).textContent =
          averages[sub.id] || "-";

        if (total !== null) {
          const [grade, remark] = getGradeInfo(total);
          document.getElementById(`rc-${sub.id}-grade`).textContent = grade;
          document.getElementById(`rc-${sub.id}-remarks`).textContent = remark;

          // Add to Grand Totals
          grandTotalSba += Number(sbaValue || 0);
          grandTotalExam += examScaled(examValue || 0);
          grandTotalScore += total;
        }
      }
    });

    // 5. Grand Totals
    document.getElementById("rc-total-sba").textContent = grandTotalSba;
    document.getElementById("rc-total-exam").textContent = grandTotalExam;
    document.getElementById("rc-total-score").textContent = grandTotalScore;

    // For the Aggregate, we'll use a simple placeholder or calculate based on your rules
    document.getElementById("rc-total-grade").textContent = `AGG: --`;

    // 6. Overall Performance
    const p = student.performance || {};
    document.getElementById("rc-attendance").textContent = p.attendance || "";
    document.getElementById("rc-attitude-value").textContent = p.attitude || "";
    document.getElementById("rc-conduct-value").textContent = p.character || "";
    document.getElementById("rc-interest-value").textContent = p.interest || "";
    document.getElementById("rc-remarks-value").textContent = p.ctRemarks || "";

    // 7. Promotion Logic
    const promClass = document.getElementById("promotion-class");
    if (Number(student.info.term) === 3) {
      promClass.textContent = `BASIC ${Number(rawClass) + 1}`;
    } else {
      promClass.textContent = "N/A";
    }
  } catch (err) {
    console.error(err);
    alert("Error loading student data. See console.");
  }
}

// 4. TRIGGER LOAD
loadReportCard();

// 5. PRINT FUNCTION (Global scope so HTML button can see it)
window.printReportCard = function () {
  const frontPage = document.getElementById("report-card-fp").innerHTML;
  const backPage = document.getElementById("report-card-bp").innerHTML;

  const myWindow = window.open("", "", "width=1200,height=800");
  myWindow.document.write(`
    <html>
      <head>
        <title>Report Card - ${document.getElementById("childName").textContent}</title>
        <link rel="stylesheet" type="text/css" href="RC-F-B.css">
        <style>
          @page { size: A4 landscape; margin: 0; }
          body { margin: 0; background: white; }
          /* Ensure images print */
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
  // Wait for images to load inside the new window before printing
  myWindow.onload = function () {
    myWindow.focus();
    setTimeout(() => {
      myWindow.print();
      myWindow.close();
    }, 500);
  };
};
