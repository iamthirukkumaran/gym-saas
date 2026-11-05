import { NextResponse } from "next/server";

import { runEngine } from "@/lib/engine";

/**
 * The reminder engine's scheduler endpoint.
 *
 * Point any cron at this every 15 minutes:
 *
 *   curl -X POST https://your-host/api/cron/run \
 *        -H "Authorization: Bearer $CRON_SECRET"
 *
 * Runs more often than strictly needed on purpose. The engine is idempotent,
 * so frequent runs cost nothing and mean a missed window (deploy, restart,
 * provider outage) self-heals within minutes instead of waiting a day.
 *
 * Auth is a bearer secret rather than a session: a scheduler has no user.
 * Without CRON_SECRET set, the route refuses to run at all rather than
 * defaulting open — an unauthenticated endpoint that sends WhatsApp messages
 * on a customer's behalf is not something to leave to chance.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorize(request: Request): { ok: true } | { ok: false; status: number; error: string } {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return {
      ok: false,
      status: 503,
      error: "CRON_SECRET is not configured on the server. Refusing to run.",
    };
  }

  const header = request.headers.get("authorization") ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  // Vercel Cron and some schedulers can only send a query parameter.
  const query = new URL(request.url).searchParams.get("secret") ?? "";
  const provided = bearer || query;

  if (!provided || provided !== secret) {
    return { ok: false, status: 401, error: "Invalid or missing cron secret." };
  }
  return { ok: true };
}

async function handle(request: Request) {
  const auth = authorize(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const gymId = new URL(request.url).searchParams.get("gymId") ?? undefined;

  try {
    const result = await runEngine({ gymId, trigger: "CRON" });
    return NextResponse.json(
      {
        ok: true,
        ...result,
        // Notes can be long on a multi-tenant run; cap the response size.
        notes: result.notes.slice(0, 50),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[cron] engine run failed", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  return handle(request);
}

/** GET is supported because several hosted schedulers only issue GETs. */
export async function GET(request: Request) {
  return handle(request);
}
