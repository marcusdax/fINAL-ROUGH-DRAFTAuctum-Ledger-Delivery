import crypto from 'node:crypto';
import { Router } from 'express';
import { db, query } from '../db/index.js';
import { memory, type AutomationRuleRow } from '../db/memory.js';
import { emitEvent } from '../lib/kafka.js';
import { problem, sendProblem } from '../lib/problem.js';
import { asString, listEnvelope, singleEnvelope } from './helpers.js';

export const automationRulesRouter = Router();

/** Automation action enum (brief §1). */
export const AUTOMATION_ACTIONS = [
  'SEND_EMAIL',
  'SEND_SMS',
  'UPDATE_CRM_LIFECYCLE',
  'EXECUTE_CAMPAIGN_HALT',
] as const;

function actionsAreValid(actions: unknown): actions is Array<Record<string, unknown>> {
  return (
    Array.isArray(actions) &&
    actions.length > 0 &&
    actions.every(
      (a) =>
        a !== null &&
        typeof a === 'object' &&
        typeof (a as Record<string, unknown>).type === 'string' &&
        (AUTOMATION_ACTIONS as readonly string[]).includes(
          (a as Record<string, unknown>).type as string,
        ),
    )
  );
}

automationRulesRouter.get('/automation-rules', async (_req, res, next) => {
  try {
    if (db.pg) {
      const rows = await query<AutomationRuleRow>(
        'SELECT * FROM automation_rules ORDER BY created_at ASC',
      );
      res.json(listEnvelope(rows));
      return;
    }
    res.json(listEnvelope(memory.automationRules));
  } catch (err) {
    next(err);
  }
});

automationRulesRouter.get('/automation-rules/:id', async (req, res, next) => {
  try {
    if (db.pg) {
      const rows = await query<AutomationRuleRow>(
        'SELECT * FROM automation_rules WHERE id = $1 OR rule_code = $1',
        [req.params.id],
      );
      if (rows.length === 0) {
        sendProblem(res, problem(404, 'AL-AUT-1001', `Automation rule ${req.params.id} not found`));
        return;
      }
      res.json(singleEnvelope(rows[0]));
      return;
    }
    const row = memory.automationRules.find(
      (r) => r.id === req.params.id || r.rule_code === req.params.id,
    );
    if (!row) {
      sendProblem(res, problem(404, 'AL-AUT-1001', `Automation rule ${req.params.id} not found`));
      return;
    }
    res.json(singleEnvelope(row));
  } catch (err) {
    next(err);
  }
});

automationRulesRouter.post('/automation-rules', async (req, res, next) => {
  try {
    const ruleCode = asString(req.body?.rule_code);
    const ruleName = asString(req.body?.rule_name);
    const triggerEvent = asString(req.body?.trigger_event);
    if (!ruleCode || !ruleName || !triggerEvent || !actionsAreValid(req.body?.actions)) {
      sendProblem(
        res,
        problem(
          400,
          'AL-AUT-1001',
          'rule_code, rule_name, trigger_event and a non-empty actions array with valid types are required',
          [
            ...(ruleCode ? [] : [{ field: 'rule_code', code: 'required', message: 'rule_code is required' }]),
            ...(ruleName ? [] : [{ field: 'rule_name', code: 'required', message: 'rule_name is required' }]),
            ...(triggerEvent
              ? []
              : [{ field: 'trigger_event', code: 'required', message: 'trigger_event is required' }]),
            ...(actionsAreValid(req.body?.actions)
              ? []
              : [
                  {
                    field: 'actions',
                    code: 'invalid',
                    message: `actions must be a non-empty array with type in ${AUTOMATION_ACTIONS.join(', ')}`,
                  },
                ]),
          ],
        ),
      );
      return;
    }
    if (db.pg) {
      const rows = await query<AutomationRuleRow>(
        `INSERT INTO automation_rules (rule_code, campaign_id, rule_name, trigger_event, conditions_json, actions)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [
          ruleCode,
          asString(req.body.campaign_id) ?? null,
          ruleName,
          triggerEvent,
          JSON.stringify(req.body.conditions_json ?? {}),
          JSON.stringify(req.body.actions),
        ],
      );
      await emitEvent(
        'al.automation-rule.created',
        rows[0].id,
        rows[0],
        'al.automation-rule.created',
      );
      res.status(201).json(singleEnvelope(rows[0]));
      return;
    }
    const ts = new Date().toISOString();
    const row: AutomationRuleRow = {
      id: crypto.randomUUID(),
      rule_code: ruleCode,
      campaign_id: asString(req.body.campaign_id) ?? null,
      rule_name: ruleName,
      trigger_event: triggerEvent,
      conditions_json: req.body.conditions_json ?? {},
      version: 1,
      status: 'armed',
      actions: req.body.actions,
      created_at: ts,
      updated_at: ts,
    };
    memory.automationRules.push(row);
    await emitEvent('al.automation-rule.created', row.id, row, 'al.automation-rule.created');
    res.status(201).json(singleEnvelope(row));
  } catch (err) {
    next(err);
  }
});
