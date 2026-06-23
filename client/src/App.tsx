import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth, Role } from "./lib/auth";
import { Layout } from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import StudentDetail from "./pages/StudentDetail";
import Courses from "./pages/Courses";
import Payments from "./pages/Payments";
import Enquiries from "./pages/Enquiries";
import Expenses from "./pages/Expenses";
import Users from "./pages/Users";
import MyDashboard from "./pages/MyDashboard";
import { ReactNode } from "react";

function Protected({ children, roles }: { children: ReactNode; roles?: Role[] }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  const { user } = useAuth();
  const staff: Role[] = ["ADMIN", "OPERATIONS", "FINANCE"];
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={user?.role === "STUDENT" ? <MyDashboard /> : <Dashboard />} />
        <Route path="students" element={<Protected roles={staff}><Students /></Protected>} />
        <Route path="students/:id" element={<Protected><StudentDetail /></Protected>} />
        <Route path="courses" element={<Protected roles={staff}><Courses /></Protected>} />
        <Route path="payments" element={<Protected roles={["ADMIN", "FINANCE"]}><Payments /></Protected>} />
        <Route path="enquiries" element={<Protected roles={staff}><Enquiries /></Protected>} />
        <Route path="expenses" element={<Protected roles={["ADMIN", "FINANCE"]}><Expenses /></Protected>} />
        <Route path="users" element={<Protected roles={["ADMIN"]}><Users /></Protected>} />
      </Route>
    </Routes>
  );
}
