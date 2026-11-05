import { sandboxProvider } from "./sandbox";
import { metaProvider } from "./meta";
import { aisensyProvider, interaktProvider, watiProvider } from "./bsp";
import type { ProviderCredentials, SendRequest, SendResult, WhatsAppProvider } from "./types";

export type { SendRequest, SendResult, ProviderCredentials, WhatsAppProvider };

const REGISTRY: Record<string, WhatsAppProvider> = {
  sandbox: sandboxProvider,
  meta: metaProvider,
  aisensy: aisensyProvider,
  wati: watiProvider,
  interakt: interaktProvider,
};

export const PROVIDERS = Object.values(REGISTRY).map((p) => ({
  name: p.name,
  label: p.label,
}));

/** Unknown or unset provider names fall back to the sandbox — never a crash. */
export function getProvider(name: string | null | undefined): WhatsAppProvider {
  return REGISTRY[name ?? ""] ?? sandboxProvider;
}

type GymLike = {
  waProvider: string;
  waPhoneNumberId: string | null;
  waBusinessId: string | null;
  waAccessToken: string | null;
  waApiKey: string | null;
  waSenderDisplay: string | null;
};

export function credentialsFor(gym: GymLike): ProviderCredentials {
  return {
    provider: gym.waProvider,
    phoneNumberId: gym.waPhoneNumberId,
    businessId: gym.waBusinessId,
    accessToken: gym.waAccessToken,
    apiKey: gym.waApiKey,
    senderDisplay: gym.waSenderDisplay,
  };
}

/** Resolves the gym's provider and dispatches one message through it. */
export async function sendViaGym(gym: GymLike, req: SendRequest): Promise<SendResult> {
  const provider = getProvider(gym.waProvider);
  const creds = credentialsFor(gym);

  if (!provider.isConfigured(creds)) {
    return {
      ok: false,
      error: `${provider.label} is selected but not fully configured. Add credentials in Settings → WhatsApp.`,
      retryable: false,
    };
  }
  return provider.send(req, creds);
}
