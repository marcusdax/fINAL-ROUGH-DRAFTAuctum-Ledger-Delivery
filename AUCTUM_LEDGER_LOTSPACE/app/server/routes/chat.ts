import { Router } from 'express';
import { problem, sendProblem } from '../lib/problem.js';
import { singleEnvelope } from './helpers.js';

/**
 * AI chat proxy (brief §6). Mounted BEFORE JWT auth — it uses its own
 * server-side API-key scheme (OPENAI_API_KEY). When the key is absent the
 * router answers with a dev stub echo so the widget stays usable locally.
 */

export const chatRouter = Router();

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const SYSTEM_PROMPT =
  'You are the Auctum Ledger assistant for specialty green-coffee trade. ' +
  'Voice: specialty-literate, numbers before adjectives, honest about scarcity.';

function parseMessages(value: unknown): ChatMessage[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const messages: ChatMessage[] = [];
  for (const raw of value) {
    if (raw === null || typeof raw !== 'object') return null;
    const { role, content } = raw as Record<string, unknown>;
    if (
      (role !== 'system' && role !== 'user' && role !== 'assistant') ||
      typeof content !== 'string' ||
      content.length === 0
    ) {
      return null;
    }
    messages.push({ role, content });
  }
  return messages;
}

chatRouter.post('/', async (req, res, next) => {
  try {
    const messages = parseMessages(req.body?.messages);
    if (!messages) {
      sendProblem(
        res,
        problem(400, 'AL-CHAT-1001', 'messages must be a non-empty array of {role, content}', [
          { field: 'messages', code: 'invalid', message: 'non-empty array of {role, content} required' },
        ]),
      );
      return;
    }
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      const lastUser = [...messages].reverse().find((m) => m.role === 'user');
      res.json(
        singleEnvelope({
          id: 'chatcmpl-dev-stub',
          model: 'dev-stub',
          stub: true,
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: `[dev stub] OPENAI_API_KEY is not set. Echoing: ${lastUser?.content ?? ''}`,
              },
              finish_reason: 'stop',
            },
          ],
        }),
      );
      return;
    }
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model: typeof req.body.model === 'string' ? req.body.model : 'gpt-4o-mini',
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
    });
    res.json(singleEnvelope(completion));
  } catch (err) {
    next(err);
  }
});
