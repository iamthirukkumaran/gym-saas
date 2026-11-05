import type { ProviderCredentials, SendRequest, SendResult, WhatsAppProvider } from "./types";

/**
 * Sandbox provider — the default.
 *
 * Runs the complete pipeline (scheduling, dedupe, retries, quiet hours,
 * opt-outs, logging) without contacting Meta. Every message is persisted to
 * the outbox exactly as it would be sent, so the whole product is testable
 * and demoable on day one, before any WhatsApp Business approval exists.
 *
 * It is not a stub that always succeeds: it fails a small deterministic
 * slice of sends so retry handling and the failure UI are exercised for
 * real rather than discovered in production.
 */
export const sandboxProvider: WhatsAppProvider = {
  name: "sandbox",
  label: "Astryx Sandbox (no WhatsApp account needed)",

  isConfigured() {
    return true;
  },

  async send(req: SendRequest): Promise<SendResult> {
    // Simulate network latency so the UI's pending states are honest.
    await new Promise((r) => setTimeout(r, 25));

    if (!req.to || !/^\+\d{8,15}$/.test(req.to)) {
      return { ok: false, error: `Invalid recipient "${req.to}"`, retryable: false };
    }
    if (!req.body.trim()) {
      return { ok: false, error: "Empty message body", retryable: false };
    }

    // Deterministic ~4% soft failure, keyed off the recipient so the same
    // number behaves consistently across runs.
    const fingerprint = [...req.to].reduce((a, c) => a + c.charCodeAt(0), 0);
    if (fingerprint % 25 === 0) {
      return {
        ok: false,
        error: "Simulated carrier rejection (sandbox): handset unreachable",
        retryable: true,
      };
    }

    return {
      ok: true,
      providerMessageId: `sbx_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      // Meta's India utility-conversation rate, roughly, for usage modelling.
      costPaise: 11,
    };
  },
};
