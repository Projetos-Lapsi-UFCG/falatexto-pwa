export interface LabeledEntry {
  key: string;
  label: string;
  value: unknown;
}

/** Converte uma chave camelCase/snake_case/kebab-case em um rótulo "Title Case". */
export function humanizeKey(key: string): string {
  const spaced = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim();
  return spaced
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function toLabeledEntries(source?: Record<string, unknown> | null): LabeledEntry[] {
  if (!source) return [];
  return Object.entries(source).map(([key, value]) => ({ key, label: humanizeKey(key), value }));
}
