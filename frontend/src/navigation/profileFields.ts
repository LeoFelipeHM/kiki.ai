/** Slug na URL → rótulo usado em ProfileScreen / EditProfileField */
export const PROFILE_FIELD_SLUG_TO_LABEL: Record<string, string> = {
  nome: 'Nome completo',
  nickname: 'Nickname',
  email: 'E-mail',
  telefone: 'Telefone',
  nascimento: 'Data de nascimento',
  idioma: 'Idioma',
  fuso: 'Fuso horário',
};

export function profileFieldLabelFromSlug(slug: string | undefined): string | undefined {
  if (!slug) return undefined;
  return PROFILE_FIELD_SLUG_TO_LABEL[slug];
}

const labelToSlug = Object.fromEntries(
  Object.entries(PROFILE_FIELD_SLUG_TO_LABEL).map(([slug, label]) => [label, slug]),
) as Record<string, string>;

export function profileEditSlugFromLabel(label: string): string | undefined {
  return labelToSlug[label];
}
