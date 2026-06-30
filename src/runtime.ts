const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};

const clean = (value?: string) => (value ?? '').trim();
const trimSlash = (value: string) => value.replace(/\/+$/, '');
const ensurePath = (value: string) => value.startsWith('/') ? value : `/${value}`;

export const config = {
  apiBaseUrl: trimSlash(clean(env.VITE_API_BASE_URL) || 'https://api.diceprojects.com/api'),
  backofficePublicBaseUrl: trimSlash(clean(env.VITE_BACKOFFICE_PUBLIC_BASE_URL) || 'https://backoffice.diceprojects.com'),
  campaignKey: clean(env.VITE_MARKETING_CAMPAIGN_KEY) || 'servicepub-web',
  publicBotKey: clean(env.VITE_PUBLIC_BOT_KEY) || 'servicepub-web',
  enableMarketing: clean(env.VITE_MARKETING_CAPTURE_ENABLED || 'true') !== 'false',
  enablePublicBot: clean(env.VITE_PUBLIC_BOT_ENABLED || 'true') !== 'false',
  tenantId: clean(env.VITE_DEMO_TENANT_ID) || '11111111-1111-4111-8111-111111111111',
  servicesUrl: clean(env.VITE_SERVICEPUB_SERVICES_URL) || 'https://api.diceprojects.com/api/v1/appointments/defaults/hair-salon-demo',
  agendaUrl: clean(env.VITE_SERVICEPUB_AGENDA_URL) || 'https://api.diceprojects.com/api/v1/appointments/defaults/hair-salon-demo',
  confirmPath: clean(env.VITE_SERVICEPUB_CONFIRM_APPOINTMENT_PATH) || '/public/servicepub/appointments/servicepub-demo-confirmar-corte-barba',
  reschedulePath: clean(env.VITE_SERVICEPUB_RESCHEDULE_APPOINTMENT_PATH) || '/public/servicepub/appointments/servicepub-demo-reprogramar-coloracion',
  waitlistPath: clean(env.VITE_SERVICEPUB_WAITLIST_PATH) || '/public/servicepub/waitlist/servicepub-demo-spa-palermo',
};

export function publicUrl(path: string) {
  return `${config.backofficePublicBaseUrl}${ensurePath(path)}`;
}

function visitorId() {
  const key = 'servicepub.marketing.visitorId.v1';
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const next = window.crypto?.randomUUID?.() ?? `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
  window.localStorage.setItem(key, next);
  return next;
}

function sessionId() {
  const key = 'servicepub.marketing.sessionId.v1';
  const existing = window.sessionStorage.getItem(key);
  if (existing) return existing;
  const next = window.crypto?.randomUUID?.() ?? `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
  window.sessionStorage.setItem(key, next);
  return next;
}

type TrackOptions = {
  actionCode: string;
  actionLabel?: string;
  category?: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
};

export function track(eventType: string, options: TrackOptions) {
  if (!config.enableMarketing || !config.apiBaseUrl || !config.campaignKey) return;
  const payload = {
    eventType,
    entityType: options.entityType,
    entityId: options.entityId,
    visitorId: visitorId(),
    actionCode: options.actionCode,
    actionLabel: options.actionLabel,
    category: options.category,
    channel: 'WEB',
    pageUrl: window.location.href,
    referrerUrl: document.referrer || undefined,
    metadata: JSON.stringify({ vertical: 'ServicePub', sessionId: sessionId(), tenantId: config.tenantId, ...options.metadata }),
  };
  void fetch(`${config.apiBaseUrl}/v1/campaigns/capture/${encodeURIComponent(config.campaignKey)}/events`, {
    method: 'POST',
    credentials: 'omit',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => undefined);
}

export async function askPublicBot(message: string): Promise<string | null> {
  if (!config.enablePublicBot || !config.apiBaseUrl || !config.publicBotKey) return null;
  try {
    const response = await fetch(`${config.apiBaseUrl}/v1/public-bots/${encodeURIComponent(config.publicBotKey)}/message`, {
      method: 'POST',
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        visitorId: visitorId(),
        sessionId: sessionId(),
        language: 'es',
        pageUrl: window.location.href,
        referrerUrl: document.referrer || undefined,
        allowAi: false,
      }),
    });
    if (!response.ok) return null;
    const json = await response.json();
    return typeof json?.answer === 'string' ? json.answer : null;
  } catch {
    return null;
  }
}
