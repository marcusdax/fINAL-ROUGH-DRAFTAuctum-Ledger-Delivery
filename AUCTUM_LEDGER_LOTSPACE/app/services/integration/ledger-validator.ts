export function mapLedgerToSpace(ledgerRecord: unknown): Record<string, unknown> {
  return { ...(ledgerRecord as Record<string, unknown>), source: 'ledger' };
}

export function mapSpaceToLedger(spaceRecord: unknown): Record<string, unknown> {
  const { ...rest } = spaceRecord as Record<string, unknown>;
  return rest;
}

export function validateLedgerConsistency(
  ledgerRecord: Record<string, unknown>,
  spaceRecord: Record<string, unknown>,
): { valid: boolean; conflicts: Array<{ field: string; ledger: unknown; space: unknown }> } {
  const conflicts: Array<{ field: string; ledger: unknown; space: unknown }> = [];
  for (const key of Object.keys(ledgerRecord)) {
    if (spaceRecord[key] !== undefined && spaceRecord[key] !== ledgerRecord[key]) {
      conflicts.push({ field: key, ledger: ledgerRecord[key], space: spaceRecord[key] });
    }
  }
  return { valid: conflicts.length === 0, conflicts };
}