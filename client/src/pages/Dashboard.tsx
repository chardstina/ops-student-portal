import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Card, Stat, money } from "../components/ui";

const COLORS = ["#0f172a", "#64748b", "#94a3b8", "#cbd5e1"];

export default function Dashboard() {
  const { user } = useAuth();
  const canSeeRevenue = user?.role === "ADMIN" || user?.role === "FINANCE";
  const finance = useQuery({
    queryKey: ["finance"],
    queryFn: async () => (await api.get("/payments/stats/overview")).data,
    enabled: canSeeRevenue,
  });
  const conv = useQuery({ queryKey: ["conv"], queryFn: async () => (await api.get("/enquiries/stats/conversion")).data });
  const students = useQuery({ queryKey: ["students-all"], queryFn: async () => (await api.get("/students")).data });

  const statusCounts = (students.data ?? []).reduce((acc: Record<string, number>, s: any) => {
    acc[s.status] = (acc[s.status] ?? 0) + 1;
    return acc;
  }, {});
  const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
  const convData = Object.entries(conv.data?.counts ?? {}).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Operations Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {canSeeRevenue && <Stat label="Total Revenue" value={finance.data ? money(finance.data.totalRevenue) : "…"} />}
        {canSeeRevenue && <Stat label="Outstanding" value={finance.data ? money(finance.data.totalOutstanding) : "…"} />}
        <Stat label="Students" value={students.data?.length ?? "…"} />
        <Stat label="Conversion Rate" value={conv.data ? `${Math.round(conv.data.conversionRate * 100)}%` : "…"} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="Students by Status">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" outerRadius={90} label>
                {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Enquiries by Status">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={convData}>
              <XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip />
              <Bar dataKey="value" fill="#0f172a" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
