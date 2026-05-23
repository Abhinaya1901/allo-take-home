const STOCK_ID = process.env.STOCK_ID;
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const PARALLEL = 50;

if (!STOCK_ID) {
  console.error("Usage: STOCK_ID=<uuid> npx tsx scripts/concurrency-test.ts");
  process.exit(1);
}

async function hit(): Promise<number> {
  const res = await fetch(`${BASE_URL}/api/reservations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stockId: STOCK_ID, quantity: 1 }),
  });
  return res.status;
}

async function main() {
  console.log(`Firing ${PARALLEL} parallel requests at stock ${STOCK_ID}...`);
  const statuses = await Promise.all(Array.from({ length: PARALLEL }, () => hit()));
  const tally = statuses.reduce<Record<number, number>>((acc, s) => {
    acc[s] = (acc[s] ?? 0) + 1;
    return acc;
  }, {});
  console.log("\nResults:");
  console.table(tally);
  const successes = tally[201] ?? 0;
  const conflicts = tally[409] ?? 0;
  if (successes === 1 && conflicts === PARALLEL - 1) {
    console.log("\nPASS — exactly 1 reservation succeeded, all others got 409.");
  } else {
    console.error(`\nFAIL — got ${successes} successes and ${conflicts} conflicts.`);
  }
}

main();
