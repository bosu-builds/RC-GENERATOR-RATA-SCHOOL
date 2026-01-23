"use strict";

// ✅ Try to read from URL first
const urlParams = new URLSearchParams(window.location.search);
let classKey = urlParams.get("classKey");
let studentId = urlParams.get("studentId");

console.log(studentId);

// ✅ If nothing passed in URL, fall back to lastStudent
if (!classKey || !studentId) {
  const lastStudent = JSON.parse(localStorage.getItem("lastStudent"));
  if (lastStudent) {
    classKey = lastStudent.classKey;
    studentId = lastStudent.studentId;
  } else {
    alert("⚠️ No student data found. Please go back and save a student first.");
  }
}

// ✅ Get all class data from localStorage
const classDataSets = JSON.parse(localStorage.getItem("classDatasets")) || {};

// ✅ Pick this student’s record
const studentRecord = classDataSets[classKey]?.[studentId];

if (!studentRecord) {
  alert("⚠️ Student record not found for this class.");
}

// ✅ Break into pieces for convenience
const studentInfo = studentRecord.info;
const subjectScores = studentRecord.scores; // raw SBA + Exam
const subjectTotals = studentRecord.totals; // computed totals
const ovrPerformanceDetails = studentRecord.performance;
const averages = classDataSets[classKey]._averages;

// ========== DOM ELEMENTS ==========
// Promotion Class
const promClass = document.getElementById("promotion-class");

// ========= DETERMINE SCHOOL LEVEL ======
const lowerOrUpper = document.getElementById("primary-jhs");

lowerOrUpper.textContent =
  studentInfo.class > 3 ? "Upper Primary" : "Lower Primary";

// This is the Dom element for the student's photo
const studentPhoto = document.getElementById("studentPhoto");

const genFolderName = function () {
  const folders = {
    1: "basic1",
    2: "basic2",
    3: "basic3",
    4: "basic4",
    5: "basic5",
    6: "basic6",
  };

  // This is the folder name that will be returned example:
  //  it can return smt like "basic1" or "kg1" based on the class the student is in
  return folders[studentInfo.class];
};

const addStudentPhoto = function (studentId) {
  const folderName = genFolderName();
  return `../images/studentPhotos/${folderName}/${studentId}.png`;
};

// assuming studentinfo.class stores the class name
studentPhoto.src = addStudentPhoto(studentId);

console.log(classKey, "This is the cohort for this student");
console.log(
  addStudentPhoto(studentId),
  "This is the image path for the student"
);

// English
const rcEngSba = document.getElementById("rc-eng-sba");
const rcEngExam = document.getElementById("rc-eng-exam");
const rcEngTotal = document.getElementById("rc-eng-total");
const rcEngGrade = document.getElementById("rc-eng-grade");
const rcEngAverage = document.getElementById("rc-eng-average");
const rcEngRemarks = document.getElementById("rc-eng-remarks");

// Mathematics
const rcMathSba = document.getElementById("rc-math-sba");
const rcMathExam = document.getElementById("rc-math-exam");
const rcMathTotal = document.getElementById("rc-math-total");
const rcMathGrade = document.getElementById("rc-math-grade");
const rcMathAverage = document.getElementById("rc-math-average");
const rcMathRemarks = document.getElementById("rc-math-remarks");

// Science
const rcSciSba = document.getElementById("rc-sci-sba");
const rcSciExam = document.getElementById("rc-sci-exam");
const rcSciTotal = document.getElementById("rc-sci-total");
const rcSciGrade = document.getElementById("rc-sci-grade");
const rcSciAverage = document.getElementById("rc-sci-average");
const rcSciRemarks = document.getElementById("rc-sci-remarks");

// History
const rcHistorySba = document.getElementById("rc-history-sba");
const rcHistoryExam = document.getElementById("rc-history-exam");
const rcHistoryTotal = document.getElementById("rc-history-total");
const rcHistoryGrade = document.getElementById("rc-history-grade");
const rcHistoryAverage = document.getElementById("rc-history-average");
const rcHistoryRemarks = document.getElementById("rc-history-remarks");

// RME
const rcRmeSba = document.getElementById("rc-rme-sba");
const rcRmeExam = document.getElementById("rc-rme-exam");
const rcRmeTotal = document.getElementById("rc-rme-total");
const rcRmeGrade = document.getElementById("rc-rme-grade");
const rcRmeAverage = document.getElementById("rc-rme-average");
const rcRmeRemarks = document.getElementById("rc-rme-remarks");

// Computing
const rcCompSba = document.getElementById("rc-comp-sba");
const rcCompExam = document.getElementById("rc-comp-exam");
const rcCompTotal = document.getElementById("rc-comp-total");
const rcCompGrade = document.getElementById("rc-comp-grade");
const rcCompAverage = document.getElementById("rc-comp-average");
const rcCompRemarks = document.getElementById("rc-comp-remarks");

// Creative Arts
const rcArtsSba = document.getElementById("rc-arts-sba");
const rcArtsExam = document.getElementById("rc-arts-exam");
const rcArtsTotal = document.getElementById("rc-arts-total");
const rcArtsGrade = document.getElementById("rc-arts-grade");
const rcArtsAverage = document.getElementById("rc-arts-average");
const rcArtsRemarks = document.getElementById("rc-arts-remarks");

// === TOTALS ===
const rcTotalSba = document.getElementById("rc-total-sba");
const rcTotalExam = document.getElementById("rc-total-exam");
const rcTotalScore = document.getElementById("rc-total-score");
const rcAggregate = document.getElementById("rc-total-grade");

// === OVERALL PERFORMANCE ===
const rcAttendance = document.getElementById("rc-attendance");
const rcAttitude = document.getElementById("rc-attitude-value");
const rcConduct = document.getElementById("rc-conduct-value");
const rcInterest = document.getElementById("rc-interest-value");
const rcRemarks = document.getElementById("rc-remarks-value");

// Helper function: scale exam to 70%
const examScaled = function (rawExam) {
  return Math.round((Number(rawExam) * 70) / 100);
};

// == GRADE FUNCTION ==
// This function calculates the grade the student had for each subject
const grade = function (total) {
  if (total >= 80) return ["A1", "Excellent"];
  else if (total >= 70) return ["B2", "Very Good"];
  else if (total >= 65) return ["B3", "Good"];
  else if (total >= 60) return ["C4", "Credit"];
  else if (total >= 55) return ["C5", "Credit"];
  else if (total >= 50) return ["C6", "Credit"];
  else if (total >= 45) return ["D7", "Pass"];
  else if (total >= 35) return ["E8", "Pass"];
  else return ["F9", "Fail"];
};

// ================= ASSIGN SUBJECT VALUES =================

// English
rcEngSba.textContent = subjectScores.englishSba;
rcEngExam.textContent = examScaled(subjectScores.englishExam);
rcEngTotal.textContent =
  Number(subjectScores.englishSba) + examScaled(subjectScores.englishExam);
rcEngGrade.textContent = grade(rcEngTotal.textContent)[0];
rcEngRemarks.textContent = grade(rcEngTotal.textContent)[1];
rcEngAverage.textContent = averages.english;

// Mathematics
rcMathSba.textContent = subjectScores.mathematicsSba;
rcMathExam.textContent = examScaled(subjectScores.mathematicsExam);
rcMathTotal.textContent =
  Number(subjectScores.mathematicsSba) +
  examScaled(subjectScores.mathematicsExam);
rcMathGrade.textContent = grade(rcMathTotal.textContent)[0];
rcMathRemarks.textContent = grade(rcMathTotal.textContent)[1];
rcMathAverage.textContent = averages.mathematics;

// Science
rcSciSba.textContent = subjectScores.scienceSba;
rcSciExam.textContent = examScaled(subjectScores.scienceExam);
rcSciTotal.textContent =
  Number(subjectScores.scienceSba) + examScaled(subjectScores.scienceExam);
rcSciGrade.textContent = grade(rcSciTotal.textContent)[0];
rcSciRemarks.textContent = grade(rcSciTotal.textContent)[1];
rcSciAverage.textContent = averages.science;

// History
rcHistorySba.textContent = subjectScores.historySba;
rcHistoryExam.textContent = examScaled(subjectScores.historyExam);
rcHistoryTotal.textContent =
  Number(subjectScores.historySba) + examScaled(subjectScores.historyExam);
rcHistoryGrade.textContent = grade(rcHistoryTotal.textContent)[0];
rcHistoryRemarks.textContent = grade(rcHistoryTotal.textContent)[1];
rcHistoryAverage.textContent = averages.history;

// RME
rcRmeSba.textContent = subjectScores.rmeSba;
rcRmeExam.textContent = examScaled(subjectScores.rmeExam);
rcRmeTotal.textContent =
  Number(subjectScores.rmeSba) + examScaled(subjectScores.rmeExam);
rcRmeGrade.textContent = grade(rcRmeTotal.textContent)[0];
rcRmeRemarks.textContent = grade(rcRmeTotal.textContent)[1];
rcRmeAverage.textContent = averages.rme;

// Creative Arts
rcArtsSba.textContent = subjectScores.creativeArtsSba;
rcArtsExam.textContent = examScaled(subjectScores.creativeArtsExam);
rcArtsTotal.textContent =
  Number(subjectScores.creativeArtsSba) +
  examScaled(subjectScores.creativeArtsExam);
rcArtsGrade.textContent = grade(rcArtsTotal.textContent)[0];
rcArtsRemarks.textContent = grade(rcArtsTotal.textContent)[1];
rcArtsAverage.textContent = averages.creativeArts;

// Select the Computing row
const computingRow = document.querySelector("td#rc-comp-sba").closest("tr");

// Only show for class 4 and above
if (studentInfo.class >= 4) {
  rcCompSba.textContent = subjectScores.computingSba;
  rcCompExam.textContent = examScaled(subjectScores.computingExam);
  rcCompTotal.textContent =
    Number(subjectScores.computingSba) +
    examScaled(subjectScores.computingExam);
  rcCompGrade.textContent = grade(rcCompTotal.textContent)[0];
  rcCompRemarks.textContent = grade(rcCompTotal.textContent)[1];
  rcCompAverage.textContent = averages.computing;
} else {
  // Hide the row completely
  computingRow.style.display = "none";
}

// // ================= CALCULATE TOTALS =================
// let totalSba = 0;
// let totalExam = 0;
// let totalScore = 0;

// // loop through totals object
// const totalKeys = Object.keys(subjectTotals);
// for (let i = 0; i < totalKeys.length; i++) {
//   const sub = totalKeys[i];
//   totalSba += Number(subjectScores[sub + "Sba"] || 0);
//   totalExam += examScaled(subjectScores[sub + "Exam"] || 0);
//   totalScore += Number(subjectTotals[sub] || 0);
// }

// rcTotalSba.textContent = totalSba;
// rcTotalExam.textContent = totalExam;
// rcTotalScore.textContent = totalScore;

// ================= CALCULATE TOTALS =================
let totalSba = 0;
let totalExam = 0;
let totalScore = 0;

// loop through totals object
const totalKeys = Object.keys(subjectTotals);
for (let i = 0; i < totalKeys.length; i++) {
  const sub = totalKeys[i];
  // Skip computing if student is below class 4
  if (sub === "computing" && studentInfo.class < 4) continue;

  totalSba += Number(subjectScores[sub + "Sba"] || 0);
  totalExam += examScaled(subjectScores[sub + "Exam"] || 0);
  totalScore += Number(subjectTotals[sub] || 0);
}

rcTotalSba.textContent = totalSba;
rcTotalExam.textContent = totalExam;
rcTotalScore.textContent = totalScore;

// This is a function to generate the class the student is been promoted to
const genPromClass = function () {
  return `BASIC ${studentInfo.class + 1}`;
};

// ================= OVERALL PERFORMANCE =================
promClass.textContent = studentInfo.term === 3 ? genPromClass() : `N/A`;
rcAttendance.textContent = ovrPerformanceDetails.attendance;
rcAttitude.textContent = ovrPerformanceDetails.attitude;
rcConduct.textContent = ovrPerformanceDetails.character;
rcInterest.textContent = ovrPerformanceDetails.interest;
rcRemarks.textContent = ovrPerformanceDetails.ctRemarks;

console.log(studentInfo.class);

// rcAggregate.textContent = `AGG: ${studentRecord.aggregate}`;

const printReportCard = function () {
  const frontPage = document.getElementById("report-card-fp").innerHTML;
  const backPage = document.getElementById("report-card-bp").innerHTML;

  const myWindow = window.open("", "", "width=1200,height=800");
  myWindow.document.write(`
    <html>
      <head>
        <title>Report Card</title>
        <link rel="stylesheet" type="text/css" href="RC-F-B.css">
        <style>
          @page { size: A4 landscape; margin: 0; }
          body { margin: 0; }
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
    myWindow.print();
    myWindow.close();
  };
};

// Javascript for Front Page
// DOM ELEMENTS

const childName = document.getElementById("childName");
const basic = document.getElementById("basic");
const term = document.getElementById("term");
const year = document.getElementById("year");

childName.textContent = studentInfo.name;

year.textContent = studentInfo.year;

const numberMap = [
  [1, "One"],
  [2, "Two"],
  [3, "Three"],
  [4, "Four"],
  [5, "Five"],
  [6, "Six"],
  [7, "Seven"],
];

for (let i = 0; i < numberMap.length; i++) {
  if (numberMap[i][0] === studentInfo.class) {
    basic.textContent = numberMap[i][1];
  }

  if (numberMap[i][0] === studentInfo.term) {
    term.textContent = numberMap[i][1];
  }
}

const toTitleCase = function (str) {
  return str.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
};

// Example usage
document.querySelectorAll(".basic-details").forEach((el) => {
  el.textContent = toTitleCase(el.textContent);
});
