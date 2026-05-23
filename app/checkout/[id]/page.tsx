"use client";
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";

type Reservation = { id: string; stockId: string; quantity: number; status: "pending"|"confirmed"|"released"; expiresAt: string };

export default function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/reservations/${id}/peek`)
      .then((r) => { if (r.status === 404) { setNotFound(true); return null; } return r.json(); })
      .then((d) => { if (d) setReservation(d); })
      .catch(() => setNotFound(true));
  }, [id]);

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  if (notFound) return <main className="max-w-md mx-auto px-4 py-10"><p className="text-gray-500">Reservation not found.</p><button onClick={() => router.push("/")} className="mt-4 text-sm underline">Back to store</button></main>;
  if (!reservation) return <main className="max-w-md mx-auto px-4 py-10"><p className="text-gray-400 text-sm">Loading…</p></main>;

  const remainingMs = new Date(reservation.expiresAt).getTime() - now;
  const isExpired = remainingMs <= 0;
  const mins = Math.max(0, Math.floor(remainingMs / 60000));
  const secs = Math.max(0, Math.floor((remainingMs % 60000) / 1000));

  const confirm = async () => {
    setBusy(true); setError(null);
    const res = await fetch(`/api/reservations/${id}/confirm`, { method: "POST" });
    if (res.status === 410) { setError("Reservation expired. Please start over."); setReservation((r) => r ? { ...r, status: "released" } : r); }
    else if (res.ok) { setReservation(await res.json()); }
    else { setError(`Error ${res.status}.`); }
    setBusy(false);
  };

  const cancel = async () => {
    setBusy(true);
    const res = await fetch(`/api/reservations/${id}/release`, { method: "POST" });
    if (res.ok) setReservation(await res.json());
    setBusy(false);
  };

  return (
    <main className="max-w-md mx-auto px-4 py-10">
      <button onClick={() => router.push("/")} className="text-sm text-gray-400 hover:text-gray-700 mb-6">← Back to store</button>
      <h1 className="text-2xl font-semibold mb-1">Checkout</h1>
      <p className="text-xs text-gray-400 font-mono mb-6">ID: {id}</p>

      {reservation.status === "pending" && !isExpired && (
        <div className="mb-6 p-5 rounded-xl bg-blue-50 border border-blue-100">
          <p className="text-xs text-blue-500 mb-1 font-medium uppercase tracking-wide">Hold expires in</p>
          <p className="text-4xl font-mono font-bold text-blue-700 tabular-nums">{String(mins).padStart(2,"0")}:{String(secs).padStart(2,"0")}</p>
          <p className="text-xs text-blue-400 mt-1">{reservation.quantity} unit(s) reserved</p>
        </div>
      )}

      {reservation.status === "confirmed" && (
        <div className="mb-6 p-5 rounded-xl bg-green-50 border border-green-100">
          <p className="font-semibold text-green-700">Order confirmed!</p>
          <p className="text-sm text-green-600 mt-1">Payment accepted. Your item is on the way.</p>
        </div>
      )}

      {(reservation.status === "released" || (reservation.status === "pending" && isExpired)) && (
        <div className="mb-6 p-5 rounded-xl bg-gray-50 border border-gray-200">
          <p className="font-medium text-gray-700">Reservation no longer active</p>
          <p className="text-sm text-gray-500 mt-1">Units returned to stock.</p>
          <button onClick={() => router.push("/")} className="mt-3 text-sm underline text-gray-500">Browse again</button>
        </div>
      )}

      {error && <div className="mb-4 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}

      {reservation.status === "pending" && !isExpired && (
        <div className="flex gap-3">
          <button onClick={confirm} disabled={busy} className="flex-1 py-3 rounded-xl bg-black text-white font-medium disabled:bg-gray-200 hover:bg-gray-800 transition-colors">
            {busy ? "Processing…" : "Confirm purchase"}
          </button>
          <button onClick={cancel} disabled={busy} className="px-5 py-3 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition-colors">
            Cancel
          </button>
        </div>
      )}
    </main>
  );
}
