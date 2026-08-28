// Which legal documents bind a reader in a given country.
//
// Twelve of the fourteen apply everywhere. The other two are the same contract in two
// editions, India and Rest of World, and exactly one of them binds any given customer.
// Showing both and leaving the reader to work out which is theirs is the one thing a terms
// page must not do.
//
// Kept out of the component so the rule has a single home and can be checked on its own.
export interface RegionScoped {
  region_scope?: string | null;   // 'all' | 'in' | 'row'
}

/** True when a document applies to a reader in `country` (an ISO-3166 alpha-2 code). */
export function appliesInRegion(doc: RegionScoped, country?: string | null): boolean {
  const scope = (doc.region_scope || 'all').toLowerCase();
  if (scope === 'all') return true;
  // Unknown geo falls back to Rest of World: it is the wider audience, and guessing India
  // for someone we cannot place would show them terms that do not bind them.
  const inIndia = (country || '').toUpperCase() === 'IN';
  return scope === 'in' ? inIndia : !inIndia;
}

/** The documents that bind a reader in `country`, in the order given. */
export function documentsForRegion<T extends RegionScoped>(docs: T[], country?: string | null): T[] {
  return docs.filter((d) => appliesInRegion(d, country));
}
