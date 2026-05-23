import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

class AppError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const updated = await prisma.$transaction(
      async (tx) => {
        const rows: Array<{ id: string; stockId: string; quantity: number; status: string }> =
          await tx.$queryRaw`SELECT id, "stockId", quantity, status FROM "Reservation" WHERE id = ${id} FOR UPDATE`;

        if (rows.length === 0) throw new AppError(404, "not_found");
        const r = rows[0];
        if (r.status !== "pending") return tx.reservation.findUniqueOrThrow({ where: { id } });
        await tx.stock.update({ where: { id: r.stockId }, data: { reservedUnits: { decrement: r.quantity } } });
        return tx.reservation.update({ where: { id }, data: { status: "released" } });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted }
    );
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof AppError) return NextResponse.json({ error: err.code }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
