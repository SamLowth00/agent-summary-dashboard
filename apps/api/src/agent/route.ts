import express, { Router } from 'express';
import { HumanMessage } from '@langchain/core/messages';
import { getAssistantAgent } from './agent';

export const assistantRouter = Router();

assistantRouter.use(express.json());

const extractText = (chunk: unknown): string => {
  const content = (chunk as { content?: unknown } | undefined)?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) =>
        typeof part === 'object' && part !== null && 'text' in part
          ? String((part as { text: unknown }).text)
          : ''
      )
      .join('');
  }
  return '';
};
// SSE endpoint for the conversational assistant
assistantRouter.post('/chat', async (req, res) => {
  const { threadId, message } = (req.body ?? {}) as {
    threadId?: string;
    message?: string;
  };

  if (!threadId || !message) {
    res.status(400).json({ error: 'threadId and message are required' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (event: string, data: unknown) =>
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  let clientGone = false;
  res.on('close', () => {
    clientGone = true;
  });

  try {
    const agent = await getAssistantAgent();
    const events = agent.streamEvents(
      { messages: [new HumanMessage(message)] },
      { version: 'v2', configurable: { thread_id: threadId } }
    );

    for await (const event of events) {
      if (clientGone) break;
      if (event.event === 'on_chat_model_stream') {
        const text = extractText(event.data?.chunk);
        if (text) send('token', { text });
      }
    }

    if (!clientGone) {
      send('done', {});
      res.end();
    }
  } catch (err) {
    if (!clientGone) {
      send('error', {
        message: err instanceof Error ? err.message : 'Assistant failed',
      });
      res.end();
    }
  }
});
