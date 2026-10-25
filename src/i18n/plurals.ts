/**
 * Cardinal plurals for Russian and Ukrainian (CLDR).
 * Hermes has no `Intl.PluralRules`, so i18next would treat every count except 1 as `other`
 * and skip the `few` and `many` strings. This rule is the one the catalogs use.
 */
export function selectSlavicCardinal(count: number): 'one' | 'few' | 'many' | 'other' {
  if (!Number.isFinite(count) || !Number.isInteger(count)) return 'other';
  const abs = Math.abs(count);
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 === 1 && mod100 !== 11) return 'one';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'few';
  if (mod10 === 0 || (mod10 >= 5 && mod10 <= 9) || (mod100 >= 11 && mod100 <= 14)) return 'many';
  return 'other';
}

const SLAVIC = new Set(['ru', 'uk']);

type PluralRulesConstructor = typeof Intl.PluralRules;
type SlavicPluralRules = PluralRulesConstructor & { __vamosSlavic?: boolean };

function languageOf(locales: Intl.LocalesArgument): string {
  const value = Array.isArray(locales) ? locales[0] : locales;
  const tag = typeof value === 'string' ? value : (value?.toString() ?? '');
  return tag.toLowerCase().split('-')[0] ?? '';
}

/** Teach Intl the Slavic categories before i18next reads them. Safe when Hermes has no PluralRules. */
export function installSlavicPluralRules(): void {
  const Current = Intl.PluralRules as SlavicPluralRules | undefined;
  if (Current?.__vamosSlavic) return;

  const Native = Current;

  function Rules(this: unknown, locales: Intl.LocalesArgument, options?: Intl.PluralRulesOptions) {
    const lang = languageOf(locales);
    const type = options?.type ?? 'cardinal';
    const slavic = SLAVIC.has(lang) && type === 'cardinal';
    const native = slavic || !Native ? null : new Native(locales as string, options);

    return {
      select(count: number) {
        if (slavic) return selectSlavicCardinal(Number(count));
        if (native) return native.select(count);
        return Number(count) === 1 ? 'one' : 'other';
      },
      resolvedOptions() {
        if (native) return native.resolvedOptions();
        return {
          locale: lang,
          maximumFractionDigits: 0,
          minimumFractionDigits: 0,
          minimumIntegerDigits: 1,
          pluralCategories: slavic ? ['one', 'few', 'many', 'other'] : ['one', 'other'],
          roundingMode: 'halfExpand',
          type,
        } as Intl.ResolvedPluralRulesOptions;
      },
    };
  }

  Rules.__vamosSlavic = true;
  Rules.supportedLocalesOf = Native?.supportedLocalesOf.bind(Native) ?? (() => []);

  Object.assign(Intl, { PluralRules: Rules });
}
