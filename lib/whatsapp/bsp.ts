import type { ProviderCredentials, SendRequest, SendResult, WhatsAppProvider } from "./types";

/**
 * Indian BSP adapters (AiSensy / Wati / Interakt).
 *
 * These resellers sit on top of the same Cloud API but each wraps it in its
 * own JSON shape. Rather than three near-identical files, one factory
 * describes the per-vendor differences: endpoint, auth header, and request
 * body. Adding another BSP is a dozen lines at the bottom of this file.
 *
 * Endpoints are kept configurable via BSP_BASE_URL because BSPs move them.
 */
type BspSpec = {
  name: string;
  label: string;
  defaultBaseUrl: string;
  path: string;
  authHeader: (apiKey: string) => Record<string, string>;
  buildBody: (req: SendRequest, creds: ProviderCredentials) => unknown;
  extractId: (json: Record<string, unknown>) => string | undefined;
};

function createBspProvider(spec: BspSpec): WhatsAppProvider {
  return {
    name: spec.name,
    label: spec.label,

    isConfigured(creds) {
      return Boolean(creds.apiKey || process.env.BSP_API_KEY);
    },

    async send(req, creds): Promise<SendResult> {
      const apiKey = creds.apiKey || process.env.BSP_API_KEY;
      if (!apiKey) {
        return { ok: false, error: `${spec.label}: API key not configured`, retryable: false };
      }

      const base = (process.env.BSP_BASE_URL || spec.defaultBaseUrl).replace(/\/$/, "");
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);

      try {
        const res = await fetch(`${base}${spec.path}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...spec.authHeader(apiKey) },
          body: JSON.stringify(spec.buildBody(req, creds)),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;

        if (!res.ok) {
          const message =
            (typeof json.message === "string" && json.message) ||
            (typeof json.error === "string" && json.error) ||
            `${spec.label} returned ${res.status}`;
          return { ok: false, error: message, retryable: res.status === 429 || res.status >= 500 };
        }

        return { ok: true, providerMessageId: spec.extractId(json), costPaise: 13 };
      } catch (err) {
        const aborted = err instanceof Error && err.name === "AbortError";
        return {
          ok: false,
          error: aborted ? `${spec.label} timed out after 15s` : String(err),
          retryable: true,
        };
      }
    },
  };
}

export const aisensyProvider = createBspProvider({
  name: "aisensy",
  label: "AiSensy",
  defaultBaseUrl: "https://backend.aisensy.com",
  path: "/campaign/t1/api/v2",
  authHeader: () => ({}),
  buildBody: (req, creds) => ({
    apiKey: creds.apiKey || process.env.BSP_API_KEY,
    campaignName: req.templateName ?? req.templateKey ?? "astryx",
    destination: req.to,
    userName: creds.senderDisplay ?? "Astryx",
    templateParams: req.templateParams ?? [],
  }),
  extractId: (json) => (typeof json.messageId === "string" ? json.messageId : undefined),
});

export const watiProvider = createBspProvider({
  name: "wati",
  label: "Wati",
  defaultBaseUrl: "https://live-server.wati.io",
  path: "/api/v1/sendTemplateMessage",
  authHeader: (apiKey) => ({ Authorization: `Bearer ${apiKey}` }),
  buildBody: (req) => ({
    whatsappNumber: req.to.replace(/^\+/, ""),
    template_name: req.templateName ?? req.templateKey,
    broadcast_name: `astryx_${Date.now()}`,
    parameters: (req.templateParams ?? []).map((value, i) => ({
      name: String(i + 1),
      value,
    })),
  }),
  extractId: (json) => {
    const id = (json as { id?: unknown }).id;
    return typeof id === "string" ? id : undefined;
  },
});

export const interaktProvider = createBspProvider({
  name: "interakt",
  label: "Interakt",
  defaultBaseUrl: "https://api.interakt.ai",
  path: "/v1/public/message/",
  authHeader: (apiKey) => ({ Authorization: `Basic ${apiKey}` }),
  buildBody: (req) => {
    const digits = req.to.replace(/^\+/, "");
    return {
      countryCode: `+${digits.slice(0, 2)}`,
      phoneNumber: digits.slice(2),
      type: req.templateName ? "Template" : "Text",
      ...(req.templateName
        ? {
            template: {
              name: req.templateName,
              languageCode: req.language || "en",
              bodyValues: req.templateParams ?? [],
            },
          }
        : { data: { message: req.body } }),
    };
  },
  extractId: (json) => (typeof json.id === "string" ? json.id : undefined),
});
