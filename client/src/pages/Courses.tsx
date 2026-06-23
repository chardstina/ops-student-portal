import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Card, Button, Input, Badge, money } from "../components/ui";

export default function Courses() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const canEdit = user?.role === "ADMIN" || user?.role === "FINANCE";
  const courses = useQuery({ queryKey: ["courses"], queryFn: async () => (await api.get("/courses")).data });

  const [form, setForm] = useState<any>({ name: "", code: "", durationMonths: 6, price: 0, discountPrice: "" });
  const create = useMutation({
    mutationFn: async () => (await api.post("/courses", {
      name: form.name, code: form.code.toUpperCase(), durationMonths: Number(form.durationMonths),
      price: Number(form.price), discountPrice: form.discountPrice && Number(form.discountPrice) > 0 ? Number(form.discountPrice) : null,
    })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["courses"] }),
  });

  const update = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: any }) => (await api.patch(`/courses/${id}`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["courses"] }),
  });

  const [edits, setEdits] = useState<Record<string, { price: string; discountPrice: string }>>({});
  function editVal(c: any, field: "price" | "discountPrice") {
    return edits[c.id]?.[field] ?? String(field === "discountPrice" ? (c.discountPrice ?? "") : c[field]);
  }
  function setEdit(c: any, field: "price" | "discountPrice", v: string) {
    setEdits((p) => ({
      ...p,
      [c.id]: { price: editVal(c, "price"), discountPrice: editVal(c, "discountPrice"), [field]: v },
    }));
  }
  function saveRow(c: any) {
    const e = edits[c.id];
    if (!e) return;
    const discountNum = Number(e.discountPrice);
    update.mutate({
      id: c.id,
      body: { price: Number(e.price), discountPrice: e.discountPrice && discountNum > 0 ? discountNum : null },
    });
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Courses & Pricing</h1>
      {canEdit && (
        <Card title="Add Course">
          <div className="grid grid-cols-5 gap-3 items-end">
            <div><label className="text-xs">Name</label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><label className="text-xs">Code</label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
            <div><label className="text-xs">Months</label><Input type="number" value={form.durationMonths} onChange={(e) => setForm({ ...form, durationMonths: e.target.value })} /></div>
            <div><label className="text-xs">Price</label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
            <div><label className="text-xs">Discount</label><Input type="number" value={form.discountPrice} onChange={(e) => setForm({ ...form, discountPrice: e.target.value })} /></div>
          </div>
          {create.isError && <div className="text-red-600 text-sm mt-2">{(create.error as any)?.response?.data?.error ?? "Error"}</div>}
          <div className="mt-3"><Button onClick={() => create.mutate()} disabled={create.isPending}>Add</Button></div>
        </Card>
      )}
      <Card>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-slate-500"><th className="py-1">Code</th><th>Name</th><th>Duration</th><th>Price (₦)</th><th>Discount (₦)</th><th>Active</th>{canEdit && <th></th>}</tr></thead>
          <tbody>
            {courses.data?.map((c: any) => (
              <tr key={c.id} className="border-t align-middle">
                <td className="py-2 font-mono">{c.code}</td><td>{c.name}</td><td>{c.durationMonths} mo</td>
                {canEdit ? (
                  <>
                    <td><input type="number" className="border rounded px-2 py-1 w-28 text-sm" value={editVal(c, "price")} onChange={(e) => setEdit(c, "price", e.target.value)} /></td>
                    <td><input type="number" placeholder="none" className="border rounded px-2 py-1 w-28 text-sm" value={editVal(c, "discountPrice")} onChange={(e) => setEdit(c, "discountPrice", e.target.value)} /></td>
                  </>
                ) : (
                  <>
                    <td>{money(c.price)}</td><td>{c.discountPrice ? money(c.discountPrice) : "—"}</td>
                  </>
                )}
                <td><Badge color={c.isActive ? "green" : "slate"}>{c.isActive ? "Yes" : "No"}</Badge></td>
                {canEdit && (
                  <td>
                    <button className="text-blue-600 text-xs disabled:opacity-40" disabled={!edits[c.id] || update.isPending} onClick={() => saveRow(c)}>Save</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {canEdit
          ? <p className="text-xs text-slate-500 mt-3">Edit a course's price/discount and click Save. The student's billed amount and outstanding balance use the discounted price when set, otherwise the full price.</p>
          : <p className="text-xs text-slate-500 mt-3">Pricing edits are restricted to Admin and Finance roles.</p>}
      </Card>
    </div>
  );
}
