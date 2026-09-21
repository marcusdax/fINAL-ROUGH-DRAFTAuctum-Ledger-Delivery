export function mapLedgerToSpace(ledgerRecord: unknown): Record<string, unknown> {
  return { ...(ledgerRecord as Record<string, unknown>), source: 'ledger' };
}

export function mapSpaceToLedger(spaceRecord: unknown): Record<string, unknown> {
  const { _source: _unused, ...rest } = spaceRecord as Record<string, unknown>;
  return rest;
}