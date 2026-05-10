/** Metadados das vozes Azure Neural pt-BR disponíveis na Kiki (alinhado ao REST voices/list). */

export type AzureVoiceGender = 'Feminino' | 'Masculino';

export interface AzureVoiceOption {
  id: string;
  displayName: string;
  localName: string;
  gender: AzureVoiceGender;
  /** Multilíngue (lista SecondaryLocaleList no Azure) ou monolíngue pt-BR. */
  kind: 'multilingual' | 'monolingual';
  /** Taxa típica indicada pelo Azure para a voz (Hz). */
  sampleRateHint: 24000 | 48000;
  /** Destaque opcional (estilo GA quando informado). */
  highlight?: string;
}

export const AZURE_PT_BR_VOICES = [
  {
    id: 'pt-BR-FranciscaNeural',
    displayName: 'Francisca',
    localName: 'Francisca',
    gender: 'Feminino',
    kind: 'monolingual',
    sampleRateHint: 48000,
    highlight: 'Estilo calm',
  },
  {
    id: 'pt-BR-AntonioNeural',
    displayName: 'Antonio',
    localName: 'Antônio',
    gender: 'Masculino',
    kind: 'monolingual',
    sampleRateHint: 48000,
  },
  {
    id: 'pt-BR-MacerioMultilingualNeural',
    displayName: 'Macerio Multilingual',
    localName: 'Macerio Multilingual',
    gender: 'Masculino',
    kind: 'multilingual',
    sampleRateHint: 24000,
  },
  {
    id: 'pt-BR-ThalitaMultilingualNeural',
    displayName: 'Thalita Multilingual',
    localName: 'Thalita multilíngue',
    gender: 'Feminino',
    kind: 'multilingual',
    sampleRateHint: 24000,
  },
  {
    id: 'pt-BR-BrendaNeural',
    displayName: 'Brenda',
    localName: 'Brenda',
    gender: 'Feminino',
    kind: 'monolingual',
    sampleRateHint: 48000,
  },
  {
    id: 'pt-BR-DonatoNeural',
    displayName: 'Donato',
    localName: 'Donato',
    gender: 'Masculino',
    kind: 'monolingual',
    sampleRateHint: 48000,
  },
  {
    id: 'pt-BR-ElzaNeural',
    displayName: 'Elza',
    localName: 'Elza',
    gender: 'Feminino',
    kind: 'monolingual',
    sampleRateHint: 48000,
  },
  {
    id: 'pt-BR-FabioNeural',
    displayName: 'Fabio',
    localName: 'Fabio',
    gender: 'Masculino',
    kind: 'monolingual',
    sampleRateHint: 48000,
  },
  {
    id: 'pt-BR-GiovannaNeural',
    displayName: 'Giovanna',
    localName: 'Giovanna',
    gender: 'Feminino',
    kind: 'monolingual',
    sampleRateHint: 48000,
  },
  {
    id: 'pt-BR-HumbertoNeural',
    displayName: 'Humberto',
    localName: 'Humberto',
    gender: 'Masculino',
    kind: 'monolingual',
    sampleRateHint: 48000,
  },
  {
    id: 'pt-BR-JulioNeural',
    displayName: 'Julio',
    localName: 'Julio',
    gender: 'Masculino',
    kind: 'monolingual',
    sampleRateHint: 48000,
  },
  {
    id: 'pt-BR-LeilaNeural',
    displayName: 'Leila',
    localName: 'Leila',
    gender: 'Feminino',
    kind: 'monolingual',
    sampleRateHint: 48000,
  },
  {
    id: 'pt-BR-LeticiaNeural',
    displayName: 'Leticia',
    localName: 'Leticia',
    gender: 'Feminino',
    kind: 'monolingual',
    sampleRateHint: 48000,
  },
  {
    id: 'pt-BR-ManuelaNeural',
    displayName: 'Manuela',
    localName: 'Manuela',
    gender: 'Feminino',
    kind: 'monolingual',
    sampleRateHint: 48000,
  },
  {
    id: 'pt-BR-NicolauNeural',
    displayName: 'Nicolau',
    localName: 'Nicolau',
    gender: 'Masculino',
    kind: 'monolingual',
    sampleRateHint: 48000,
  },
  {
    id: 'pt-BR-ThalitaNeural',
    displayName: 'Thalita',
    localName: 'Thalita',
    gender: 'Feminino',
    kind: 'monolingual',
    sampleRateHint: 48000,
  },
  {
    id: 'pt-BR-ValerioNeural',
    displayName: 'Valerio',
    localName: 'Valerio',
    gender: 'Masculino',
    kind: 'monolingual',
    sampleRateHint: 48000,
  },
  {
    id: 'pt-BR-YaraNeural',
    displayName: 'Yara',
    localName: 'Yara',
    gender: 'Feminino',
    kind: 'monolingual',
    sampleRateHint: 48000,
  },
] as const satisfies readonly AzureVoiceOption[];

export type AssistantVoice = (typeof AZURE_PT_BR_VOICES)[number]['id'];

const voiceLabelById: Record<string, string> = Object.fromEntries(
  AZURE_PT_BR_VOICES.map((v) => [v.id, v.displayName]),
);

export function labelForAzureVoiceId(id: string | undefined): string {
  if (!id) return 'Francisca';
  return voiceLabelById[id] ?? id;
}

const LEGACY_VOICE_MAP: Record<string, AssistantVoice> = {
  feminine: 'pt-BR-FranciscaNeural',
  masculine: 'pt-BR-AntonioNeural',
  neutral: 'pt-BR-ThalitaNeural',
};

/** Aceita IDs Azure ou rótulos antigos (`feminine` / `masculine` / `neutral`) até migrar o backend. */
export function normalizeStoredAssistantVoice(raw: string): AssistantVoice {
  const mapped = LEGACY_VOICE_MAP[raw] ?? raw;
  const allowed = new Set(AZURE_PT_BR_VOICES.map((v) => v.id));
  return (allowed.has(mapped) ? mapped : 'pt-BR-FranciscaNeural') as AssistantVoice;
}
