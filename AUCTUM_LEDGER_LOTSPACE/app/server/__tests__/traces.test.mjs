import test from 'node:test';
import assert from 'node:assert/strict';
import { EudrEngine } from '../lib/eudr-engine.ts';
import { TracesConnector } from '../lib/traces-connector.ts';

test('TRACES-NT B2G Connector - Schema Formatting & Automated Submission', async () => {
  const connector = new TracesConnector({ environment: 'sandbox' });

  // 1. Prepare valid compliant constituent plots
  const plotA = {
    plot_id: 'PLOT-YIRG-01',
    farmer_id: 'FARM-01',
    farmer_name: 'Tariku Bekele',
    country_code: 'ET',
    area_hectares: 1.45,
    geometry_type: 'Point',
    coordinates: [38.254192, 5.921448],
    deforestation_risk_score: 0.005,
  };

  const plotB = {
    plot_id: 'PLOT-YIRG-02',
    farmer_id: 'FARM-02',
    farmer_name: 'Genet Alemu',
    country_code: 'ET',
    area_hectares: 2.10,
    geometry_type: 'Point',
    coordinates: [38.258901, 5.918452],
    deforestation_risk_score: 0.012,
  };

  const dds = EudrEngine.generateDueDiligenceStatement({
    lotId: 'CONTAINER-ETH-2026-ROTTERDAM',
    operatorName: 'Auctum Specialty Imports B.V.',
    operatorEori: 'NL849201948',
    operatorCountry: 'NL',
    countryOfProduction: 'ET',
    netMassKg: 19200,
    bagsCount: 320,
    plots: [plotA, plotB],
  });

  // 2. Validate official TRACES payload format
  const tracesPayload = connector.formatTracesPayload(dds);
  assert.equal(tracesPayload.header.submissionType, 'EUDR_DUE_DILIGENCE_STATEMENT');
  assert.equal(tracesPayload.operator.eoriNumber, 'NL849201948');
  assert.equal(tracesPayload.commodityItem.hsCode, '0901.11.00');
  assert.equal(tracesPayload.commodityItem.netMassKg, 19200);
  assert.equal(tracesPayload.provenanceAndVerification.cryptographicProofType, 'MASTERNEX_MERKLE_TREE_SHA256');
  assert.equal(tracesPayload.provenanceAndVerification.plotsCount, 2);

  // 3. Submit to TRACES-NT Gateway
  const response = await connector.submitStatement('CONTAINER-ETH-2026-ROTTERDAM', dds);
  assert.equal(response.success, true);
  assert.equal(response.submission_status, 'ACCEPTED');
  assert.match(response.traces_reference_number, /^EU\.TRACES\.EUDR/);
  assert.match(response.customs_clearance_code, /^CLR-/);
  assert.ok(response.qr_verification_url.includes('traces.ec.europa.eu'));
  assert.equal(response.merkle_root_verified, true);

  // 4. Check Status
  const status = await connector.getStatus(response.traces_reference_number);
  assert.equal(status.status, 'VALIDATED');
  assert.equal(status.reference, response.traces_reference_number);
});

test('TRACES-NT B2G Connector - Rejects Corrupted Merkle Root or Deforested Plots', async () => {
  const connector = new TracesConnector();

  // Create DDS with missing or deforested plot
  const invalidDds = {
    reference_number: 'TEST-REF',
    submission_date: new Date().toISOString(),
    hs_code: '0901.11.00',
    commodity_description: 'Coffee',
    operator: { name: 'Op', eori_number: 'NL001', country: 'NL' },
    country_of_production: 'ET',
    net_mass_kg: 1000,
    bags_count: 10,
    plots_count: 1,
    merkle_provenance_root: 'short_hash', // Invalid SHA256 length
    risk_conclusion: 'NEGLIGIBLE_RISK',
    eudr_cut_off_date: '2020-12-31',
    compliance_statement: 'Decl',
    plots: [{
      plot_id: 'PLOT-BAD',
      farmer_name: 'Bad Actor',
      area_ha: 1.0,
      geometry_type: 'Point',
      coordinates: [0, 0],
      deforestation_risk: 0.85, // Illegal deforestation
    }],
  };

  // @ts-ignore
  await assert.rejects(
    async () => connector.submitStatement('LOT-BAD', invalidDds),
    /Merkle provenance root is missing or invalid|exceeds negligible deforestation risk/i
  );
});
