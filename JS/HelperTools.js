"use strict";

// NUMBER RANGE VALIDATOR
export const validateNumberRange = (activeInputField, min, max) => {
  const numericValue = parseFloat(activeInputField.value);

  if (
    activeInputField.value !== "" &&
    (isNaN(numericValue) || numericValue < min || numericValue > max)
  ) {
    // 1. Wipe the value
    activeInputField.value = "";
    // 2. Visual "Flash" Feedback
    activeInputField.classList.add("input-error-flash");
    // 3. Remove the flash after 800ms so they can try again
    setTimeout(() => {
      activeInputField.classList.remove("input-error-flash");
    }, 800);

    console.warn(`Input cleared: Value must be between ${min} and ${max}`);
  }
};

export const getLevelByGrade = (gradeValue) => {
  if (gradeValue.includes("KG")) return "KG";
  // This regex handles "Basic 7" or "JHS 1" by extracting the digit
  const num = parseInt(gradeValue.replace(/\D/g, ""));
  if (num >= 7) return "JHS";
  if (num >= 1 && num <= 3) return "Lower Primary";
  if (num >= 4 && num <= 6) return "Upper Primary";
  return null;
};

// Helper for the searchable Class Key (Handles the B vs KG prefix)
export const getClassKey = (cNum, term, year) => {
  const isKG = typeof cNum === "string" && cNum.startsWith("KG");
  return `${isKG ? "" : "B"}${cNum}-T${term}-Y${year}`;
};

/**
 * COMPOUND-SAFE ID GENERATOR
 */
export const generateSmartId = (fullName, cNum, term, year) => {
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
