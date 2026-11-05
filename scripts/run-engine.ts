/**
 * Runs one reminder-engine pass from the CLI.
 *
 * In production this is a cron hitting POST /api/cron/run; this script is the
 * same code path for local testing and for hosts where a shell cron is easier
 * than an HTTP scheduler.
 *
 *   npm run engine
 */
process.loadEnvFile(".env");

async function main() {
  const { runEngine } = await import("../lib/engine");
  const started = Date.now();
  const result = await runEngine({ trigger: "MANUAL" });

  console.log("\n── Engine run ───────────────────────────────");
  console.log(`run id        ${result.runId}`);
  console.log(`gyms          ${result.gymsProcessed}`);
  console.log(`statuses synced ${result.statusSynced}`);
  console.log(`queued        ${result.queued}`);
  console.log(`sent          ${result.sent}`);
  console.log(`failed        ${result.failed}`);
  console.log(`skipped       ${result.skipped}`);
  console.log(`duration      ${Date.now() - started}ms`);
  if (result.notes.length) {
    console.log("\nnotes:");
    for (const n of result.notes.slice(0, 25)) console.log(`  • ${n}`);
    if (result.notes.length > 25) console.log(`  … ${result.notes.length - 25} more`);
  }
  console.log("─────────────────────────────────────────────\n");
}

main().catch((e) => {
  console.error("engine failed:", e);
  process.exit(1);
});
