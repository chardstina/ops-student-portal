import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth, Role } from "../lib/auth";

const nav: { to: string; label: string; roles?: Role[] }[] = [
  { to: "/", label: "Dashboard" },
  { to: "/students", label: "Students", roles: ["ADMIN", "OPERATIONS", "FINANCE"] },
  { to: "/courses", label: "Courses", roles: ["ADMIN", "OPERATIONS", "FINANCE"] },
  { to: "/payments", label: "Payments", roles: ["ADMIN", "FINANCE"] },
  { to: "/enquiries", label: "Enquiries", roles: ["ADMIN", "OPERATIONS", "FINANCE"] },
  { to: "/expenses", label: "Expenses", roles: ["ADMIN", "FINANCE"] },
  { to: "/users", label: "Users", roles: ["ADMIN"] },
];

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const items = nav.filter((n) => !n.roles || (user && n.roles.includes(user.role)));

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-slate-900 text-white px-6 py-3 flex items-center justify-between">
        <div className="font-semibold">🎓 NIIT PORTAL</div>
        <div className="flex items-center gap-4 text-sm">
          <span className="opacity-80">{user?.name} · {user?.role}</span>
          <button
            onClick={() => { logout(); navigate("/login"); }}
            className="bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded"
          >
            Logout
          </button>
        </div>
      </header>
      <div className="flex flex-1">
        <aside className="w-52 bg-white border-r p-4 space-y-1">
          {items.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === "/"}
              className={({ isActive }) =>
                `block px-3 py-2 rounded text-sm ${isActive ? "bg-slate-900 text-white" : "hover:bg-slate-100"}`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </aside>
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
