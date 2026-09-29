export interface LabeledEntry {
  key: string;
  label: string;
  /** Chave i18n para campos conhecidos (ex.: os campos fixos de dados do
   *  paciente/encerramento). Quando presente, a UI deve traduzir por ela em
   *  vez de usar `label` — assim o rótulo acompanha o idioma selecionado.
   *  Perguntas dinâmicas de um formulário não têm equivalente i18n, então
   *  ficam só com `label` (humanizado a partir da key). */
  labelKey?: string;
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

/**
 * @param labelKeys mapa opcional de key -> chave i18n, para campos conhecidos
 *   cujo rótulo deve ser traduzido (ex.: os campos fixos de dados do
 *   paciente/encerramento). Chaves fora do mapa continuam só com o label
 *   humanizado.
 */
export function toLabeledEntries(
  source?: Record<string, unknown> | null,
  labelKeys?: Record<string, string>
): LabeledEntry[] {
  if (!source) return [];
  return Object.entries(source).map(([key, value]) => ({
    key,
    label: humanizeKey(key),
    labelKey: labelKeys?.[key],
    value,
  }));
}
