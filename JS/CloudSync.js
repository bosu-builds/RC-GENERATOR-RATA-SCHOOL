"use strict";

import { db, _supabase } from "./Database.js";

// 1. RENAME & EXPORT: Changed name to syncAllData to match InterfaceManager
export const syncAllData = async (silent = false) => {
  // Note: Ensure supabase client is available
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
    console.error("Sync Error:", err);
    if (!silent) alert("❌ Vault sync failed.");
  }
};

// Keep your auto-sync on load
window.onload = () => syncAllData(true);

// 2. EXPORT: Added export so App.js can use this for saving students
export const saveToCloudDirect = async (studentData, { local = true } = {}) => {
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
        examScores: {
          ...(cloudStudent.examScores || {}),
          ...(studentData.examScores || {}),
        },
        sbaScores: {
          ...(cloudStudent.sbaScores || {}),
          ...(studentData.sbaScores || {}),
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
    if (local) await db.master_records.put(finalData);
    return true;
  } catch (err) {
    console.error("Save Error:", err);
    alert("❌ Save failed.");
    return false;
  }
};

// This one was already exported correctly!
export const getGroupedDirectory = async () => {
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
