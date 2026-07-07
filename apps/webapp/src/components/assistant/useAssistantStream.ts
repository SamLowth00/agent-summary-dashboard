import { useCallback, useRef, useState } from 'react';

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3333';

export const useAssistantStream = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const threadIdRef = useRef<string>(crypto.randomUUID());

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      setError(null);
      setMessages((prev) => [
        ...prev,
        { role: 'user', content: trimmed },
        { role: 'assistant', content: '' },
      ]);
      setIsStreaming(true);

      const appendToAssistant = (chunk: string) =>
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === 'assistant') {
            next[next.length - 1] = { ...last, content: last.content + chunk };
          }
          return next;
        });

      const handleFrame = (frame: string) => {
        let eventName = 'message';
        let data = '';
        for (const line of frame.split('\n')) {
          if (line.startsWith('event:')) eventName = line.slice(6).trim();
          else if (line.startsWith('data:')) data += line.slice(5).trim();
        }
        if (eventName === 'token') {
          appendToAssistant((JSON.parse(data) as { text: string }).text);
        } else if (eventName === 'error') {
          setError((JSON.parse(data) as { message: string }).message);
        }
      };

      try {
        const res = await fetch(`${API_BASE}/assistant/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            threadId: threadIdRef.current,
            message: trimmed,
          }),
        });
        if (!res.ok || !res.body)
          throw new Error(`Request failed (${res.status})`);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let sep;
          while ((sep = buffer.indexOf('\n\n')) !== -1) {
            handleFrame(buffer.slice(0, sep));
            buffer = buffer.slice(sep + 2);
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong');
      } finally {
        setIsStreaming(false);
      }
    },
    [isStreaming]
  );

  return { messages, isStreaming, error, send };
};
