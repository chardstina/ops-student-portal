import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Card, Button, Input, Badge } from "../components/ui";

const roles = ["ADMIN", "OPERATIONS", "FINANCE", "STUDENT"];
const roleColor: Record<string, string> = { ADMIN: "red", OPERATIONS: "blue", FINANCE: "green", STUDENT: "slate" };

export default function Users() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const users = useQuery({ queryKey: ["users"], queryFn: async () => (await api.get("/users")).data });

  const [form, setForm] = useState<any>({ name: "", email: "", password: "", role: "OPERATIONS" });
  const create = useMutation({
    mutationFn: async () => (await api.post("/users", form)).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); setForm({ name: "", email: "", password: "", role: "OPERATIONS" }); },
  });
  const changeRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => (await api.patch(`/users/${id}/role`, { role })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
  const del = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/users/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
    onError: (e: any) => alert(e?.response?.data?.error ?? "Delete failed"),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">User Management</h1>
      <p className="text-sm text-slate-500">Admins have the highest privilege and can create, re-role, and delete users.</p>

      <Card title="Add User">
        <div className="grid grid-cols-4 gap-3 items-end">
          <div><label className="text-xs">Name</label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="text-xs">Email</label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><label className="text-xs">Password</label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
          <div>
            <label className="text-xs">Role</label>
            <select className="border rounded px-3 py-2 text-sm w-full" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {roles.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
        </div>
        {create.isError && <div className="text-red-600 text-sm mt-2">{(create.error as any)?.response?.data?.error ?? "Error"}</div>}
        <div className="mt-3"><Button onClick={() => create.mutate()} disabled={create.isPending || !form.name || !form.email || form.password.length < 6}>Create User</Button></div>
      </Card>

      <Card>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-slate-500"><th className="py-1">Name</th><th>Email</th><th>Role</th><th>Created</th><th></th></tr></thead>
          <tbody>
            {users.data?.map((u: any) => (
              <tr key={u.id} className="border-t">
                <td className="py-2">{u.name}{u.id === user?.id && <span className="text-xs text-slate-400"> (you)</span>}</td>
                <td>{u.email}</td>
                <td>
                  <select className="border rounded px-2 py-1 text-xs" value={u.role} disabled={u.id === user?.id}
                    onChange={(e) => changeRole.mutate({ id: u.id, role: e.target.value })}>
                    {roles.map((r) => <option key={r}>{r}</option>)}
                  </select>
                  <span className="ml-2"><Badge color={roleColor[u.role]}>{u.role}</Badge></span>
                </td>
                <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                <td>
                  {u.id !== user?.id && (
                    <button className="text-red-600 text-xs" onClick={() => { if (confirm(`Delete user ${u.name}?`)) del.mutate(u.id); }}>
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
