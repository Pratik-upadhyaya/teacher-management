import { SUBJECT_LABELS, formatTeacherField } from "@/lib/teacherLabels";
import type { Teacher } from "../types";

type TeacherListTabProps = {
  title: string;
  titleClassName: string;
  teachers: Teacher[];
  variant: "simple" | "card";
  emptyMessage?: string;
  onView: (teacher: Teacher) => void;
};

export default function TeacherListTab({
  title,
  titleClassName,
  teachers,
  variant,
  emptyMessage,
  onView,
}: TeacherListTabProps) {
  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <h2 className={`text-2xl font-bold mb-6 ${titleClassName}`}>{title}</h2>

      {teachers.length === 0 && emptyMessage ? (
        <p className="text-gray-500">{emptyMessage}</p>
      ) : variant === "simple" ? (
        teachers.map((teacher) => (
          <div key={teacher.id} className="border-b py-4 flex justify-between items-center">
            <div>
              <p className="font-semibold">{teacher.name}</p>
              <p className="text-gray-500">{formatTeacherField(SUBJECT_LABELS, teacher.subject)}</p>
            </div>

            <button
              onClick={() => onView(teacher)}
              className="bg-[#0f2044] text-white px-4 py-2 rounded-lg"
            >
              View
            </button>
          </div>
        ))
      ) : (
        <div className="space-y-4">
          {teachers.map((teacher) => (
            <div
              key={teacher.id}
              className="border rounded-xl p-5 flex justify-between items-center hover:shadow-md transition"
            >
              <div>
                <h3 className="font-bold text-lg text-[#0f2044]">{teacher.name}</h3>
                <p className="text-gray-500">Token: {teacher.tokenNo}</p>
                <p className="text-gray-500">Subject: {formatTeacherField(SUBJECT_LABELS, teacher.subject)}</p>
                {teacher.remarks && (
                  <p className="text-red-600 text-sm mt-1">Reason: {teacher.remarks}</p>
                )}
              </div>

              <button
                onClick={() => onView(teacher)}
                className="px-4 py-2 bg-[#0f2044] text-white rounded-lg hover:bg-[#1a3260]"
              >
                View
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
