import { useAuth } from "../lib/auth";
import { StudentDashboardView } from "../components/StudentDashboardView";
import { MakePayment } from "../components/MakePayment";

export default function MyDashboard() {
  const { user } = useAuth();
  if (!user?.student) return <div>No student record linked to your account.</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome, {user.name.split(" ")[0]}</h1>
        <p className="text-sm text-slate-500">Here's your account, fees, and payment options.</p>
      </div>
      <StudentDashboardView studentId={user.student.id} />
      <MakePayment studentId={user.student.id} />
    </div>
  );
}
