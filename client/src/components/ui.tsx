import { ReactNode } from "react";

export function Card({ title, children, actions }: { title?: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="bg-white rounded-lg border p-5 shadow-sm">
      {(title || actions) && (
        <div className="flex items-center justify-between mb-4">
          {title && <h2 className="font-semibold text-lg">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}

export function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-lg border p-5 shadow-sm">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}

const badgeColors: Record<string, string> = {
  slate: "bg-slate-100 text-slate-700",
  green: "bg-green-100 text-green-700",
  red: "bg-red-100 text-red-700",
  yellow: "bg-yellow-100 text-yellow-700",
  blue: "bg-blue-100 text-blue-700",
};

export function Badge({ children, color = "slate" }: { children: ReactNode; color?: string }) {
  return <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${badgeColors[color] ?? badgeColors.slate}`}>{children}</span>;
}

export function Button({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`bg-slate-900 text-white px-4 py-2 rounded text-sm hover:bg-slate-700 disabled:opacity-50 ${props.className ?? ""}`}
    >
      {children}
    </button>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`border rounded px-3 py-2 text-sm w-full ${props.className ?? ""}`} />;
}

export function money(n: number | string) {
  return Number(n).toLocaleString("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 2 });
}
