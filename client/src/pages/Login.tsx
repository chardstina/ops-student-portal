import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { Button, Input } from "../components/ui";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@institute.test");
  const [password, setPassword] = useState("Password123!");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(email, password);
      navigate("/");
    } catch {
      setError("Invalid email or password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <form onSubmit={submit} className="bg-white p-8 rounded-lg shadow w-96 space-y-4">
        <h1 className="text-xl font-bold text-center">🎓 NIIT PORTAL</h1>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <div>
          <label className="text-sm">Email</label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
        </div>
        <div>
          <label className="text-sm">Password</label>
          <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
        </div>
        <Button type="submit" disabled={busy} className="w-full">{busy ? "Signing in…" : "Sign in"}</Button>
        <p className="text-xs text-slate-500 text-center">
          Seed logins: admin@ / ops@ / finance@ / jane@student.test · Password123!
        </p>
      </form>
    </div>
  );
}
