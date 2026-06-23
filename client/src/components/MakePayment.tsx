import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Card, Button, Input } from "./ui";

function ProofUploader({ value, onChange }: { value?: string; onChange: (url: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  async function handle(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/uploads", fd);
      onChange(data.url);
      setName(file.name);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <input type="file" accept="image/*,application/pdf" onChange={handle} className="text-xs" />
      {busy && <span className="text-xs text-slate-500 ml-2">Uploading…</span>}
      {value && !busy && <span className="text-xs text-green-600 ml-2">✓ {name || "uploaded"}</span>}
    </div>
  );
}

export function MakePayment({ studentId }: { studentId: string }) {
  const qc = useQueryClient();
  const accounts = useQuery({ queryKey: ["accounts"], queryFn: async () => (await api.get("/accounts")).data });

  const [accountId, setAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [done, setDone] = useState(false);

  const submit = useMutation({
    mutationFn: async () => (await api.post("/payments/submit", { amount: Number(amount), accountId, proofUrl })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["student-dashboard", studentId] });
      setAmount(""); setProofUrl(""); setAccountId(""); setDone(true);
      setTimeout(() => setDone(false), 4000);
    },
  });

  const selected = accounts.data?.find((a: any) => a.id === accountId);

  return (
    <Card title="Make a Payment">
      <p className="text-sm text-slate-500 mb-3">
        Transfer to one of the company accounts below, then upload your proof of payment. Your payment shows as
        <strong> Awaiting approval</strong> until the finance team verifies it.
      </p>

      <div className="grid md:grid-cols-3 gap-3 mb-4">
        {accounts.data?.map((a: any) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setAccountId(a.id)}
            className={`text-left border rounded p-3 ${accountId === a.id ? "border-slate-900 ring-1 ring-slate-900" : "hover:border-slate-400"}`}
          >
            <div className="font-semibold text-sm">{a.bankName}</div>
            <div className="text-lg font-mono tracking-wide">{a.accountNumber}</div>
            <div className="text-xs text-slate-500">{a.accountName}</div>
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-3 items-end">
        <div>
          <label className="text-xs">Paying into</label>
          <select className="border rounded px-3 py-2 text-sm w-full" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="">Select account…</option>
            {accounts.data?.map((a: any) => <option key={a.id} value={a.id}>{a.bankName} — {a.accountNumber}</option>)}
          </select>
        </div>
        <div><label className="text-xs">Amount (₦)</label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
        <div><label className="text-xs">Proof of payment</label><ProofUploader value={proofUrl} onChange={setProofUrl} /></div>
      </div>

      {selected && <p className="text-xs text-slate-500 mt-2">You selected: {selected.bankName} · {selected.accountNumber} ({selected.accountName})</p>}
      {submit.isError && <div className="text-red-600 text-sm mt-2">{(submit.error as any)?.response?.data?.error ?? "Submission failed"}</div>}
      {done && <div className="text-green-600 text-sm mt-2">Payment submitted — awaiting approval.</div>}

      <div className="mt-3">
        <Button onClick={() => submit.mutate()} disabled={!accountId || !amount || !proofUrl || submit.isPending}>
          {submit.isPending ? "Submitting…" : "Submit Payment"}
        </Button>
      </div>
    </Card>
  );
}
