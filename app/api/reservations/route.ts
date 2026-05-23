import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const RESERVATION_TTL_MINUTES = 10;

const Body = z.object({
  stockId: z.string().uuid(),
  quantity: z.number().int().positive().max(10),
});

class AppError extends Error {
  constructor(public status: number, public code: string, public extra: Record<string, unknown> = {}) {
    super(code);
  }
}

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const { stockId, quantity } = parsed.data;

  try {
    const reservation = await prisma.$transaction(
      async (tx) => {
        const rows: Array<{ id: string; totalUnits: number; reservedUnits: number }> =
          await tx.$queryRaw`SELECT id, "totalUnits", "reservedUnits" FROM "Stock" WHERE id = ${stockId} FOR UPDATE`;

        if (rows.length === 0) throw new AppError(404, "stock_not_found");
        const stock = rows[0];
        const available = stock.totalUnits - stock.reservedUnits;
        if (available < quantity) throw new AppError(409, "insufficient_stock", { available, requested: quantity });

        await tx.stock.update({ where: { id: stockId }, data: { reservedUnits: { increment: quantity } } });
        const expiresAt = new Date(Date.now() + RESERVATION_TTL_MINUTES * 60_000);
        return tx.reservation.create({ data: { stockId, quantity, expiresAt, status: "pending" } });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted }
    );

    return NextResponse.json(reservation, { status: 201 });
  } catch (err) {
    if (err instanceof AppError) return NextResponse.json({ error: err.code, ...err.extra }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
