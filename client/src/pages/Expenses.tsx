import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Card, Button, Input, Badge, money } from "../components/ui";

const statusColor: Record<string, string> = { PENDING: "yellow", APPROVED: "green", REJECTED: "red" };

export default function Expenses() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const canDecide = user?.role === "ADMIN" || user?.role === "FINANCE";

  const expenses = useQuery({ queryKey: ["expenses"], queryFn: async () => (await api.get("/expenses")).data });
  const report = useQuery({ queryKey: ["bva"], queryFn: async () => (await api.get("/expenses/reports/budget-vs-actual")).data });

  const [form, setForm] = useState<any>({ category: "", amount: "", description: "" });
  const create = useMutation({
    mutationFn: async () => (await api.post("/expenses", { category: form.category, amount: Number(form.amount), description: form.description })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses"] }),
  });
  const decide = useMutation({
    mutationFn: async ({ id, decision }: { id: string; decision: string }) => (await api.patch(`/expenses/${id}/decision`, { decision })).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["expenses"] }); qc.invalidateQueries({ queryKey: ["bva"] }); },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Expenses</h1>

      <Card title="Log Expense">
        <div className="grid grid-cols-4 gap-3 items-end">
          <div><label className="text-xs">Category</label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
          <div><label className="text-xs">Amount</label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
          <div><label className="text-xs">Description</label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <Button onClick={() => create.mutate()} disabled={create.isPending}>Submit</Button>
        </div>
      </Card>

      {report.data?.length > 0 && (
        <Card title="Budget vs Actual">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-slate-500"><th className="py-1">Category</th><th>Period</th><th>Allocated</th><th>Actual</th><th>Remaining</th></tr></thead>
            <tbody>
              {report.data.map((r: any, i: number) => (
                <tr key={i} className="border-t">
                  <td className="py-1">{r.category}</td><td>{r.period}</td><td>{money(r.allocated)}</td><td>{money(r.actual)}</td>
                  <td className={r.remaining < 0 ? "text-red-600" : ""}>{money(r.remaining)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Card title="Expense Log">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-slate-500"><th className="py-1">Date</th><th>Category</th><th>Amount</th><th>By</th><th>Status</th>{canDecide && <th>Action</th>}</tr></thead>
          <tbody>
            {expenses.data?.map((e: any) => (
              <tr key={e.id} className="border-t">
                <td className="py-2">{new Date(e.createdAt).toLocaleDateString()}</td>
                <td>{e.category}</td><td>{money(e.amount)}</td><td>{e.createdBy?.name}</td>
                <td><Badge color={statusColor[e.status]}>{e.status}</Badge></td>
                {canDecide && (
                  <td className="space-x-2">
                    {e.status === "PENDING" && (
                      <>
                        <button className="text-green-600" onClick={() => decide.mutate({ id: e.id, decision: "APPROVED" })}>Approve</button>
                        <button className="text-red-600" onClick={() => decide.mutate({ id: e.id, decision: "REJECTED" })}>Reject</button>
                      </>
                    )}
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
