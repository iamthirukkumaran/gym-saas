import type { ProviderCredentials, SendRequest, SendResult, WhatsAppProvider } from "./types";

const API_VERSION = process.env.META_WA_API_VERSION || "v21.0";

/**
 * Meta WhatsApp Cloud API.
 *
 * Business-initiated messages outside the 24-hour customer-service window
 * MUST use a pre-approved template — a plain text body would be rejected.
 * Renewal reminders are always business-initiated, so this adapter sends a
 * template whenever one is registered and only falls back to free text when
 * the gym has explicitly chosen that (valid inside an open support window).
 */
export const metaProvider: WhatsAppProvider = {
  name: "meta",
  label: "Meta WhatsApp Cloud API (direct)",

  isConfigured(creds: ProviderCredentials) {
    return Boolean(creds.phoneNumberId && creds.accessToken);
  },

  async send(req: SendRequest, creds: ProviderCredentials): Promise<SendResult> {
    const phoneNumberId = creds.phoneNumberId || process.env.META_WA_PHONE_NUMBER_ID;
    const token = creds.accessToken || process.env.META_WA_ACCESS_TOKEN;

    if (!phoneNumberId || !token) {
      return { ok: false, error: "Meta credentials not configured", retryable: false };
    }

    const to = req.to.replace(/^\+/, "");
    const url = `https://graph.facebook.com/${API_VERSION}/${phoneNumberId}/messages`;

    const payload = req.templateName
      ? {
          messaging_product: "whatsapp",
          to,
          type: "template",
          template: {
            name: req.templateName,
            language: { code: req.language || "en" },
            components: req.templateParams?.length
              ? [
                  {
                    type: "body",
                    parameters: req.templateParams.map((text) => ({ type: "text", text })),
                  },
                ]
              : undefined,
          },
        }
      : {
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: { preview_url: true, body: req.body },
        };

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);

      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const json = (await res.json().catch(() => ({}))) as {
        messages?: { id: string }[];
        error?: { message?: string; code?: number };
      };

      if (!res.ok) {
        const message = json.error?.message ?? `Meta API returned ${res.status}`;
        return {
          ok: false,
          error: message,
          // 429 and 5xx are worth another attempt; 4xx auth/template errors are not.
          retryable: res.status === 429 || res.status >= 500,
        };
      }

      return {
        ok: true,
        providerMessageId: json.messages?.[0]?.id,
        costPaise: 11,
      };
    } catch (err) {
      const aborted = err instanceof Error && err.name === "AbortError";
      return {
        ok: false,
        error: aborted ? "Meta API timed out after 15s" : String(err),
        retryable: true,
      };
    }
  },
};
