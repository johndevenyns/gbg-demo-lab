type DidProviderLike = {
  providerKey: string;
  scope?: string[];
};

const DID_SCOPE_ALIASES: Record<string, string> = {
  mitid: 'denmark-mitid',
  'denmark-mitid': 'denmark-mitid',
  bankid_se: 'sweden-bankid',
  'bankid-sweden': 'sweden-bankid',
  'sweden-bankid': 'sweden-bankid',
  bankid_no: 'norway-bankid',
  'bankid-norway': 'norway-bankid',
  'norway-bankid': 'norway-bankid',
  clear: 'clear',
  la_wallet: 'la-wallet',
  'la-wallet': 'la-wallet',
  spid: 'italy-spid',
  'italy-spid': 'italy-spid',
};

export function normalizeDidProviderScope(value?: string | null): string | undefined {
  if (!value) return undefined;
  return DID_SCOPE_ALIASES[value] || value;
}

export function getDidProviderScope(provider?: DidProviderLike | null): string | undefined {
  if (!provider) return undefined;
  const keyScope = normalizeDidProviderScope(provider.providerKey);
  if (keyScope && keyScope !== provider.providerKey) return keyScope;
  return normalizeDidProviderScope(provider.scope?.[0]) || keyScope;
}

export function didProviderMatchesKey(provider: DidProviderLike, savedKey: string): boolean {
  const savedScope = normalizeDidProviderScope(savedKey);
  return savedScope === getDidProviderScope(provider)
    || savedKey === provider.providerKey
    || provider.scope?.includes(savedKey) === true;
}