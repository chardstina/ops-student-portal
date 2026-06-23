import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Card, Button, Input, Stat, Badge } from "../components/ui";

const statuses = ["NEW", "CONTACTED", "CONVERTED", "LOST"];
const statusColor: Record<string, string> = { NEW: "blue", CONTACTED: "yellow", CONVERTED: "green", LOST: "red" };

export default function Enquiries() {
  const qc = useQueryClient();
  const enquiries = useQuery({ queryKey: ["enquiries"], queryFn: async () => (await api.get("/enquiries")).data });
  const conv = useQuery({ queryKey: ["conv"], queryFn: async () => (await api.get("/enquiries/stats/conversion")).data });

  const [form, setForm] = useState<any>({ name: "", contact: "", courseInterest: "", source: "WALK_IN", nextFollowUpDate: "" });
  const create = useMutation({
    mutationFn: async () => (await api.post("/enquiries", { ...form, nextFollowUpDate: form.nextFollowUpDate ? new Date(form.nextFollowUpDate) : undefined })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["enquiries"] }),
  });
  const update = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => (await api.patch(`/enquiries/${id}`, { status })).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["enquiries"] }); qc.invalidateQueries({ queryKey: ["conv"] }); },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Enquiries</h1>
      <div className="grid grid-cols-2 gap-4">
        <Stat label="Total Enquiries" value={conv.data?.total ?? "…"} />
        <Stat label="Conversion Rate" value={conv.data ? `${Math.round(conv.data.conversionRate * 100)}%` : "…"} />
      </div>

      <Card title="New Enquiry">
        <div className="grid grid-cols-5 gap-3 items-end">
          <div><label className="text-xs">Name</label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="text-xs">Contact</label><Input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} /></div>
          <div><label className="text-xs">Course Interest</label><Input value={form.courseInterest} onChange={(e) => setForm({ ...form, courseInterest: e.target.value })} /></div>
          <div>
            <label className="text-xs">Source</label>
            <select className="border rounded px-3 py-2 text-sm w-full" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
              <option>WEBSITE</option><option>WALK_IN</option><option>CALL</option>
            </select>
          </div>
          <div><label className="text-xs">Follow-up</label><Input type="date" value={form.nextFollowUpDate} onChange={(e) => setForm({ ...form, nextFollowUpDate: e.target.value })} /></div>
        </div>
        <div className="mt-3"><Button onClick={() => create.mutate()} disabled={create.isPending}>Add</Button></div>
      </Card>

      <Card>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-slate-500"><th className="py-1">Name</th><th>Contact</th><th>Interest</th><th>Source</th><th>Follow-up</th><th>Status</th></tr></thead>
          <tbody>
            {enquiries.data?.map((e: any) => (
              <tr key={e.id} className="border-t">
                <td className="py-2">{e.name}</td><td>{e.contact}</td><td>{e.courseInterest ?? "—"}</td><td>{e.source}</td>
                <td>{e.nextFollowUpDate ? new Date(e.nextFollowUpDate).toLocaleDateString() : "—"}</td>
                <td>
                  <select className="border rounded px-2 py-1 text-xs" value={e.status} onChange={(ev) => update.mutate({ id: e.id, status: ev.target.value })}>
                    {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <span className="ml-2"><Badge color={statusColor[e.status]}>{e.status}</Badge></span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
