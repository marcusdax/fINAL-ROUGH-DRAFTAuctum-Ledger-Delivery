/**
 * server/routes/eudr.ts — EUDR (Regulation EU 2023/1115) API Endpoints for Auctum Ledger.
 */

import { Router } from 'express';
import { EudrEngine, type EudrPlotInput, type DueDiligenceStatement } from '../lib/eudr-engine.js';
import { TracesConnector, type TracesSubmissionResponse } from '../lib/traces-connector.js';
import { problem, sendProblem } from '../lib/problem.js';
import { singleEnvelope } from './helpers.js';

export const eudrRouter = Router();

// In-memory store for generated Due Diligence Statements and TRACES responses
const lotStatements = new Map<string, DueDiligenceStatement>();
const tracesSubmissions = new Map<string, TracesSubmissionResponse>();
const tracesConnector = new TracesConnector();

/**
 * Validate an individual farmer plot for EUDR compliance.
 */
eudrRouter.post('/catalog/eudr/validate-plot', (req, res, next) => {
  try {
    const plot = req.body as EudrPlotInput;
    if (!plot) {
      sendProblem(res, problem(400, 'AL-EUDR-1001', 'Plot payload required'));
      return;
    }

    const result = EudrEngine.validatePlot(plot);
    res.status(result.valid ? 200 : 422).json(singleEnvelope(result));
  } catch (err) {
    next(err);
  }
});

/**
 * Generate official EU TRACES Due Diligence Statement for an export coffee lot.
 */
eudrRouter.post('/catalog/eudr/lots/:id/dds', (req, res, next) => {
  try {
    const lotId = req.params.id;
    const { operatorName, operatorEori, operatorCountry, countryOfProduction, netMassKg, bagsCount, plots } = req.body || {};

    if (!operatorName || !operatorEori || !Array.isArray(plots) || plots.length === 0) {
      sendProblem(res, problem(400, 'AL-EUDR-1002', 'operatorName, operatorEori, and at least 1 constituent plot required'));
      return;
    }

    const dds = EudrEngine.generateDueDiligenceStatement({
      lotId,
      operatorName,
      operatorEori,
      operatorCountry: operatorCountry || 'NL',
      countryOfProduction: countryOfProduction || 'ET',
      netMassKg: Number(netMassKg) || 19200,
      bagsCount: Number(bagsCount) || 320,
      plots,
    });

    lotStatements.set(lotId, dds);
    res.status(201).json(singleEnvelope(dds));
  } catch (err: any) {
    if (err.message?.includes('non-compliant plots detected')) {
      sendProblem(res, problem(422, 'AL-EUDR-1003', err.message));
      return;
    }
    next(err);
  }
});

/**
 * Fetch Due Diligence Statement in JSON format.
 */
eudrRouter.get('/catalog/eudr/lots/:id/dossier.json', (req, res, next) => {
  try {
    const lotId = req.params.id;
    const dds = lotStatements.get(lotId);
    if (!dds) {
      sendProblem(res, problem(404, 'AL-EUDR-1004', `No Due Diligence Statement registered for lot ${lotId}`));
      return;
    }
    res.json(singleEnvelope(dds));
  } catch (err) {
    next(err);
  }
});

/**
 * Fetch printable HTML Due Diligence Dossier for customs inspectors.
 */
eudrRouter.get('/catalog/eudr/lots/:id/dossier.html', (req, res, next) => {
  try {
    const lotId = req.params.id;
    const dds = lotStatements.get(lotId);
    if (!dds) {
      res.status(404).send(`<h3>404: No Due Diligence Statement found for lot ${lotId}</h3>`);
      return;
    }
    const html = EudrEngine.renderDossierHtml(dds);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err) {
    next(err);
  }
});

/**
 * Direct One-Click Submission to European Commission TRACES-NT B2G Gateway.
 */
eudrRouter.post('/catalog/eudr/lots/:id/traces/submit', async (req, res, next) => {
  try {
    const lotId = req.params.id;
    let dds = lotStatements.get(lotId);

    // If DDS not pre-generated, allow payload in body or generate on the fly
    if (!dds && req.body?.plots) {
      const { operatorName, operatorEori, operatorCountry, countryOfProduction, netMassKg, bagsCount, plots } = req.body;
      dds = EudrEngine.generateDueDiligenceStatement({
        lotId,
        operatorName: operatorName || 'Auctum Specialty Imports B.V.',
        operatorEori: operatorEori || 'NL849201948',
        operatorCountry: operatorCountry || 'NL',
        countryOfProduction: countryOfProduction || 'ET',
        netMassKg: Number(netMassKg) || 19200,
        bagsCount: Number(bagsCount) || 320,
        plots,
      });
      lotStatements.set(lotId, dds);
    }

    if (!dds) {
      sendProblem(res, problem(404, 'AL-EUDR-1005', `Due Diligence Statement for lot ${lotId} must be generated before TRACES submission`));
      return;
    }

    const tracesResponse = await tracesConnector.submitStatement(lotId, dds);
    tracesSubmissions.set(lotId, tracesResponse);

    res.status(200).json(singleEnvelope(tracesResponse));
  } catch (err: any) {
    sendProblem(res, problem(422, 'AL-TRACES-1001', err.message || 'TRACES submission failed'));
  }
});

/**
 * Check TRACES-NT Submission & Clearance Status.
 */
eudrRouter.get('/catalog/eudr/lots/:id/traces/status', async (req, res, next) => {
  try {
    const lotId = req.params.id;
    const sub = tracesSubmissions.get(lotId);
    if (!sub) {
      sendProblem(res, problem(404, 'AL-TRACES-1002', `No TRACES submission found for lot ${lotId}`));
      return;
    }

    const status = await tracesConnector.getStatus(sub.traces_reference_number);
    res.json(singleEnvelope({
      ...sub,
      current_gateway_status: status,
    }));
  } catch (err) {
    next(err);
  }
});

