import { useState } from "react";
import { api } from "../lib/api";

export function PhotoUploader({
  value,
  onChange,
}: {
  value?: string;
  onChange: (url: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/uploads", fd);
      onChange(data.url);
    } catch {
      setError("Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {value ? (
        <img src={value} alt="" className="w-16 h-16 rounded-full object-cover border" />
      ) : (
        <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center text-xs text-slate-500">
          No photo
        </div>
      )}
      <div>
        <input type="file" accept="image/*" onChange={handleFile} className="text-xs" />
        {busy && <div className="text-xs text-slate-500">Uploading…</div>}
        {error && <div className="text-xs text-red-600">{error}</div>}
      </div>
    </div>
  );
}
