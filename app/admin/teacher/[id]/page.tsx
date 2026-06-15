"use client";

import { use, useEffect, useState } from "react";

type Teacher = {
  id: number;
  name: string;
  tokenNo: string;
  subject: string;
  phone?: string;
  email?: string;
  schoolName?: string;
  status?: string;
  photo?: string;
};

export default function TeacherDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params); // unwrap promise
  const id = resolvedParams.id;

  const [teacher, setTeacher] = useState<Teacher | null>(null);

  useEffect(() => {
    fetch(`http://127.0.0.1:8000/api/teacher/${id}/`)
      .then((res) => res.json())
      .then((data) => setTeacher(data))
      .catch((err) => console.error(err));
  }, [id]);

  if (!teacher) {
    return <div className="p-10">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-[#eef3fb] p-10">
      <div className="bg-white rounded-2xl shadow p-8 max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Teacher Details</h1>

        <p><b>Name:</b> {teacher.name}</p>
        <p><b>Token:</b> {teacher.tokenNo}</p>
        <p><b>Subject:</b> {teacher.subject}</p>
        <p><b>Phone:</b> {teacher.phone}</p>
        <p><b>Email:</b> {teacher.email}</p>
        <p><b>School:</b> {teacher.schoolName}</p>
        <p><b>Status:</b> {teacher.status}</p>
      </div>
    </div>
  );
}