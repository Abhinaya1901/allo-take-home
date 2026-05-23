"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type StockEntry = { stockId: string; warehouseName: string; available: number };
type Product = { id: string; sku: string; name: string; priceCents: number; stocks: StockEntry[] };

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const router = useRouter();

  const load = async () => {
    const res = await fetch("/api/products");
    setProducts(await res.json());
  };

  useEffect(() => { load(); }, []);

  const reserve = async (stockId: string) => {
    setError(null);
    setLoadingId(stockId);
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stockId, quantity: 1 }),
      });
      if (res.status === 409) { setError("Sorry, that just sold out!"); await load(); return; }
      if (!res.ok) { setError(`Error ${res.status}. Please try again.`); return; }
      const r = await res.json();
      router.push(`/checkout/${r.id}`);
    } finally { setLoadingId(null); }
  };

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-semibold mb-2">Allo Store</h1>
      <p className="text-gray-500 text-sm mb-8">Multi-warehouse inventory — reservations held 10 minutes</p>
      {error && <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
      <div className="space-y-6">
        {products.length === 0 && <p className="text-gray-400 text-sm">Loading...</p>}
        {products.map((p) => (
          <div key={p.id} className="border rounded-xl p-5">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="font-semibold text-lg">{p.name}</h2>
                <p className="text-xs text-gray-400 font-mono">{p.sku}</p>
              </div>
              <p className="font-semibold">₹{(p.priceCents / 100).toLocaleString("en-IN")}</p>
            </div>
            <div className="space-y-2">
              {p.stocks.map((s) => (
                <div key={s.stockId} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                  <div>
                    <span className="text-sm font-medium">{s.warehouseName}</span>
                    <span className="mx-2 text-gray-300">·</span>
                    <span className={`text-sm font-medium ${s.available === 0 ? "text-red-500" : s.available <= 2 ? "text-amber-600" : "text-green-600"}`}>
                      {s.available === 0 ? "Out of stock" : s.available === 1 ? "Last unit!" : `${s.available} in stock`}
                    </span>
                  </div>
                  <button
                    onClick={() => reserve(s.stockId)}
                    disabled={s.available < 1 || loadingId === s.stockId}
                    className="px-4 py-1.5 rounded-lg bg-black text-white text-sm font-medium disabled:bg-gray-200 disabled:text-gray-400 hover:bg-gray-800 transition-colors"
                  >
                    {loadingId === s.stockId ? "Reserving…" : "Reserve"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
