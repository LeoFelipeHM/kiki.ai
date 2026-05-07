/** Slug na URL → nome esperado por IntegrationScreen */
export const INTEGRATION_SLUG_TO_TYPE: Record<string, string> = {
  'google-calendar': 'Google Calendar',
  gmail: 'Gmail',
  outlook: 'Outlook',
  'apple-watch': 'Apple Watch',
};

/** Slug na URL → valor `integration_provider` na API */
export const INTEGRATION_SLUG_TO_PROVIDER: Record<string, string> = {
  'google-calendar': 'google_calendar',
  gmail: 'gmail',
  outlook: 'outlook',
  'apple-watch': 'apple_watch',
};

export function integrationTypeFromSlug(slug: string | undefined): string | undefined {
  if (!slug) return undefined;
  return INTEGRATION_SLUG_TO_TYPE[slug];
}

export function integrationProviderFromSlug(slug: string | undefined): string | undefined {
  if (!slug) return undefined;
  return INTEGRATION_SLUG_TO_PROVIDER[slug];
}
