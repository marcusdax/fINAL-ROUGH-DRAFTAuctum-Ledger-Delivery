import { describe, it, expect } from 'vitest';
import { validateLedgerConsistency, mapLedgerToSpace } from '../ledger-validator.js';

describe('Ledger validator', () => {
  it('validates a consistent social object against ledger record', () => {
    const ledgerRecord = { lotId: 'lot-1', price: 5.0, origin: 'Ethiopia' };
    const spaceRecord = { lotId: 'lot-1', price: 5.0, origin: 'Ethiopia' };
    const result = validateLedgerConsistency(ledgerRecord, spaceRecord);
    expect(result.valid).toBe(true);
    expect(result.conflicts).toHaveLength(0);
  });

  it('detects a price conflict', () => {
    const ledgerRecord = { lotId: 'lot-2', price: 5.0, origin: 'Ethiopia' };
    const spaceRecord = { lotId: 'lot-2', price: 6.0, origin: 'Ethiopia' };
    const result = validateLedgerConsistency(ledgerRecord, spaceRecord);
    expect(result.valid).toBe(false);
    expect(result.conflicts).toContainEqual({ field: 'price', ledger: 5.0, space: 6.0 });
  });

  it('maps a ledger record to a space record', () => {
    const ledgerRecord = { lotId: 'lot-3', price: 4.5 };
    const spaceRecord = mapLedgerToSpace(ledgerRecord);
    expect(spaceRecord.lotId).toBe('lot-3');
    expect(spaceRecord.source).toBe('ledger');
  });
});