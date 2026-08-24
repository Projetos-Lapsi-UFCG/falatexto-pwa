import { humanizeKey, toLabeledEntries } from './labeled-entries.util';

describe('humanizeKey', () => {
  it('splits camelCase into title case words', () => {
    expect(humanizeKey('birthDate')).toBe('Birth Date');
  });

  it('splits snake_case into title case words', () => {
    expect(humanizeKey('q1_symptom')).toBe('Q1 Symptom');
  });

  it('keeps a single-word key capitalized', () => {
    expect(humanizeKey('entity')).toBe('Entity');
  });

  it('splits kebab-case into title case words', () => {
    expect(humanizeKey('some-kebab-key')).toBe('Some Kebab Key');
  });
});

describe('toLabeledEntries', () => {
  it('returns an empty array for undefined', () => {
    expect(toLabeledEntries(undefined)).toEqual([]);
  });

  it('returns an empty array for null', () => {
    expect(toLabeledEntries(null)).toEqual([]);
  });

  it('maps each entry to a humanized label, preserving order and value', () => {
    const result = toLabeledEntries({ a: 1, birthDate: '2020-01-01' });
    expect(result).toEqual([
      { key: 'a', label: 'A', value: 1 },
      { key: 'birthDate', label: 'Birth Date', value: '2020-01-01' },
    ]);
  });
});
