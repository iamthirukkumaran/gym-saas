/**
 * The seam between Astryx's automation engine and whoever actually delivers
 * the message. Every provider implements this one interface, so switching
 * from the sandbox to Meta Cloud API or an Indian BSP touches exactly one
 * file and zero business logic.
 */

export type SendRequest = {
  /** E.164 with leading "+". The adapter strips/reshapes as its API needs. */
  to: string;
  /** Fully rendered message text. No placeholders remain at this point. */
  body: string;
  /** Provider-side template identifier, when the provider requires one. */
  templateKey?: string | null;
  templateName?: string | null;
  language?: string;
  /** Ordered values for positional template params ({{1}}, {{2}}, …). */
  templateParams?: string[];
};

export type SendResult = {
  ok: boolean;
  /** Provider's message id, stored for later delivery-status reconciliation. */
  providerMessageId?: string;
  /** Approximate billable cost in paise, for usage dashboards. */
  costPaise?: number;
  error?: string;
  /** True when retrying later could plausibly succeed (429, 5xx, timeout). */
  retryable?: boolean;
};

export type ProviderCredentials = {
  provider: string;
  phoneNumberId?: string | null;
  businessId?: string | null;
  accessToken?: string | null;
  apiKey?: string | null;
  senderDisplay?: string | null;
};

export interface WhatsAppProvider {
  readonly name: string;
  /** Human-facing label for the settings screen. */
  readonly label: string;
  /** False when credentials are missing — the UI surfaces this as "not connected". */
  isConfigured(creds: ProviderCredentials): boolean;
  send(req: SendRequest, creds: ProviderCredentials): Promise<SendResult>;
}
