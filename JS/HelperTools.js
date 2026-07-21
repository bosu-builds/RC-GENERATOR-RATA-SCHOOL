"use strict";

// NUMBER RANGE VALIDATOR
export const validateNumberRange = (
  activeInputField,
  min,
  max,
  isBlur = false,
) => {
  if (!activeInputField) return;

  const rawValue = activeInputField.value.trim();
  if (rawValue === "") return;

  const numericValue = parseFloat(rawValue);
  const numMin = Number(min);
  const numMax = Number(max);
  const maxDigits = String(numMax).length;

  const isNaNValue = isNaN(numericValue);

  // 1. Immediately reject numbers exceeding max (e.g., typing 35 when max is 30)
  const isTooHigh = !isNaNValue && numericValue > numMax;

  // 2. Reject numbers below min:
  //    - On focusout/blur (isBlur = true): strict check (wipes any value < min)
  //    - While typing (isBlur = false): wipes only when typed length reaches maxDigits (e.g. typing "15" for range 20-30)
  const isTooLow =
    !isNaNValue &&
    numericValue < numMin &&
    (isBlur || rawValue.length >= maxDigits);

  if (isNaNValue || isTooHigh || isTooLow) {
    // 1. Wipe invalid value
    activeInputField.value = "";

    // 2. Visual "Flash" Feedback
    activeInputField.classList.add("input-error-flash");

    // 3. Remove flash after 800ms
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
