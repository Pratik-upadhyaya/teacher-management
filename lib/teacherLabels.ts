export const SUBJECT_LABELS: Record<string, string> = {
  science: "Science / विज्ञान",
  math: "Mathematics / गणित",
  nepali: "Nepali / नेपाली",
  english: "English / अंग्रेजी",
  social: "Social Studies / सामाजिक",
  health: "Health / स्वास्थ्य",
};

export const LEVEL_LABELS: Record<string, string> = {
  pre_primary: "Pre-Primary / पूर्व-प्राथमिक",
  primary: "Primary / आधारभूत (१–५)",
  lower_secondary: "Lower Secondary / निम्न माध्यमिक (६–८)",
  secondary: "Secondary / माध्यमिक (९–१०)",
  higher_secondary: "Higher Secondary / उच्च माध्यमिक (११–१२)",
};

export const GRADE_LABELS: Record<string, string> = {
  third: "Third / तृतीय",
  second: "Second / द्वितीय",
  first: "First / प्रथम",
};

export const TEACHER_TYPE_LABELS: Record<string, string> = {
  permanent: "Permanent / स्थायी",
  temporary: "Temporary / अस्थायी",
  contract: "Contract / करार",
  grant: "Grant / अनुदान",
  shi_anudan: "Shi Anudan / शि अनुदान",
  relief: "Relief / राहत",
  private: "Private / निजी",
};

export const QUALIFICATION_LABELS: Record<string, string> = {
  slc: "SLC / SEE",
  plus2: "+2 / Intermediate",
  bachelor: "Bachelor / स्नातक",
  master: "Master / स्नातकोत्तर",
  mphil_phd: "M.Phil / PhD",
};

export const GENDER_LABELS: Record<string, string> = {
  male: "Male / पुरुष",
  female: "Female / महिला",
  other: "Other / अन्य",
};

export function formatTeacherField(
  map: Record<string, string>,
  value?: string | null
): string {
  if (!value) return "—";
  if (map[value]) return map[value];
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}