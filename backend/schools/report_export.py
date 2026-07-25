"""Fills backend/schools/templates/school_report_template.xlsx with a single
school's data + its teacher roster, matching the exact layout of the
government-provided template (client-supplied sample, sheet
'विद्यालय विवरण'). Returns an in-memory .xlsx, one per school.

Column mapping was reverse-engineered from a filled sample of the template
-- see the comments below for what each column turned out to mean. Some of
this is a best-effort interpretation of a legacy paper-form layout; where a
column's exact intent was ambiguous, the choice made is noted inline.
"""
import copy
import io

import openpyxl

from django.conf import settings

TEMPLATE_PATH = settings.BASE_DIR / "schools" / "templates" / "school_report_template.xlsx"
SHEET_NAME = "विद्यालय विवरण"

FIRST_TEACHER_ROW = 17
TEMPLATE_TEACHER_ROWS = 4  # rows 17-20 exist pre-styled in the template

TEACHER_TYPE_NP = {
    "permanent": "स्थायी",
    "temporary": "करार",
    "grant": "अनुदान",
    "shi_anudan": "शि अनुदान",
    "relief": "राहत",
    "private": "निजी",
}
LEVEL_NP = {
    "primary": "प्रा.वि",
    "lower_secondary": "नि.मा.वि",
    "secondary": "मा.वि (९-१०)",
    "higher_secondary": "मा.वि (११-१२)",
}
GRADE_NP = {
    "first": "प्र.",
    "second": "द्धि.",
    "third": "तृ.",
}


def _copy_cell_style(src_cell, dst_cell):
    dst_cell.font = copy.copy(src_cell.font)
    dst_cell.border = copy.copy(src_cell.border)
    dst_cell.fill = copy.copy(src_cell.fill)
    dst_cell.alignment = copy.copy(src_cell.alignment)
    dst_cell.number_format = src_cell.number_format


def _quota_counts(teachers):
    """Aggregate approved teachers into the दरबन्दी grid's level x type
    columns. Only the type columns the template actually tracks per level
    are counted individually; 'जम्मा' (total) sums just those tracked
    columns, matching what the template's own header row implies rather
    than every possible teacherType."""
    counts = {
        "primary": {"permanent": 0, "temporary": 0, "grant": 0},
        "lower_secondary": {"permanent": 0, "temporary": 0, "grant": 0, "shi_anudan": 0},
        "secondary": {"permanent": 0, "temporary": 0, "grant": 0, "shi_anudan": 0},
        "higher_secondary": {"temporary": 0, "grant": 0},
    }
    for t in teachers:
        level_bucket = counts.get(t.level)
        if level_bucket is not None and t.teacherType in level_bucket:
            level_bucket[t.teacherType] += 1
    return counts


def build_school_report(school, teachers):
    """teachers: iterable of approved Teacher rows linked to this school."""
    wb = openpyxl.load_workbook(TEMPLATE_PATH)

    # The template ships with a second, redundant scratch sheet ("Sheet9")
    # from the sample it was extracted from -- drop it so each school's
    # export is just the one clean report sheet.
    if "Sheet9" in wb.sheetnames:
        del wb["Sheet9"]

    ws = wb[SHEET_NAME]

    # ── Header ──────────────────────────────────────────────────────
    ws["A2"] = school.school_name
    ws["A3"] = school.address or ""
    ws["A4"] = f"ईमिस कोडः {school.emis_code}"
    ws["M5"] = f"विद्यालयको सम्पर्कः {school.contact or ''}"
    ws["R5"] = f"ईमेल ठेगानाः {school.email or ''}"

    # ── Row 9: establishment / sections / infrastructure ────────────
    ws["C9"] = school.established_bs or ""
    ws["D9"] = school.bal_kaksha or ""
    ws["E9"] = school.primary_1_5 or ""
    ws["F9"] = school.lower_secondary_6_8 or ""
    ws["G9"] = school.secondary_9_10 or ""
    ws["H9"] = school.secondary_11_12 or ""
    # No dedicated column for permission_date_bs in this layout (see
    # module docstring) -- recorded in the remarks column instead of
    # dropping the data.
    ws["I9"] = f"अनुमति मितिः {school.permission_date_bs}" if school.permission_date_bs else ""
    ws["J9"] = "छ" if school.computer_lab else "छैन"
    ws["K9"] = "छ" if school.science_lab else "छैन"
    ws["L9"] = "छ" if school.library else "छैन"
    ws["M9"] = "छ" if school.book_corner else "छैन"
    ws["N9"] = "छ" if school.playground else "छैन"
    ws["O9"] = school.land_area or ""
    ws["P9"] = school.building_count or ""
    ws["Q9"] = school.classroom_count or ""
    ws["R9"] = school.female_toilets or ""
    ws["S9"] = school.male_toilets or ""

    # ── Row 13: दरबन्दी (teacher quota) counts, computed live from the
    # school's actual approved teacher roster rather than any
    # separately-entered quota figure ─────────────────────────────────
    q = _quota_counts(teachers)
    p = q["primary"]; ls = q["lower_secondary"]; s = q["secondary"]; hs = q["higher_secondary"]
    ws["C13"] = p["permanent"]
    ws["D13"] = p["temporary"]
    ws["E13"] = p["grant"]
    ws["F13"] = p["permanent"] + p["temporary"] + p["grant"]
    ws["G13"] = ls["permanent"]
    ws["H13"] = ls["temporary"]
    ws["I13"] = ls["grant"]
    ws["J13"] = ls["shi_anudan"]
    ws["K13"] = ls["permanent"] + ls["temporary"] + ls["grant"] + ls["shi_anudan"]
    ws["L13"] = s["permanent"]
    ws["M13"] = s["temporary"]
    ws["N13"] = s["grant"]
    ws["O13"] = s["shi_anudan"]
    ws["P13"] = s["permanent"] + s["temporary"] + s["grant"] + s["shi_anudan"]
    ws["Q13"] = hs["temporary"]
    ws["R13"] = hs["grant"]
    ws["S13"] = hs["temporary"] + hs["grant"]

    # ── Rows 17+: teacher roster ──────────────────────────────────────
    teachers = list(teachers)
    n_needed = len(teachers) - TEMPLATE_TEACHER_ROWS
    if n_needed > 0:
        insert_at = FIRST_TEACHER_ROW + TEMPLATE_TEACHER_ROWS
        ws.insert_rows(insert_at, amount=n_needed)
        style_row = FIRST_TEACHER_ROW + TEMPLATE_TEACHER_ROWS - 1  # row 20, pre-insert styling
        for offset in range(n_needed):
            new_row = insert_at + offset
            ws.row_dimensions[new_row].height = ws.row_dimensions[style_row].height
            for col in "ABCDEFGHIJKLMNOPQRST":
                _copy_cell_style(ws[f"{col}{style_row}"], ws[f"{col}{new_row}"])

    for i, t in enumerate(teachers):
        row = FIRST_TEACHER_ROW + i
        ws[f"A{row}"] = i + 1
        ws[f"B{row}"] = t.tokenNo or ""
        ws[f"C{row}"] = t.name
        ws[f"D{row}"] = t.fatherName
        ws[f"E{row}"] = t.permanentAddress
        ws[f"F{row}"] = t.dob
        ws[f"G{row}"] = t.subject or ""
        ws[f"H{row}"] = LEVEL_NP.get(t.level, t.level or "")
        ws[f"I{row}"] = GRADE_NP.get(t.grade, t.grade or "")
        ws[f"J{row}"] = TEACHER_TYPE_NP.get(t.teacherType, t.teacherType or "")

        # नियुक्ती मिति lives in one of K/L/M depending on employment
        # category (see module docstring) -- K for non-permanent,
        # non-relief types, L for Permanent, M for Relief.
        if t.teacherType == "permanent":
            ws[f"L{row}"] = t.appointmentDate or ""
        elif t.teacherType == "relief":
            ws[f"M{row}"] = t.appointmentDate or ""
        else:
            ws[f"K{row}"] = t.appointmentDate or ""

        ws[f"N{row}"] = t.qualification or ""
        ws[f"O{row}"] = t.promotionDate or ""
        ws[f"P{row}"] = t.extraordinaryLeave or ""
        ws[f"Q{row}"] = t.ageSixtyYear or ""
        ws[f"R{row}"] = t.extraordinaryLeaveRemaining
        ws[f"S{row}"] = t.phone
        ws[f"T{row}"] = t.remarks or ""

    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return buffer