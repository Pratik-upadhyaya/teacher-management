"use client";

// =========================
// IMPORTS
// =========================
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { authFetch, API_BASE_URL } from "@/lib/api";

export default function TeacherDetailPage() {
  // =========================
  // GET TEACHER ID FROM URL
  // =========================
  const params = useParams();
  const id = params.id;

  // =========================
  // STATES
  // =========================
  const [teacher, setTeacher] = useState<any>(null);
  const [changeMessage, setChangeMessage] = useState("");

  // =========================
  // FETCH TEACHER DETAIL
  // =========================
  useEffect(() => {
    authFetch(`/api/teacher/${id}/`)
      .then((res) => res.json())
      .then((data) => setTeacher(data));
  }, [id]);

  // =========================
  // SEND CHANGE REQUEST
  // =========================
  async function sendChangeRequest() {
    const res = await authFetch(`/api/teacher/${id}/request-changes/`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: changeMessage,
      }),
    });

    if (res.ok) {
      alert("Change request sent to teacher");
      setChangeMessage("");
    } else {
      alert("Failed");
    }
  }

  // =========================
  // OPEN DOCUMENT
  // =========================
  function openDocument(docUrl: string | null) {
    if (!docUrl) {
      alert("Document not uploaded");
      return;
    }

    console.log("DOC URL =", docUrl);

    const fullUrl = docUrl.startsWith("http")
      ? docUrl
      : `${API_BASE_URL}/media/${docUrl}`;

    window.open(fullUrl, "_blank", "noopener,noreferrer");
  }

  if (!teacher) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-[#eef3fb] p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* HEADER */}
        <div className="bg-white rounded-2xl shadow p-6 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-[#0b2c5f]">
              Teacher Review Panel
            </h1>
            <p className="text-gray-500">
              Review teacher details before approval
            </p>
          </div>

          <div
            className={`px-5 py-2 rounded-full font-bold ${
              teacher.status === "approved"
                ? "bg-green-100 text-green-700"
                : teacher.status === "rejected"
                ? "bg-red-100 text-red-700"
                : "bg-yellow-100 text-yellow-700"
            }`}
          >
            {teacher.status}
          </div>
        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-3 gap-6">

          {/* LEFT PROFILE */}
          <div className="bg-white rounded-2xl shadow p-6">
            <div className="flex flex-col items-center">
              <div className="w-28 h-28 rounded-full bg-blue-200 flex items-center justify-center text-4xl font-bold text-[#0b2c5f]">
                {teacher.name?.[0]}
              </div>

              <h2 className="text-2xl font-bold mt-4">{teacher.name}</h2>
              <p className="text-gray-500">{teacher.subject}</p>
            </div>

            <div className="mt-8 space-y-3">
              <p><b>Token:</b> {teacher.tokenNo}</p>
              <p><b>Phone:</b> {teacher.phone}</p>
              <p><b>Email:</b> {teacher.email}</p>
            </div>
          </div>

          {/* RIGHT DETAILS */}
          <div className="col-span-2 space-y-6">

            {/* Personal */}
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="text-2xl font-bold mb-4 text-[#0b2c5f]">
                Personal Information
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <p><b>Name:</b> {teacher.name}</p>
                <p><b>Father Name:</b> {teacher.fatherName}</p>
                <p><b>DOB:</b> {teacher.dob}</p>
                <p><b>Address:</b> {teacher.permanentAddress}</p>
              </div>
            </div>

            {/* School */}
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="text-2xl font-bold mb-4 text-[#0b2c5f]">
                School Information
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <p><b>School:</b> {teacher.schoolName}</p>
                <p><b>District:</b> {teacher.district}</p>
                <p><b>Level:</b> {teacher.level}</p>
                <p><b>Teacher Type:</b> {teacher.teacherType}</p>
              </div>
            </div>

            {/* Documents */}
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="text-2xl font-bold mb-4 text-[#0b2c5f]">
                Uploaded Documents
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => openDocument(teacher.citizenship)}
                  className="p-3 bg-blue-100 rounded-xl"
                >
                  Citizenship
                </button>

                <button
                  onClick={() => openDocument(teacher.degree)}
                  className="p-3 bg-blue-100 rounded-xl"
                >
                  Degree
                </button>

                <button
                  onClick={() => openDocument(teacher.transcript)}
                  className="p-3 bg-blue-100 rounded-xl"
                >
                  Transcript
                </button>

                <button
                  onClick={() => openDocument(teacher.teachingLicense)}
                  className="p-3 bg-blue-100 rounded-xl"
                >
                  License
                </button>
              </div>
            </div>

            {/* Change Request */}
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="text-2xl font-bold mb-4 text-[#0b2c5f]">
                Request Changes From Teacher
              </h2>

              <textarea
                value={changeMessage}
                onChange={(e) => setChangeMessage(e.target.value)}
                placeholder="Example: Please upload clearer citizenship document"
                className="w-full border rounded-xl p-4 h-32"
              />

              <button
                onClick={sendChangeRequest}
                className="mt-4 bg-yellow-500 text-white px-6 py-3 rounded-xl"
              >
                Send Change Request
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}