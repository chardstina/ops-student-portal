import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Card, Stat, Badge, money } from "./ui";
import { PhotoUploader } from "./PhotoUploader";
import { useAuth } from "../lib/auth";

const statusColor: Record<string, string> = { PAID: "green", PENDING: "yellow", OVERDUE: "red", AWAITING_APPROVAL: "blue", REJECTED: "red" };
const statusLabel: Record<string, string> = { AWAITING_APPROVAL: "AWAITING APPROVAL" };

export function StudentDashboardView({ studentId }: { studentId: string }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const canEditPhoto = user?.role === "ADMIN" || user?.role === "OPERATIONS";
  const { data, isLoading } = useQuery({
    queryKey: ["student-dashboard", studentId],
    queryFn: async () => (await api.get(`/students/${studentId}/dashboard`)).data,
  });
  const setPhoto = useMutation({
    mutationFn: async (url: string) => (await api.patch(`/students/${studentId}`, { passportPhotoUrl: url })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["student-dashboard", studentId] }),
  });

  if (isLoading) return <div>Loading…</div>;
  if (!data) return <div>Not found</div>;
  const { student, summary } = data;

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center gap-5">
          {student.passportPhotoUrl ? (
            <img src={student.passportPhotoUrl} alt="" className="w-20 h-20 rounded-full object-cover border" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-slate-200 flex items-center justify-center text-2xl">
              {student.firstName[0]}{student.lastName[0]}
            </div>
          )}
          <div>
            <h2 className="text-xl font-bold">{student.firstName} {student.lastName}</h2>
            <div className="text-sm text-slate-500">{student.id} · {student.course.name} · Batch {student.batch}</div>
            <div className="text-sm">{student.email} · {student.phone}</div>
            <div className="text-sm text-slate-500">
              Sponsor: {student.sponsorName ?? "—"} {student.sponsorContact ? `(${student.sponsorContact})` : ""}
            </div>
            <div className="mt-1"><Badge color={student.status === "ACTIVE" ? "green" : "slate"}>{student.status}</Badge></div>
          </div>
        </div>
        {canEditPhoto && (
          <div className="mt-4 pt-4 border-t">
            <label className="text-xs block mb-1 text-slate-500">Update passport photograph</label>
            <PhotoUploader value={student.passportPhotoUrl ?? undefined} onChange={(url) => setPhoto.mutate(url)} />
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Stat label="Total Billed" value={money(summary.totalBilled)} />
        <Stat label="Total Paid" value={money(summary.totalPaid)} />
        <Stat label="Outstanding" value={money(summary.outstanding)} />
      </div>

      <Card title="Duration">
        <div className="text-sm">
          Start: {new Date(student.startDate).toLocaleDateString()} · Expected completion:{" "}
          {student.completionDate ? new Date(student.completionDate).toLocaleDateString() : `${student.course.durationMonths} months`}
        </div>
      </Card>

      {student.installmentPlan && (
        <Card title="Installment Plan">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-slate-500"><th className="py-1">Due Date</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody>
              {student.installmentPlan.installments.map((i: any) => (
                <tr key={i.id} className="border-t">
                  <td className="py-1">{new Date(i.dueDate).toLocaleDateString()}</td>
                  <td>{money(i.amount)}</td>
                  <td><Badge color={i.paid ? "green" : "yellow"}>{i.paid ? "PAID" : "DUE"}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Card title="Payment History">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-slate-500"><th className="py-1">Date</th><th>Amount</th><th>Method</th><th>Status</th><th>Proof</th><th>Receipt</th></tr></thead>
          <tbody>
            {student.payments.map((p: any) => (
              <tr key={p.id} className="border-t">
                <td className="py-1">{new Date(p.paidAt ?? p.createdAt).toLocaleDateString()}</td>
                <td>{money(p.amount)}</td>
                <td>{p.method}</td>
                <td><Badge color={statusColor[p.status] ?? "slate"}>{statusLabel[p.status] ?? p.status}</Badge></td>
                <td>{p.proofUrl ? <a className="text-blue-600 underline" href={p.proofUrl} target="_blank">View</a> : "—"}</td>
                <td>{p.receiptUrl ? <a className="text-blue-600 underline" href={p.receiptUrl} target="_blank">PDF</a> : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
