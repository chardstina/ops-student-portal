import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Card, Button, Input, Stat, Badge, money } from "../components/ui";

export default function Payments() {
  const qc = useQueryClient();
  const overview = useQuery({ queryKey: ["finance"], queryFn: async () => (await api.get("/payments/stats/overview")).data });
  const students = useQuery({ queryKey: ["students"], queryFn: async () => (await api.get("/students")).data });

  const [studentId, setStudentId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");

  const history = useQuery({
    queryKey: ["pay-history", studentId],
    queryFn: async () => (await api.get(`/payments/student/${studentId}`)).data,
    enabled: !!studentId,
  });

  const record = useMutation({
    mutationFn: async () => (await api.post("/payments", { studentId, amount: Number(amount), method })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance"] });
      qc.invalidateQueries({ queryKey: ["pay-history", studentId] });
      setAmount("");
    },
  });

  // --- Pending approvals ---
  const pending = useQuery({ queryKey: ["pending"], queryFn: async () => (await api.get("/payments/pending")).data });
  const decide = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "approve" | "reject" }) =>
      (await api.patch(`/payments/${id}/${action}`, {})).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pending"] });
      qc.invalidateQueries({ queryKey: ["finance"] });
    },
  });

  // --- Bank accounts ---
  const accounts = useQuery({ queryKey: ["accounts"], queryFn: async () => (await api.get("/accounts")).data });
  const [acct, setAcct] = useState<any>({ bankName: "", accountName: "", accountNumber: "" });
  const addAccount = useMutation({
    mutationFn: async () => (await api.post("/accounts", acct)).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["accounts"] }); setAcct({ bankName: "", accountName: "", accountNumber: "" }); },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Payments</h1>
      <div className="grid grid-cols-2 gap-4">
        <Stat label="Total Revenue" value={overview.data ? money(overview.data.totalRevenue) : "…"} />
        <Stat label="Total Outstanding" value={overview.data ? money(overview.data.totalOutstanding) : "…"} />
      </div>

      <Card title={`Pending Approvals${pending.data?.length ? ` (${pending.data.length})` : ""}`}>
        {pending.data?.length ? (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-slate-500"><th className="py-1">Date</th><th>Student</th><th>Amount</th><th>Paid Into</th><th>Proof</th><th>Action</th></tr></thead>
            <tbody>
              {pending.data.map((p: any) => (
                <tr key={p.id} className="border-t">
                  <td className="py-1">{new Date(p.createdAt).toLocaleDateString()}</td>
                  <td>{p.student.firstName} {p.student.lastName} <span className="text-xs text-slate-400">({p.student.id})</span></td>
                  <td>{money(p.amount)}</td>
                  <td>{p.account ? `${p.account.bankName} · ${p.account.accountNumber}` : "—"}</td>
                  <td>{p.proofUrl ? <a className="text-blue-600 underline" href={p.proofUrl} target="_blank">View</a> : "—"}</td>
                  <td className="space-x-3">
                    <button className="text-green-600" onClick={() => decide.mutate({ id: p.id, action: "approve" })}>Approve</button>
                    <button className="text-red-600" onClick={() => decide.mutate({ id: p.id, action: "reject" })}>Reject</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-slate-500">No payments awaiting approval.</p>
        )}
      </Card>

      <Card title="Record Payment">
        <div className="grid grid-cols-4 gap-3 items-end">
          <div>
            <label className="text-xs">Student</label>
            <select className="border rounded px-3 py-2 text-sm w-full" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
              <option value="">Select…</option>
              {students.data?.map((s: any) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.id})</option>)}
            </select>
          </div>
          <div><label className="text-xs">Amount</label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          <div>
            <label className="text-xs">Method</label>
            <select className="border rounded px-3 py-2 text-sm w-full" value={method} onChange={(e) => setMethod(e.target.value)}>
              <option>CASH</option><option>BANK_TRANSFER</option><option>CARD</option><option>STRIPE</option>
            </select>
          </div>
          <Button onClick={() => record.mutate()} disabled={!studentId || !amount || record.isPending}>Record + Receipt</Button>
        </div>
      </Card>

      {studentId && (
        <Card title="Payment History">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-slate-500"><th className="py-1">Date</th><th>Amount</th><th>Method</th><th>Status</th><th>Receipt</th></tr></thead>
            <tbody>
              {history.data?.map((p: any) => (
                <tr key={p.id} className="border-t">
                  <td className="py-1">{new Date(p.paidAt ?? p.createdAt).toLocaleDateString()}</td>
                  <td>{money(p.amount)}</td><td>{p.method}</td>
                  <td><Badge color={p.status === "PAID" ? "green" : p.status === "OVERDUE" || p.status === "REJECTED" ? "red" : p.status === "AWAITING_APPROVAL" ? "blue" : "yellow"}>{p.status.replace("_", " ")}</Badge></td>
                  <td>{p.receiptUrl ? <a className="text-blue-600 underline" href={p.receiptUrl} target="_blank">PDF</a> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Card title="Company Bank Accounts">
        <table className="w-full text-sm mb-4">
          <thead><tr className="text-left text-slate-500"><th className="py-1">Bank</th><th>Account Name</th><th>Account Number</th><th>Active</th></tr></thead>
          <tbody>
            {accounts.data?.map((a: any) => (
              <tr key={a.id} className="border-t">
                <td className="py-1">{a.bankName}</td><td>{a.accountName}</td><td className="font-mono">{a.accountNumber}</td>
                <td><Badge color={a.isActive ? "green" : "slate"}>{a.isActive ? "Yes" : "No"}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="grid grid-cols-4 gap-3 items-end">
          <div><label className="text-xs">Bank</label><Input value={acct.bankName} onChange={(e) => setAcct({ ...acct, bankName: e.target.value })} /></div>
          <div><label className="text-xs">Account Name</label><Input value={acct.accountName} onChange={(e) => setAcct({ ...acct, accountName: e.target.value })} /></div>
          <div><label className="text-xs">Account Number</label><Input value={acct.accountNumber} onChange={(e) => setAcct({ ...acct, accountNumber: e.target.value })} /></div>
          <Button onClick={() => addAccount.mutate()} disabled={!acct.bankName || !acct.accountNumber || addAccount.isPending}>Add Account</Button>
        </div>
      </Card>
    </div>
  );
}
