import { describe, expect, it } from 'vitest';
import { didProviderMatchesKey, getDidProviderScope, normalizeDidProviderScope } from './didProviders';

const provider = (providerKey: string, scope: string[] = []) => ({ providerKey, scope });

describe('Digital ID provider scope compatibility', () => {
  it.each([
    ['mitid', 'denmark-mitid'],
    ['bankid_no', 'norway-bankid'],
    ['clear', 'clear'],
    ['la_wallet', 'la-wallet'],
    ['spid', 'italy-spid'],
  ])('normalizes %s to %s', (key, scope) => {
    expect(normalizeDidProviderScope(key)).toBe(scope);
  });

  it('prefers a known provider key over stale capability scopes', () => {
    expect(getDidProviderScope(provider('mitid', ['identity']))).toBe('denmark-mitid');
    expect(getDidProviderScope(provider('la_wallet', ['drivers_license']))).toBe('la-wallet');
  });

  it('matches saved legacy and canonical provider keys', () => {
    const mitid = provider('mitid', ['denmark-mitid']);
    expect(didProviderMatchesKey(mitid, 'mitid')).toBe(true);
    expect(didProviderMatchesKey(mitid, 'denmark-mitid')).toBe(true);
  });
});
