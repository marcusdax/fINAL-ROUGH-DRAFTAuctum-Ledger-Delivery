/**
 * server/lib/masternex-provenance.ts — MASTERNEX.os Immutable Provenance Engine for Auctum Ledger.
 *
 * Converts agricultural coffee events (origin, elevation, varietal, SCA cupping score, ESG)
 * into cryptographically tamper-evident Merkle hash chains, eliminating greenwashing liability.
 */

import { createHash } from 'node:crypto';

export interface LotProvenanceEvent {
  sequence: number;
  lot_id: string;
  event_type: 'LOT_REGISTERED' | 'SCA_CUPPING_RECORDED' | 'ESG_CERTIFICATE_ISSUED' | 'BILL_OF_LADING_SIGNED' | 'WAREHOUSE_DELIVERY';
  timestamp: string;
  actor_id: string;
  payload: Record<string, unknown>;
  prev_hash: string;
  event_hash: string;
}

export interface LotVerificationResult {
  lot_id: string;
  verified: boolean;
  total_events: number;
  merkle_root: string;
  broken_at_sequence?: number;
  reason?: string;
  events: LotProvenanceEvent[];
}

export class AuctumLotProvenanceChain {
  public static readonly GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';
  public readonly lotId: string;
  private events: LotProvenanceEvent[] = [];

  constructor(lotId: string) {
    this.lotId = lotId;
  }

  private hashData(str: string): string {
    return createHash('sha256').update(str).digest('hex');
  }

  /**
   * Append an agricultural event to the lot's tamper-evident chain.
   */
  public recordEvent(
    eventType: LotProvenanceEvent['event_type'],
    actorId: string,
    payload: Record<string, unknown>
  ): LotProvenanceEvent {
    const sequence = this.events.length;
    const prevHash = sequence === 0 ? AuctumLotProvenanceChain.GENESIS_HASH : this.events[sequence - 1].event_hash;
    const timestamp = new Date().toISOString();
    const payloadStr = JSON.stringify(payload);
    const dataDigest = this.hashData(payloadStr);

    const eventHash = this.hashData(`${sequence}:${this.lotId}:${eventType}:${prevHash}:${dataDigest}:${timestamp}`);

    const event: LotProvenanceEvent = {
      sequence,
      lot_id: this.lotId,
      event_type: eventType,
      timestamp,
      actor_id: actorId,
      payload,
      prev_hash: prevHash,
      event_hash: eventHash,
    };

    this.events.push(event);
    return event;
  }

  /**
   * Verify all events in the chain. Rejects any modified historical data.
   */
  public verify(): LotVerificationResult {
    for (let i = 0; i < this.events.length; i++) {
      const e = this.events[i];
      const expectedPrev = i === 0 ? AuctumLotProvenanceChain.GENESIS_HASH : this.events[i - 1].event_hash;

      if (e.prev_hash !== expectedPrev) {
        return {
          lot_id: this.lotId,
          verified: false,
          total_events: this.events.length,
          merkle_root: '',
          broken_at_sequence: i,
          reason: `Invalid previous hash link at sequence ${i}`,
          events: this.events,
        };
      }

      const payloadStr = JSON.stringify(e.payload);
      const dataDigest = this.hashData(payloadStr);
      const expectedHash = this.hashData(`${e.sequence}:${e.lot_id}:${e.event_type}:${e.prev_hash}:${dataDigest}:${e.timestamp}`);

      if (e.event_hash !== expectedHash) {
        return {
          lot_id: this.lotId,
          verified: false,
          total_events: this.events.length,
          merkle_root: '',
          broken_at_sequence: i,
          reason: `Data tampering detected at sequence ${i}`,
          events: this.events,
        };
      }
    }

    return {
      lot_id: this.lotId,
      verified: true,
      total_events: this.events.length,
      merkle_root: this.computeMerkleRoot(),
      events: this.events,
    };
  }

  /**
   * Compute Merkle root across all events in this lot.
   */
  public computeMerkleRoot(): string {
    if (this.events.length === 0) {
      return this.hashData('');
    }
    let currentLevel = this.events.map((e) => e.event_hash);
    while (currentLevel.length > 1) {
      const nextLevel: string[] = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        if (i + 1 < currentLevel.length) {
          nextLevel.push(this.hashData(currentLevel[i] + currentLevel[i + 1]));
        } else {
          nextLevel.push(this.hashData(currentLevel[i] + currentLevel[i]));
        }
      }
      currentLevel = nextLevel;
    }
    return currentLevel[0];
  }
}
