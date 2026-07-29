import ExcelJS from "exceljs";

type AuthFetch = (path: string, init?: RequestInit) => Promise<Response>;

// Document/image fields on Teacher -- deliberately excluded from the
// export per the client's "all data excluding images" requirement.
// School has no file fields, so nothing to exclude there.
const TEACHER_FILE_FIELDS = ["citizenship", "degree", "photo", "teachingLicense", "appointmentLetter"];

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ── Teacher Summary sheet pivot helpers ─────────────────────────────
// Mirrors school_bibarA_Kaski_2083.xlsx's layout (one row per school,
// two-tier merged header: a group column spanning several sub-columns,
// with a Total per group) but pivots on teacher Type x Level instead of
// the government file's Class x Gender headcounts -- this system
// doesn't track enrolled students, so that half is intentionally not
// replicated.
const SUMMARY_LEVELS: { key: string; label: string }[] = [
  { key: "primary", label: "Primary (1-5)" },
  { key: "lower_secondary", label: "Lower Sec (6-8)" },
  { key: "secondary", label: "Secondary (9-10)" },
  { key: "higher_secondary", label: "Higher Sec (11-12)" },
  { key: "unspecified", label: "Level Not Specified" },
];
const SUMMARY_TYPES: { key: string; label: string }[] = [
  { key: "permanent", label: "Permanent" },
  { key: "temporary", label: "Temporary" },
  { key: "grant", label: "Grant" },
  { key: "shi_anudan", label: "Shi Anudan" },
  { key: "relief", label: "Relief" },
  { key: "private", label: "Private" },
  { key: "unspecified", label: "Type Not Specified" },
];

function bumpPivot(bucket: Map<string, Map<string, number>>, level: string, type: string) {
  if (!bucket.has(level)) bucket.set(level, new Map());
  const byType = bucket.get(level)!;
  byType.set(type, (byType.get(type) || 0) + 1);
}

async function buildFullExportWorkbook(teachers: any[], schools: any[]): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "EDCU Kaski Teacher Portal";
  workbook.created = new Date();

  // ── Teachers sheet ──────────────────────────────────────────
  const teacherSheet = workbook.addWorksheet("Teachers");
  teacherSheet.columns = [
    { header: "ID", key: "id", width: 8 },
    { header: "Name", key: "name", width: 22 },
    { header: "Name (English)", key: "nameEnglish", width: 22 },
    { header: "Father's Name", key: "fatherName", width: 22 },
    { header: "Gender", key: "gender", width: 10 },
    { header: "Permanent Address", key: "permanentAddress", width: 28 },
    { header: "Ward No (Permanent)", key: "permanentWardNo", width: 14 },
    { header: "Date of Birth", key: "dob", width: 14 },
    { header: "Phone", key: "phone", width: 14 },
    { header: "Email", key: "email", width: 26 },
    { header: "District", key: "district", width: 16 },
    { header: "Municipality", key: "municipality", width: 18 },
    { header: "Ward No (School)", key: "wardNo", width: 14 },
    { header: "School Name", key: "schoolName", width: 26 },
    { header: "School EMIS Code", key: "schoolEmisCode", width: 16 },
    { header: "Linked School ID", key: "school", width: 14 },
    { header: "Code / Token No.", key: "tokenNo", width: 16 },
    { header: "Subject", key: "subject", width: 16 },
    { header: "Level", key: "level", width: 16 },
    { header: "Grade", key: "grade", width: 12 },
    { header: "Type", key: "teacherType", width: 14 },
    { header: "Appointment Date", key: "appointmentDate", width: 16 },
    { header: "Promotion Date", key: "promotionDate", width: 16 },
    { header: "Min. Qualification", key: "minQualification", width: 16 },
    { header: "Highest Qualification", key: "highestQualification", width: 18 },
    { header: "Extraordinary Leave Taken", key: "extraordinaryLeave", width: 18 },
    { header: "Extraordinary Leave Remaining", key: "extraordinaryLeaveRemaining", width: 20 },
    { header: "Age 60 Year (BS)", key: "ageSixtyYear", width: 16 },
    { header: "Remarks", key: "remarks", width: 28 },
    { header: "Status", key: "status", width: 12 },
    { header: "Created At", key: "created_at", width: 20 },
    { header: "Reviewed By (User ID)", key: "reviewed_by", width: 16 },
  ];
  teacherSheet.getRow(1).font = { bold: true };
  for (const t of teachers) {
    const row: Record<string, any> = {};
    for (const col of teacherSheet.columns) {
      const key = col.key as string;
      if (TEACHER_FILE_FIELDS.includes(key)) continue;
      row[key] = t[key];
    }
    teacherSheet.addRow(row);
  }

  // ── Schools sheet ────────────────────────────────────────────
  const schoolSheet = workbook.addWorksheet("Schools");
  schoolSheet.columns = [
    { header: "ID", key: "id", width: 8 },
    { header: "School Name", key: "school_name", width: 26 },
    { header: "EMIS Code", key: "emis_code", width: 16 },
    { header: "Address", key: "address", width: 26 },
    { header: "District", key: "district", width: 14 },
    { header: "Municipality", key: "municipality", width: 26 },
    { header: "Ward No.", key: "ward_no", width: 10 },
    { header: "Contact", key: "contact", width: 16 },
    { header: "Email", key: "email", width: 24 },
    { header: "Established (BS)", key: "established_bs", width: 16 },
    { header: "Permission Date (BS)", key: "permission_date_bs", width: 18 },
    { header: "Bal Kaksha Year", key: "bal_kaksha", width: 14 },
    { header: "Primary (1-5) Year", key: "primary_1_5", width: 16 },
    { header: "Lower Sec (6-8) Year", key: "lower_secondary_6_8", width: 18 },
    { header: "Secondary (9-10) Year", key: "secondary_9_10", width: 18 },
    { header: "Secondary (11-12) Year", key: "secondary_11_12", width: 18 },
    { header: "Computer Lab", key: "computer_lab", width: 12 },
    { header: "Science Lab", key: "science_lab", width: 12 },
    { header: "Library", key: "library", width: 10 },
    { header: "Book Corner", key: "book_corner", width: 12 },
    { header: "Playground", key: "playground", width: 12 },
    { header: "Land Unit System", key: "land_unit_system", width: 16 },
    { header: "Land (Sq. Meter)", key: "land_sqm", width: 14 },
    { header: "Land (Ropani)", key: "land_ropani", width: 12 },
    { header: "Land (Aana)", key: "land_aana", width: 12 },
    { header: "Land (Paisa)", key: "land_paisa", width: 12 },
    { header: "Land (Daan)", key: "land_daan", width: 12 },
    { header: "Land (Bigha)", key: "land_bigha", width: 12 },
    { header: "Land (Kattha)", key: "land_kattha", width: 12 },
    { header: "Land (Dhur)", key: "land_dhur", width: 12 },
    { header: "Building Count", key: "building_count", width: 14 },
    { header: "Classroom Count", key: "classroom_count", width: 14 },
    { header: "Female Toilets", key: "female_toilets", width: 14 },
    { header: "Male Toilets", key: "male_toilets", width: 14 },
    { header: "Principal", key: "principalName", width: 20 },
    { header: "Status", key: "status", width: 12 },
    { header: "Remarks", key: "remarks", width: 26 },
    { header: "Reviewed By", key: "reviewedByName", width: 18 },
    { header: "Reviewed At", key: "reviewed_at", width: 20 },
    { header: "Created At", key: "created_at", width: 20 },
  ];
  schoolSheet.getRow(1).font = { bold: true };
  for (const s of schools) {
    schoolSheet.addRow(s);
  }

  // ── Teacher Summary sheet ───────────────────────────────────
  // Counts only status === "approved" teachers -- this sheet is a
  // staffing headcount, not an application list (the Teachers sheet
  // above already has every application regardless of status,
  // including pending/rejected, which shouldn't inflate a school's
  // "how many teachers does it have" figure).
  //
  // A teacher whose `school` FK never resolved (EMIS typo, school not
  // yet registered, etc.) can't be attributed to any row here; those
  // are rolled into a trailing "Unlinked" row instead of silently
  // dropped, so the grand total still reconciles against the full
  // approved-teacher count.
  const approvedTeachers = teachers.filter((t: any) => t.status === "approved");
  const pivotBySchool = new Map<number, Map<string, Map<string, number>>>();
  const unlinkedPivot = new Map<string, Map<string, number>>();
  let unlinkedCount = 0;

  for (const t of approvedTeachers) {
    const level = SUMMARY_LEVELS.some((l) => l.key === t.level) ? t.level : "unspecified";
    const type = SUMMARY_TYPES.some((ty) => ty.key === t.teacherType) ? t.teacherType : "unspecified";
    if (t.school) {
      if (!pivotBySchool.has(t.school)) pivotBySchool.set(t.school, new Map());
      bumpPivot(pivotBySchool.get(t.school)!, level, type);
    } else {
      unlinkedCount++;
      bumpPivot(unlinkedPivot, level, type);
    }
  }

  const teacherSummarySheet = workbook.addWorksheet("Teacher Summary");

  const identityCols = [
    { header: "S.N", width: 6 },
    { header: "School Name", width: 26 },
    { header: "EMIS Code", width: 16 },
    { header: "District", width: 14 },
    { header: "Municipality", width: 24 },
    { header: "Ward No.", width: 10 },
  ];

  const summaryHeaderRow1 = teacherSummarySheet.getRow(1);
  const summaryHeaderRow2 = teacherSummarySheet.getRow(2);

  identityCols.forEach((c, i) => {
    const col = i + 1;
    teacherSummarySheet.getColumn(col).width = c.width;
    teacherSummarySheet.mergeCells(1, col, 2, col);
    summaryHeaderRow1.getCell(col).value = c.header;
  });

  let colPtr = identityCols.length + 1;
  const levelColRanges: { level: string; start: number; end: number }[] = [];
  for (const lvl of SUMMARY_LEVELS) {
    const start = colPtr;
    for (const ty of SUMMARY_TYPES) {
      teacherSummarySheet.getColumn(colPtr).width = 12;
      summaryHeaderRow2.getCell(colPtr).value = ty.label;
      colPtr++;
    }
    teacherSummarySheet.getColumn(colPtr).width = 12;
    summaryHeaderRow2.getCell(colPtr).value = "Total";
    const end = colPtr;
    teacherSummarySheet.mergeCells(1, start, 1, end);
    summaryHeaderRow1.getCell(start).value = lvl.label;
    levelColRanges.push({ level: lvl.key, start, end });
    colPtr = end + 1;
  }
  teacherSummarySheet.getColumn(colPtr).width = 14;
  teacherSummarySheet.mergeCells(1, colPtr, 2, colPtr);
  summaryHeaderRow1.getCell(colPtr).value = "Grand Total";
  const grandTotalCol = colPtr;

  summaryHeaderRow1.font = { bold: true };
  summaryHeaderRow2.font = { bold: true };
  summaryHeaderRow1.alignment = { horizontal: "center", vertical: "middle" };
  summaryHeaderRow2.alignment = { horizontal: "center", vertical: "middle" };

  let summaryRowPtr = 3;
  let summarySn = 1;
  function writeSummaryRow(identity: (string | number)[], byLevelType: Map<string, Map<string, number>>) {
    const row = teacherSummarySheet.getRow(summaryRowPtr);
    identity.forEach((v, i) => {
      row.getCell(i + 1).value = v;
    });
    let grand = 0;
    for (const { level, start, end } of levelColRanges) {
      const byType = byLevelType.get(level);
      let levelTotal = 0;
      let c = start;
      for (const ty of SUMMARY_TYPES) {
        const count = byType?.get(ty.key) || 0;
        row.getCell(c).value = count;
        levelTotal += count;
        c++;
      }
      row.getCell(end).value = levelTotal;
      grand += levelTotal;
    }
    row.getCell(grandTotalCol).value = grand;
    summaryRowPtr++;
  }

  for (const s of schools) {
    writeSummaryRow(
      [summarySn++, s.school_name, s.emis_code, s.district, s.municipality, s.ward_no],
      pivotBySchool.get(s.id) || new Map()
    );
  }

  if (unlinkedCount > 0) {
    writeSummaryRow(
      [summarySn++, "— Unlinked (no matched School record) —", "", "", "", ""],
      unlinkedPivot
    );
  }

  return workbook;
}

// Fetches teachers + schools, builds the 3-sheet workbook above, and
// triggers the browser download. Throws on failure -- caller (page.tsx)
// is responsible for catching and surfacing the error to the user.
export async function downloadFullDataExport(authFetch: AuthFetch): Promise<void> {
  const [teachersRes, schoolsRes] = await Promise.all([
    authFetch("/api/"),
    authFetch("/api/schools/"),
  ]);
  if (!teachersRes.ok || !schoolsRes.ok) {
    throw new Error("Could not load data for export.");
  }
  const teachers = await teachersRes.json();
  const schools = await schoolsRes.json();

  const workbook = await buildFullExportWorkbook(teachers, schools);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  triggerBlobDownload(blob, `teacher_portal_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// Approved-schools-only export -- same column set as the Schools sheet
// in the full export above (our own stored fields; deliberately not
// trying to replicate the government per-grade/gender headcount
// columns, which this system doesn't track), but scoped to just the
// already-loaded approvedSchools list and its own single-sheet file.
export async function downloadSchoolReport(authFetch: AuthFetch, school: any): Promise<void> {
  const res = await authFetch(`/api/schools/${school.id}/export/`);
  if (!res.ok) {
    throw new Error("Export failed.");
  }
  const blob = await res.blob();
  triggerBlobDownload(blob, `${school.school_name || "school"}_${school.emis_code || ""}.xlsx`);
}

export async function downloadApprovedSchoolsExcel(authFetch: AuthFetch): Promise<void> {
  const res = await authFetch("/api/schools/export-all/");
  if (!res.ok) {
    throw new Error("Export failed.");
  }
  const blob = await res.blob();
  triggerBlobDownload(blob, `all_schools_report_${new Date().toISOString().slice(0, 10)}.xlsx`);
}