"use strict";

// SUPABASE CONNECTION & CREDENTIALS
const supabaseUrl = "https://dlcraalewausdcatouqp.supabase.co";
const supabaseKey = "sb_publishable_LBkGLuDop84iUCB6Yxd_Dg_LpaC-kyG";

// Add "export" here so CloudSync.js can use Supabase
export const _supabase = window.supabase
  ? window.supabase.createClient(supabaseUrl, supabaseKey)
  : null;

// ensure the database module also exposes global var for other legacy uses
if (typeof window !== "undefined") {
  window._supabase = _supabase;
}

// DATABASE SETUP
// Add "export" here so CloudSync.js and App.js can talk to Dexie
export const db = new Dexie("RataSchoolDB");
db.version(3).stores({
  master_records: "id, classKey",
});
