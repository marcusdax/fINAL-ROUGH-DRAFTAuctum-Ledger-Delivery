import test from 'node:test';
import assert from 'node:assert/strict';
import { AuctumLotProvenanceChain } from '../lib/masternex-provenance.ts';

test('AuctumLotProvenanceChain - End-to-End Coffee Lot Verifiability and Tamper Detection', () => {
  const chain = new AuctumLotProvenanceChain('LOT-ETH-YIRG-2026-004');

  // 1. Harvest & Registration
  chain.recordEvent('LOT_REGISTERED', 'producer_gedeb_station', {
    producer: 'Gedeb Washing Station',
    elevationMeters: 2150,
    varietal: 'Heirloom',
    process: 'Washed',
    harvestDate: '2026-09-15',
    bagsCount: 150,
  });

  // 2. Q-Grader Cupping
  chain.recordEvent('SCA_CUPPING_RECORDED', 'q_grader_license_9182', {
    qGrader: 'Certified Q-Grader #9182',
    fragranceAroma: 8.75,
    flavor: 8.75,
    aftertaste: 8.5,
    acidity: 9.0,
    body: 8.5,
    balance: 8.5,
    overallScore: 89.25,
    notes: 'Jasmine, bergamot, lemon curd, peach nectar',
  });

  // 3. ESG & Organic Certification
  chain.recordEvent('ESG_CERTIFICATE_ISSUED', 'ecocert_inspector_44', {
    certifier: 'Ecocert ICO',
    organicCertified: true,
    fairTradeScore: 94.0,
    carbonFootprintKgCO2PerKg: 0.82,
  });

  // 4. Verification Check
  const result = chain.verify();
  assert.equal(result.verified, true);
  assert.equal(result.total_events, 3);
  assert.equal(typeof result.merkle_root, 'string');
  assert.equal(result.merkle_root.length, 64);

  // 5. Tamper Injection Test: malicious modification of cup score from 89.25 to 94.0
  // @ts-ignore
  chain.events[1].payload.overallScore = 94.0;
  const tamperResult = chain.verify();
  assert.equal(tamperResult.verified, false);
  assert.equal(tamperResult.broken_at_sequence, 1);
  assert.match(tamperResult.reason, /tampering detected/i);
});
