import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Card, Button, Input, Badge } from "../components/ui";
import { PhotoUploader } from "../components/PhotoUploader";
import { useAuth } from "../lib/auth";

export default function Students() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState(false);

  const courses = useQuery({ queryKey: ["courses"], queryFn: async () => (await api.get("/courses")).data });
  const students = useQuery({
    queryKey: ["students"],
    queryFn: async () => (await api.get("/students")).data,
  });

  // Instant client-side search + status filter
  const term = q.trim().toLowerCase();
  const filtered = (students.data ?? []).filter((s: any) => {
    if (status && s.status !== status) return false;
    if (!term) return true;
    return [s.firstName, s.lastName, `${s.firstName} ${s.lastName}`, s.email, s.phone, s.id, s.course?.name]
      .filter(Boolean)
      .some((v: string) => String(v).toLowerCase().includes(term));
  });

  const [form, setForm] = useState<any>({ firstName: "", lastName: "", email: "", phone: "", dateOfBirth: "", courseId: "", batch: "", sponsorName: "", sponsorContact: "", passportPhotoUrl: "", password: "" });
  const [created, setCreated] = useState<any>(null);
  const create = useMutation({
    mutationFn: async () => {
      const payload: any = { ...form, dateOfBirth: new Date(form.dateOfBirth) };
      // Drop empty optional fields so server-side URL/validation passes
      ["passportPhotoUrl", "sponsorName", "sponsorContact", "password"].forEach((k) => { if (!payload[k]) delete payload[k]; });
      return (await api.post("/students", payload)).data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["students"] });
      setCreated(data.loginInfo);
      setOpen(false);
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/students/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["students"] }),
  });

  function exportCsv() {
    const rows = filtered;
    const header = ["id", "firstName", "lastName", "email", "phone", "course", "batch", "status"];
    const csv = [header.join(","), ...rows.map((s: any) =>
      [s.id, s.firstName, s.lastName, s.email, s.phone, s.course?.name, s.batch, s.status].join(",")
    )].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = "students.csv"; a.click();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Students</h1>
        <div className="flex gap-2">
          <Button onClick={exportCsv} className="bg-slate-600">Export CSV</Button>
          <Button onClick={() => setOpen(!open)}>{open ? "Close" : "+ New Student"}</Button>
        </div>
      </div>

      {created && (
        <div className="bg-green-50 border border-green-300 rounded p-4 text-sm">
          <div className="font-semibold text-green-800">Student registered. Login created:</div>
          <div className="mt-1">Email: <span className="font-mono">{created.email}</span></div>
          <div>Password: <span className="font-mono">{created.password}</span></div>
          <div className="text-xs text-green-700 mt-1">Share these with the student so they can sign in. They should change the password after first login.</div>
          <button className="text-xs underline mt-1" onClick={() => setCreated(null)}>Dismiss</button>
        </div>
      )}

      {open && (
        <Card title="Register Student">
          <div className="mb-4">
            <label className="text-xs block mb-1">Passport Photograph</label>
            <PhotoUploader value={form.passportPhotoUrl} onChange={(url) => setForm({ ...form, passportPhotoUrl: url })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {(["firstName", "lastName", "email", "phone", "batch", "sponsorName", "sponsorContact"] as const).map((f) => (
              <div key={f}>
                <label className="text-xs capitalize">{f}</label>
                <Input value={form[f]} onChange={(e) => setForm({ ...form, [f]: e.target.value })} />
              </div>
            ))}
            <div>
              <label className="text-xs">Date of Birth</label>
              <Input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
            </div>
            <div>
              <label className="text-xs">Course</label>
              <select className="border rounded px-3 py-2 text-sm w-full" value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })}>
                <option value="">Select…</option>
                {courses.data?.map((c: any) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs">Login Password (optional)</label>
              <Input type="text" placeholder="Default: Student123!" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
          </div>
          {create.isError && <div className="text-red-600 text-sm mt-2">{(create.error as any)?.response?.data?.error ?? "Error"}</div>}
          <div className="mt-3"><Button onClick={() => create.mutate()} disabled={create.isPending}>Save</Button></div>
        </Card>
      )}

      <Card>
        <div className="flex gap-3 mb-4">
          <Input placeholder="Search name, email, phone, ID…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="border rounded px-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="GRADUATED">Graduated</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          {q && <button className="text-xs text-slate-500 underline" onClick={() => setQ("")}>Clear</button>}
        </div>
        <div className="text-xs text-slate-500 mb-2">{filtered.length} of {students.data?.length ?? 0} students</div>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-slate-500"><th className="py-1">ID</th><th>Name</th><th>Course</th><th>Batch</th><th>Status</th>{isAdmin && <th></th>}</tr></thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={isAdmin ? 6 : 5} className="py-4 text-center text-slate-400">No students match your search.</td></tr>
            )}
            {filtered.map((s: any) => (
              <tr key={s.id} className="border-t hover:bg-slate-50">
                <td className="py-2"><Link className="text-blue-600 underline font-mono" to={`/students/${s.id}`}>{s.id}</Link></td>
                <td>{s.firstName} {s.lastName}</td>
                <td>{s.course?.name}</td>
                <td>{s.batch}</td>
                <td><Badge color={s.status === "ACTIVE" ? "green" : s.status === "GRADUATED" ? "blue" : "slate"}>{s.status}</Badge></td>
                {isAdmin && (
                  <td>
                    <button
                      className="text-red-600 text-xs"
                      onClick={() => { if (confirm(`Delete student ${s.firstName} ${s.lastName}? This removes their payments too.`)) del.mutate(s.id); }}
                    >
                      Delete
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
