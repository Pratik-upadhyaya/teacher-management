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

FIRST_TEACHER_ROW = 20
TEMPLATE_TEACHER_ROWS = 4  # rows 20-23 exist pre-styled in the template

# Every cell/column reference below matches the rebuilt template (2026-07):
# the दरबन्दी grid now gives every level the full 7-type breakdown (previously
# some levels, e.g. Higher Secondary, were missing columns for types that do
# occur in practice) but no longer fits on one row -- it wraps into two
# row-groups (13 and 16). नियुक्ती मिति similarly grew from 3 columns to one
# per teacher type, pushing every column after it right by 4, and the whole
# teacher roster starts 3 rows lower (20, was 17) to make room.

TEACHER_TYPE_NP = {
    "permanent": "स्थायी",
    # "temporary" (अस्थायी) and "contract" (करार) are distinct employment
    # categories, not two names for the same one -- this was previously
    # mislabeled "करार" here, silently mismatching the "Temporary /
    # अस्थायी" label teachers actually see at registration
    # (app/register/page.tsx). "contract" is now its own separate
    # teacherType value, matching the School model's own long-standing
    # (separate) _contract quota fields.
    "temporary": "अस्थायी",
    "contract": "करार",
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

# Full teacher-roster column span, A-X (was A-T before the template's
# नियुक्ती मिति block grew from 3 to 7 columns).
COLUMN_RANGE = "ABCDEFGHIJKLMNOPQRSTUVWX"

# नियुक्ती मिति (appointment date) column for each teacher type, matching
# row 19's sub-labels left to right: अस्थायी, स्थायी, करार, अनुदान,
# शि अनुदान, राहत, निजी.
APPOINTMENT_DATE_COL = {
    "temporary": "K",
    "permanent": "L",
    "contract": "M",
    "grant": "N",
    "shi_anudan": "O",
    "relief": "P",
    "private": "Q",
}


def _format_subject(teacher):
    """English/Nepali, e.g. 'Science/विज्ञान'. Falls back to whichever
    of the two is present if the other was left blank."""
    english = (teacher.subjectEnglish or "").strip()
    nepali = (teacher.subject or "").strip()
    if english and nepali:
        return f"{english}/{nepali}"
    return english or nepali


def _copy_cell_style(src_cell, dst_cell):
    dst_cell.font = copy.copy(src_cell.font)
    dst_cell.border = copy.copy(src_cell.border)
    dst_cell.fill = copy.copy(src_cell.fill)
    dst_cell.alignment = copy.copy(src_cell.alignment)
    dst_cell.number_format = src_cell.number_format


ALL_TEACHER_TYPES = ["permanent", "temporary", "contract", "grant", "shi_anudan", "relief", "private"]
ALL_LEVELS = ["pre_primary", "primary", "lower_secondary", "secondary", "higher_secondary"]


def _quota_counts(teachers):
    """Aggregate approved teachers into level x type counts, across every
    level and every teacher type -- not just the subset of columns the
    individual per-school template's paper form happens to have (that
    template only reads the specific level/type combinations it has actual
    columns for; see _fill_school_sheet below, which is unaffected by the
    extra keys here since it just never looks at them)."""
    counts = {level: {t: 0 for t in ALL_TEACHER_TYPES} for level in ALL_LEVELS}
    for t in teachers:
        level_bucket = counts.get(t.level)
        if level_bucket is not None and t.teacherType in level_bucket:
            level_bucket[t.teacherType] += 1
    return counts


# School's own दरबन्दी fields (Step 4 of the principal's school-info form,
# app/(portal)/principal/page.tsx) use different level-key and type-key
# spellings than Teacher.level/teacherType and this module's ALL_LEVELS/
# ALL_TEACHER_TYPES -- e.g. "lower_secondary" here vs. School's
# "lower_sec_*" fields, and teacherType "temporary" vs. School's "_contract"
# suffix (see _TYPE_SHORT_LABEL's comment -- same employment category,
# different name in each place). These two maps translate between them.
_LEVEL_TO_SCHOOL_PREFIX = {
    "pre_primary": "pre_primary",
    "primary": "primary",
    "lower_secondary": "lower_sec",
    "secondary": "secondary_9_10",
    "higher_secondary": "secondary_11_12",
}
_TYPE_TO_SCHOOL_SUFFIX = {
    "permanent": "permanent",
    # Previously "temporary" incorrectly pointed at the School model's
    # "_contract" field, conflating अस्थायी and करार as if they were the
    # same category. Each now has its own field/suffix, matching the two
    # separate values Teacher.teacherType can hold.
    "temporary": "temporary",
    "contract": "contract",
    "grant": "grant",
    "shi_anudan": "shi_anudan",
    "relief": "relief",
    "private": "private",
}


def _declared_dabandi_counts(school):
    """The principal's own entered दरबन्दी (teacher quota) figures for this
    school, read straight off the School row -- kept as a separate figure
    from _quota_counts (which counts actual approved Teacher records), not
    merged with or overridden by it. Missing/never-submitted fields default
    to 0 via the model's own field defaults."""
    counts = {level: {} for level in ALL_LEVELS}
    for level in ALL_LEVELS:
        prefix = _LEVEL_TO_SCHOOL_PREFIX[level]
        for t in ALL_TEACHER_TYPES:
            suffix = _TYPE_TO_SCHOOL_SUFFIX[t]
            counts[level][t] = getattr(school, f"{prefix}_{suffix}", 0) or 0
    return counts


def _fill_school_sheet(ws, school, teachers):
    # ── Header ──────────────────────────────────────────────────────
    ws["A2"] = school.school_name
    ws["A3"] = school.address or ""
    ws["A4"] = f"ईमिस कोडः {school.emis_code}"
    ws["O5"] = f"विद्यालयको सम्पर्कः {school.contact or ''}"
    ws["V5"] = f"ईमेल ठेगानाः {school.email or ''}"

    # ── Row 9: establishment / sections / infrastructure ────────────
    # क्र स (A9) is static "1" on a single-school sheet -- baked into the
    # old template but dropped when this one was rebuilt, so set it here
    # instead of relying on the template shipping it pre-filled.
    ws["A9"] = 1
    # C9 is merged C9:D9 in the rebuilt template (openpyxl: write the
    # top-left anchor only, see xlsx skill notes on merged cells).
    ws["C9"] = school.established_bs or ""
    ws["E9"] = school.bal_kaksha or ""
    ws["F9"] = school.primary_1_5 or ""
    ws["G9"] = school.lower_secondary_6_8 or ""
    ws["H9"] = school.secondary_9_10 or ""
    ws["I9"] = school.secondary_11_12 or ""
    # No dedicated column for permission_date_bs in this layout (see
    # module docstring) -- recorded in the remarks column instead of
    # dropping the data.
    ws["J9"] = f"अनुमति मितिः {school.permission_date_bs}" if school.permission_date_bs else ""
    # Tick/cross for present/absent, per explicit request -- was छ/छैन text.
    ws["K9"] = "✓" if school.computer_lab else "✗"
    ws["L9"] = "✓" if school.science_lab else "✗"
    ws["M9"] = "✓" if school.library else "✗"
    ws["N9"] = "✓" if school.book_corner else "✗"
    ws["O9"] = "✓" if school.playground else "✗"
    # New in the rebuilt template -- previously only the bulk flat export
    # (build_all_schools_flat_report) had these two.
    ws["P9"] = "✓" if school.e_library else "✗"
    ws["Q9"] = "✓" if school.smart_board else "✗"
    ws["R9"] = school.land_area_display()
    # New "एकाई" (unit) column -- land_area_display() already embeds the
    # unit name in its string, so this is the short standalone label from
    # the model's own choices, not a re-derivation of it.
    ws["S9"] = school.get_land_unit_system_display() if school.land_unit_system else ""
    ws["T9"] = school.building_count or ""
    ws["U9"] = school.classroom_count or ""
    ws["V9"] = school.female_toilets or ""
    ws["W9"] = school.male_toilets or ""

    # ── Rows 13 & 16: दरबन्दी (teacher quota) counts, computed live from
    # the school's actual approved teacher roster rather than any
    # separately-entered quota figure ─────────────────────────────────
    #
    # The rebuilt template gives every level in ALL_LEVELS the full
    # len(ALL_TEACHER_TYPES) + 1 (types + जम्मा total) columns, but that no
    # longer fits on one row -- it wraps into two row-groups:
    #   Row 13: pre_primary (B-I), primary (J-Q), lower_secondary (R-X --
    #           types only, its जम्मा didn't fit and wraps to row 16 col B)
    #   Row 16: lower_secondary's जम्मा (B), secondary (C-J),
    #           higher_secondary (K-R)
    # (level, data_row, first_type_col, total_row, total_col) -- column
    # numbers are 1-based (B=2, J=10, R=18, C=3, K=11).
    q = _quota_counts(teachers)
    GRID_LAYOUT = [
        ("pre_primary", 13, 2, 13, 9),
        ("primary", 13, 10, 13, 17),
        ("lower_secondary", 13, 18, 16, 2),
        ("secondary", 16, 3, 16, 10),
        ("higher_secondary", 16, 11, 16, 18),
    ]
    for level, data_row, start_col, total_row, total_col in GRID_LAYOUT:
        level_counts = q[level]
        level_total = 0
        for type_idx, t_type in enumerate(ALL_TEACHER_TYPES):
            count = level_counts[t_type]
            ws.cell(row=data_row, column=start_col + type_idx, value=count)
            level_total += count
        ws.cell(row=total_row, column=total_col, value=level_total)

    # ── Rows 17+: teacher roster ──────────────────────────────────────
    teachers = list(teachers)
    n_needed = len(teachers) - TEMPLATE_TEACHER_ROWS
    if n_needed > 0:
        insert_at = FIRST_TEACHER_ROW + TEMPLATE_TEACHER_ROWS
        ws.insert_rows(insert_at, amount=n_needed)
        style_row = FIRST_TEACHER_ROW + TEMPLATE_TEACHER_ROWS - 1  # row 23, pre-insert styling
        for offset in range(n_needed):
            new_row = insert_at + offset
            ws.row_dimensions[new_row].height = ws.row_dimensions[style_row].height
            for col in COLUMN_RANGE:
                _copy_cell_style(ws[f"{col}{style_row}"], ws[f"{col}{new_row}"])

    for i, t in enumerate(teachers):
        row = FIRST_TEACHER_ROW + i
        ws[f"A{row}"] = i + 1
        ws[f"B{row}"] = t.tokenNo or ""
        ws[f"C{row}"] = t.name
        ws[f"D{row}"] = t.fatherName
        ws[f"E{row}"] = t.permanentAddress
        ws[f"F{row}"] = t.dob
        ws[f"G{row}"] = _format_subject(t)
        ws[f"H{row}"] = LEVEL_NP.get(t.level, t.level or "")
        ws[f"I{row}"] = GRADE_NP.get(t.grade, t.grade or "")
        ws[f"J{row}"] = TEACHER_TYPE_NP.get(t.teacherType, t.teacherType or "")

        # नियुक्ती मिति now has one dedicated column per teacher type
        # (K-Q) instead of the old 3-column K/L/M layout -- the rebuilt
        # template's row 19 sub-labels are, in column order: अस्थायी,
        # स्थायी, करार, अनुदान, शि अनुदान, राहत, निजी. The template's
        # pre-styled rows 20-23 ship with real sample data baked into
        # every cell (not just formatting), so every column NOT
        # applicable to this teacher must be explicitly blanked here --
        # otherwise it silently retains the original sample's values.
        for col in "KLMNOPQ":
            ws[f"{col}{row}"] = ""
        appointment_col = APPOINTMENT_DATE_COL.get(t.teacherType)
        if appointment_col:
            ws[f"{appointment_col}{row}"] = t.appointmentDate or ""

        # Government roster template only has one qualification column --
        # highest completed is the more informative credential to show
        # there, falling back to minimum if only that was recorded.
        # (Shifted right by 4 columns vs. the old template, to make room
        # for नियुक्ती मिति's 4 new columns above.)
        ws[f"R{row}"] = t.highestQualification or t.minQualification or ""
        ws[f"S{row}"] = t.promotionDate or ""
        ws[f"T{row}"] = t.extraordinaryLeave or ""
        ws[f"U{row}"] = t.ageSixtyYear or ""
        ws[f"V{row}"] = t.extraordinaryLeaveRemaining
        ws[f"W{row}"] = t.phone
        ws[f"X{row}"] = t.remarks or ""

    # The template's pre-styled rows 17-20 ship with a real sample
    # school's teacher data baked directly into the cells, not just
    # formatting. Any of those 4 rows past the actual teacher count must
    # be explicitly cleared -- otherwise a school with fewer than 4
    # approved teachers silently leaks the sample's real names,
    # addresses, and dates of birth into its report.
    if len(teachers) < TEMPLATE_TEACHER_ROWS:
        for row in range(FIRST_TEACHER_ROW + len(teachers), FIRST_TEACHER_ROW + TEMPLATE_TEACHER_ROWS):
            for col in COLUMN_RANGE:
                ws[f"{col}{row}"] = None


def build_school_report(school, teachers):
    """teachers: iterable of approved Teacher rows linked to this school."""
    wb = openpyxl.load_workbook(TEMPLATE_PATH)

    # The template ships with a second, redundant scratch sheet ("Sheet9")
    # from the sample it was extracted from -- drop it so each school's
    # export is just the one clean report sheet.
    if "Sheet9" in wb.sheetnames:
        del wb["Sheet9"]

    ws = wb[SHEET_NAME]
    _fill_school_sheet(ws, school, teachers)

    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return buffer



# ── Bulk "all approved schools" export ───────────────────────────────────
#
# Unlike build_school_report (one school, government per-school template),
# this produces a single flat sheet -- one row per school -- matching the
# shape of the client-supplied district-wide "Students Level Report"
# sample (two header rows: grouped level headers on top, column labels
# below; one data row per school). Same shape, but teacher दरबन्दी counts
# in place of student enrollment, since there's no per-student data for
# teacher rosters to report here.

from openpyxl.styles import Alignment, Font
from openpyxl.utils import get_column_letter

# (bucket key, header label, Nepali sub-label, ordered type keys for that
# bucket) -- every level x every teacher type, unlike the individual
# per-school template (which is constrained to whatever columns the
# official paper form actually has).
_FLAT_LEVEL_GROUPS = [
    ("pre_primary", "Pre-Primary", "पूर्व-प्राथमिक", ALL_TEACHER_TYPES),
    ("primary", "Primary", "प्राथमिक (१-५)", ALL_TEACHER_TYPES),
    ("lower_secondary", "Lower Secondary", "नि.मा.वि (६-८)", ALL_TEACHER_TYPES),
    ("secondary", "Secondary", "मा.वि (९-१०)", ALL_TEACHER_TYPES),
    ("higher_secondary", "Higher Secondary", "मा.वि (११-१२)", ALL_TEACHER_TYPES),
]
_TYPE_SHORT_LABEL = {
    # "Temporary" (Teacher.teacherType's own name) and "Contract" (the name
    # School's separately-entered quota fields use for the same category,
    # e.g. primary_contract) are the same employment category under two
    # different names elsewhere in this codebase -- one column, dual-labeled,
    # not two.
    "permanent": "Permanent",
    "temporary": "Temporary / Contract",
    "grant": "Grant",
    "shi_anudan": "Shi Anudan",
    "relief": "Relief",
    "private": "Private",
}

_SCHOOL_INFO_HEADERS = [
    "S.N", "District", "Local Level", "Ward", "School Name", "EMIS Code",
    "Contact Number", "Email",
]

# Same facilities the individual per-school report shows in its row 9 --
# this was missing from the bulk export entirely; each school's row here
# now carries the same infrastructure picture as its own individual report.
# E-Library/Smart Board have no equivalent column in the per-school
# government-template report (that template has no spare columns -- see
# module docstring); they only exist here.
_INFRA_HEADERS = [
    "Established (BS)", "Computer Lab", "Science Lab", "Library",
    "Book Corner", "Playground", "E-Library", "Smart Board", "Land Area",
    "Buildings", "Classrooms", "Female Toilets", "Male Toilets",
]


_QUOTA_BLOCKS = ["registered", "declared"]
_BLOCK_LABEL = {
    "registered": "Registered Teachers",
    "declared": "Declared दरबन्दी (Principal-entered)",
}


def _flat_header_layout():
    """Column index (1-based) -> (group_key or None, sub-label). group_key
    is None for the ungrouped school-info/Grand Total columns, "infra" for
    the infrastructure block, or "{level}:{block}" for a teacher-count
    block, where block is "registered" (live count of actually-approved
    Teacher records) or "declared" (the principal's own दरबन्दी entry from
    the school-info form) -- kept as two separate figures, side by side,
    rather than one replacing or being merged into the other; they can
    legitimately disagree (declared = sanctioned positions, registered =
    who has actually been approved into the system so far).
    Order: school-info columns, infrastructure block, one registered+
    declared pair of blocks per level (types + level subtotal each), then
    a grand-total column for each of registered/declared."""
    layout = [(None, h) for h in _SCHOOL_INFO_HEADERS]
    layout += [("infra", h) for h in _INFRA_HEADERS]
    for level_key, _label, _sub, type_keys in _FLAT_LEVEL_GROUPS:
        for block in _QUOTA_BLOCKS:
            for type_key in type_keys:
                layout.append((f"{level_key}:{block}", _TYPE_SHORT_LABEL[type_key]))
            layout.append((f"{level_key}:{block}", "Total"))
    layout.append((None, "Registered Grand Total"))
    layout.append((None, "Declared Grand Total"))
    return layout


def build_all_schools_flat_report(schools_with_teachers):
    """schools_with_teachers: iterable of (school, teachers) pairs, each
    teachers being that school's approved Teacher rows. Produces one
    workbook, one sheet, one row per school -- teacher दरबन्दी counts by
    level and type, not a copy of each school's individual report."""
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Approved Schools"

    layout = _flat_header_layout()
    n_cols = len(layout)
    bold = Font(bold=True)
    center = Alignment(horizontal="center", vertical="center", wrap_text=True)

    # Row 1: grouped headers (Infrastructure, then each level), merged
    # across their columns; ungrouped school-info/Grand Total columns
    # merge vertically with row 2 instead, since they have nothing to
    # group under.
    col = len(_SCHOOL_INFO_HEADERS) + 1
    infra_span = len(_INFRA_HEADERS)
    ws.merge_cells(start_row=1, start_column=col, end_row=1, end_column=col + infra_span - 1)
    infra_cell = ws.cell(row=1, column=col, value="Infrastructure")
    infra_cell.font = bold
    infra_cell.alignment = center
    col += infra_span

    for level_key, label, sub_label, type_keys in _FLAT_LEVEL_GROUPS:
        for block in _QUOTA_BLOCKS:
            span = len(type_keys) + 1  # + the block's own Total column
            start, end = col, col + span - 1
            ws.merge_cells(start_row=1, start_column=start, end_row=1, end_column=end)
            cell = ws.cell(row=1, column=start, value=f"{label} / {sub_label} — {_BLOCK_LABEL[block]}")
            cell.font = bold
            cell.alignment = center
            col += span

    for idx, (level_key, sub_label) in enumerate(layout, start=1):
        if level_key is None:
            ws.merge_cells(start_row=1, start_column=idx, end_row=2, end_column=idx)
            cell = ws.cell(row=1, column=idx, value=sub_label)
        else:
            cell = ws.cell(row=2, column=idx, value=sub_label)
        cell.font = bold
        cell.alignment = center

    ws.row_dimensions[1].height = 22
    ws.row_dimensions[2].height = 32
    ws.freeze_panes = "A3"

    # Data rows
    row = 3
    for sn, (school, teachers) in enumerate(schools_with_teachers, start=1):
        q = _quota_counts(list(teachers))
        d = _declared_dabandi_counts(school)
        values = [
            sn,
            school.district or "",
            school.municipality or "",
            school.ward_no or "",
            school.school_name,
            school.emis_code,
            school.contact or "",
            school.email or "",
            school.established_bs or "",
            "✓" if school.computer_lab else "✗",
            "✓" if school.science_lab else "✗",
            "✓" if school.library else "✗",
            "✓" if school.book_corner else "✗",
            "✓" if school.playground else "✗",
            "✓" if school.e_library else "✗",
            "✓" if school.smart_board else "✗",
            school.land_area_display(),
            school.building_count or "",
            school.classroom_count or "",
            school.female_toilets or "",
            school.male_toilets or "",
        ]
        registered_grand_total = 0
        declared_grand_total = 0
        for level_key, _label, _sub, type_keys in _FLAT_LEVEL_GROUPS:
            reg_bucket = q[level_key]
            reg_total = 0
            for type_key in type_keys:
                count = reg_bucket[type_key]
                values.append(count)
                reg_total += count
            values.append(reg_total)
            registered_grand_total += reg_total

            dec_bucket = d[level_key]
            dec_total = 0
            for type_key in type_keys:
                count = dec_bucket[type_key]
                values.append(count)
                dec_total += count
            values.append(dec_total)
            declared_grand_total += dec_total
        values.append(registered_grand_total)
        values.append(declared_grand_total)

        for col_idx, value in enumerate(values, start=1):
            ws.cell(row=row, column=col_idx, value=value)
        row += 1

    for col_idx in range(1, n_cols + 1):
        letter = get_column_letter(col_idx)
        header_len = len(str(layout[col_idx - 1][1]))
        ws.column_dimensions[letter].width = max(10, min(header_len + 4, 28))
    ws.column_dimensions["E"].width = 30  # School Name

    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return buffer