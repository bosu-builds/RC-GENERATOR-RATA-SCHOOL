"use strict";

// 1. INITIALIZE DATABASE (Aligned with index.js Version 3)
const db = new Dexie("RataSchoolDB");
db.version(3).stores({
  master_records: "id, classKey",
});

// 2. HELPER FUNCTIONS
const examScaled = (rawExam) => Math.round((Number(rawExam) * 70) / 100);

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

// WEIGHTED SBA CALCULATION (Total 30%)
const calculateWeightedSBA = (granularScores, searchKey, globalCon) => {
  let totalWeightedSBA = Number(globalCon || 0);
  if (!granularScores) return Math.round(totalWeightedSBA);

  const actualKey = Object.keys(granularScores).find((k) =>
    k.toLowerCase().includes(searchKey.toLowerCase()),
  );
  if (!actualKey || !granularScores[actualKey])
    return Math.round(totalWeightedSBA);

  const records = granularScores[actualKey];
  const weights = { CT: 7, PW: 6, CE: 5, HWK: 4, GW: 3 };

  Object.keys(weights).forEach((typeId) => {
    const categoryAssignments = records.filter((r) =>
      r.type.startsWith(typeId),
    );
    if (categoryAssignments.length > 0) {
      let catScore = 0,
        catMax = 0;
      categoryAssignments.forEach((r) => {
        catScore += Number(r.score || 0);
        catMax += Number(r.max || 0);
      });
      if (catMax > 0) totalWeightedSBA += (catScore / catMax) * weights[typeId];
    }
  });
  return Math.round(totalWeightedSBA);
};

const numberMap = {
  1: "One",
  2: "Two",
  3: "Three",
  4: "Four",
  5: "Five",
  6: "Six",
};

// 3. MAIN LOAD LOGIC
async function loadReportCard() {
  const urlParams = new URLSearchParams(window.location.search);
  const classKey = urlParams.get("classKey");
  const studentId = urlParams.get("studentId");

  if (!classKey || !studentId) return;

  try {
    const student = await db.master_records.get(studentId);
    if (!student) throw new Error("Student not found");
    const classmates = await db.master_records
      .where("classKey")
      .equals(classKey)
      .toArray();

    const subjectsToFill = [
      { id: "eng", dbId: 201, searchKey: "English" },
      { id: "math", dbId: 202, searchKey: "Math" },
      { id: "sci", dbId: 203, searchKey: "Science" },
      { id: "history", dbId: 204, searchKey: "History" },
      { id: "rme", dbId: 205, searchKey: "Religious" },
      { id: "arts", dbId: 301, searchKey: "Creative Arts" },
      { id: "comp", dbId: 302, searchKey: "Computing" },
    ];

    // B. Basic Info Population
    document.getElementById("childName").textContent = student.info.name;
    document.getElementById("year").textContent = student.info.year;
    const rawClassNum = String(student.info.class).replace(/\D/g, "");
    document.getElementById("basic").textContent =
      numberMap[rawClassNum] || rawClassNum;
    document.getElementById("term").textContent =
      numberMap[student.info.term] || student.info.term;
    const levelDisplay = document.getElementById("primary-jhs");
    if (levelDisplay)
      levelDisplay.textContent =
        Number(rawClassNum) > 3 ? "Upper Primary" : "Lower Primary";

    // C. Photo Logic
    const studentPhoto = document.getElementById("studentPhoto");
    if (studentPhoto)
      studentPhoto.src = `../images/studentPhotos/basic${rawClassNum}/${student.id}.png`;

    // D. Subject Calculations
    let grandTotalSba = 0,
      grandTotalExam = 0,
      grandTotalScore = 0;
    const globalCon = student.performance?.con || 0;

    subjectsToFill.forEach((sub) => {
      if (sub.searchKey === "Computing" && Number(rawClassNum) < 4) {
        document
          .getElementById(`rc-${sub.id}-sba`)
          ?.closest("tr")
          ?.style.setProperty("display", "none");
        return;
      }

      const sbaValue = calculateWeightedSBA(
        student.granularScores,
        sub.searchKey,
        globalCon,
      );
      const examRaw = student.scores[`s_${sub.dbId}_exam`];
      const examScaledVal = examRaw ? examScaled(examRaw) : 0;
      const total = sbaValue + examScaledVal;

      const sbaEl = document.getElementById(`rc-${sub.id}-sba`);
      if (sbaEl) {
        sbaEl.textContent = sbaValue || "-";
        document.getElementById(`rc-${sub.id}-exam`).textContent =
          examScaledVal || "-";
        document.getElementById(`rc-${sub.id}-total`).textContent =
          total || "-";

        let classSubSum = 0,
          classCount = 0;
        classmates.forEach((mate) => {
          const mSba = calculateWeightedSBA(
            mate.granularScores,
            sub.searchKey,
            mate.performance?.con || 0,
          );
          const mEx = mate.scores[`s_${sub.dbId}_exam`]
            ? examScaled(mate.scores[`s_${sub.dbId}_exam`])
            : 0;
          if (mSba + mEx > 0) {
            classSubSum += mSba + mEx;
            classCount++;
          }
        });
        document.getElementById(`rc-${sub.id}-average`).textContent =
          classCount > 0 ? Math.round(classSubSum / classCount) : "-";

        if (total > 0) {
          const [grade, remark] = getGradeInfo(total);
          document.getElementById(`rc-${sub.id}-grade`).textContent = grade;
          document.getElementById(`rc-${sub.id}-remarks`).textContent = remark;
          grandTotalSba += sbaValue;
          grandTotalExam += examScaledVal;
          grandTotalScore += total;
        }
      }
    });

    // E. Totals & Performance
    document.getElementById("rc-total-sba").textContent = grandTotalSba;
    document.getElementById("rc-total-exam").textContent = grandTotalExam;
    document.getElementById("rc-total-score").textContent = grandTotalScore;

    const p = student.performance || {};
    document.getElementById("rc-attendance").textContent = p.attendance || "";
    document.getElementById("rc-attitude-value").textContent = p.attitude || "";
    document.getElementById("rc-conduct-value").textContent = p.character || "";
    document.getElementById("rc-interest-value").textContent = p.interest || "";
    document.getElementById("rc-remarks-value").textContent = p.ctRemarks || "";

    if (Number(student.info.term) === 3) {
      document.getElementById("promotion-class").textContent =
        `BASIC ${Number(rawClassNum) + 1}`;
    }
  } catch (err) {
    console.error(err);
  }
}

loadReportCard();

// 5. PRINT FUNCTION (RESTORED EXACTLY AS YOU WROTE IT)
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
