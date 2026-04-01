"use strict";

// DATA STRUCTURES
// i will have all the info about the subject in one place, but am tired now,

export const schoolSubjects = {
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

// Map Class To Number

export const mapClassToNumber = {
  "KG 1": "KG1",
  "KG 2": "KG2",
  "Basic 1": 1,
  "Basic 2": 2,
  "Basic 3": 3,
  "Basic 4": 4,
  "Basic 5": 5,
  "Basic 6": 6,
  "Basic 7": 7,
  "Basic 8": 8,
  "Basic 9": 9,
};

export const pickerData = {
  // Dynamically grab keys from your map
  classes: Object.keys(mapClassToNumber),

  terms: ["1", "2", "3"],
  years: ["2026", "2027", "2028"],
  assignmentTypes: [
    "Class Exercise (CE)",
    "Home-Work (HWK)",
    "Class Test (CT)",
    "Project Work (PW)",
  ],
  attitudes: [
    "(1) Demonstrates a positive attitude towards learning.",
    "(2) Approaches tasks with confidence and determination.",
    "(3) Maintains a respectful and cooperative attitude in class.",
    "(4) Shows enthusiasm but needs to sustain focus consistently.",
    "(5) Is generally attentive and eager to participate.",
  ],
  characters: [
    "(1) Displays honesty and integrity in all activities.",
    "(2) Respects authority and the rights of others.",
    "(3) Polite and well-behaved both inside and outside the classroom.",
    "(4) Needs occasional reminders to follow classroom rules.",
    "(5) Consistently demonstrates self-discipline and maturity.",
  ],
  interests: [
    "(1) Shows keen interest in academic work and extracurricular activities.",
    "(2) Is curious and asks thoughtful questions.",
    "(3) Maintains steady interest but requires encouragement in some subjects.",
    "(4) Demonstrates a strong desire to explore new ideas.",
    "(5) Needs to develop greater interest in independent reading and research.",
  ],
  remarks: [
    "(1) A hardworking and responsible student; keep up the good effort.",
    "(2) Shows steady progress; should continue to build confidence.",
    "(3) Has potential to excel further with greater concentration.",
    "(4) A pleasant student to teach; should aim for consistency.",
    "(5) Needs to be more attentive in class to maximize full potential.",
  ],
};
