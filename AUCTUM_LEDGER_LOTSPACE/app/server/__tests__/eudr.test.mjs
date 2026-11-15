import test from 'node:test';
import assert from 'node:assert/strict';
import { EudrEngine } from '../lib/eudr-engine.ts';

test('EUDR Engine - Smallholder Point Plot Validation (< 4 ha)', () => {
  // Smallholder farm in Yirgacheffe, Ethiopia (1.65 hectares)
  const plot = {
    plot_id: 'PLOT-ETH-YIRG-001',
    farmer_id: 'FARMER-ETH-Bekele-89',
    farmer_name: 'Bekele Desta',
    country_code: 'ET',
    area_hectares: 1.65,
    geometry_type: 'Point',
    coordinates: [38.254192, 5.921448],
    elevation_meters: 2020,
    baseline_canopy_2020_pct: 84.0,
    current_canopy_pct: 84.5,
    deforestation_risk_score: 0.008, // Negligible risk
    legal_declarations: {
      land_tenure_legal: true,
      customary_rights_respected: true,
      national_labor_standards_met: true,
      anti_corruption_compliant: true,
    },
  };

  const res = EudrEngine.validatePlot(plot);
  assert.equal(res.valid, true);
  assert.equal(res.risk_classification, 'NEGLIGIBLE_RISK');
  assert.equal(typeof res.plot_hash, 'string');
  assert.equal(res.plot_hash.length, 64);
});

test('EUDR Engine - Large Estate Polygon Boundary Validation (≥ 4 ha)', () => {
  // Commercial estate in Huila, Colombia (12.4 hectares)
  // Polygon closed: vertex 0 matches vertex 4
  const estatePlot = {
    plot_id: 'PLOT-COL-HUILA-099',
    farmer_id: 'ESTATE-COL-Finca-Esperanza',
    farmer_name: 'Finca La Esperanza',
    country_code: 'CO',
    area_hectares: 12.4,
    geometry_type: 'Polygon',
    coordinates: [
      [-75.981442, 2.314502],
      [-75.978521, 2.316881],
      [-75.976412, 2.312903],
      [-75.980119, 2.310844],
      [-75.981442, 2.314502], // Closed vertex
    ],
    deforestation_risk_score: 0.015,
    legal_declarations: {
      land_tenure_legal: true,
      customary_rights_respected: true,
      national_labor_standards_met: true,
      anti_corruption_compliant: true,
    },
  };

  const res = EudrEngine.validatePlot(estatePlot);
  assert.equal(res.valid, true);
  assert.equal(res.risk_classification, 'NEGLIGIBLE_RISK');

  // Test failure when plot ≥ 4 ha provides only Point geometry
  // @ts-ignore
  estatePlot.geometry_type = 'Point';
  estatePlot.coordinates = [-75.981442, 2.314502];
  const failRes = EudrEngine.validatePlot(estatePlot);
  assert.equal(failRes.valid, false);
  assert.match(failRes.errors[0], /must provide Polygon boundary/i);
});

test('EUDR Engine - Post-2020 Deforestation Rejection', () => {
  const illegalDeforestedPlot = {
    plot_id: 'PLOT-BRAZIL-CERR-404',
    farmer_id: 'DEFOREST-FARM-X',
    farmer_name: 'Illegal Land Clearing Corp',
    country_code: 'BR',
    area_hectares: 2.5,
    geometry_type: 'Point',
    coordinates: [-47.882166, -15.794229],
    deforestation_risk_score: 0.42, // Substantial deforestation detected after 2020-12-31
  };

  const res = EudrEngine.validatePlot(illegalDeforestedPlot);
  assert.equal(res.valid, false);
  assert.equal(res.risk_classification, 'NON_NEGLIGIBLE_RISK');
  assert.match(res.errors[0], /Deforestation detected after cut-off date 2020-12-31/i);
});

test('EUDR Engine - Anti-Dilution Merkle Tree and TRACES Due Diligence Statement (DDS)', () => {
  const plot1 = {
    plot_id: 'PLOT-ETH-01',
    farmer_id: 'F-01',
    farmer_name: 'Farmer Abebe',
    country_code: 'ET',
    area_hectares: 1.2,
    geometry_type: 'Point',
    coordinates: [38.2541, 5.9214],
    deforestation_risk_score: 0.01,
  };

  const plot2 = {
    plot_id: 'PLOT-ETH-02',
    farmer_id: 'F-02',
    farmer_name: 'Farmer Chala',
    country_code: 'ET',
    area_hectares: 2.1,
    geometry_type: 'Point',
    coordinates: [38.2599, 5.9265],
    deforestation_risk_score: 0.02,
  };

  const merkleRoot = EudrEngine.computePlotsMerkleRoot([plot1, plot2]);
  assert.equal(typeof merkleRoot, 'string');
  assert.equal(merkleRoot.length, 64);

  // Generate TRACES Due Diligence Statement for an export container (320 bags = 19,200 kg)
  const dds = EudrEngine.generateDueDiligenceStatement({
    lotId: 'AUCTUM-LOT-ETH-2026-CONTAINER-01',
    operatorName: 'Auctum Specialty Imports B.V.',
    operatorEori: 'NL849201948',
    operatorCountry: 'NL',
    countryOfProduction: 'ET',
    netMassKg: 19200,
    bagsCount: 320,
    plots: [plot1, plot2],
  });

  assert.match(dds.reference_number, /^EUDR-DDS-2026/);
  assert.equal(dds.hs_code, '0901.11.00');
  assert.equal(dds.plots_count, 2);
  assert.equal(dds.risk_conclusion, 'NEGLIGIBLE_RISK');
  assert.equal(dds.eudr_cut_off_date, '2020-12-31');
  assert.equal(dds.merkle_provenance_root, merkleRoot);

  // Render Printable HTML Dossier for customs inspectors
  const html = EudrEngine.renderDossierHtml(dds);
  assert.ok(html.includes('EU Deforestation Regulation (EUDR) Due Diligence Dossier'));
  assert.ok(html.includes(dds.reference_number));
  assert.ok(html.includes(merkleRoot));
  assert.ok(html.includes('Farmer Abebe'));
  assert.ok(html.includes('19,200 kg'));
});
