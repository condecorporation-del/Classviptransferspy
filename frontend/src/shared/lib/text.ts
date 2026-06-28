export function normalizeSearchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function includesNormalized(value: string, query: string) {
  return normalizeSearchText(value).includes(normalizeSearchText(query));
}
