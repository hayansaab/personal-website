// POST /api/chat: answers visitors' questions about Hayan, streaming plain text back.
// Needs ANTHROPIC_API_KEY set in the Vercel project's environment variables.
import Anthropic from '@anthropic-ai/sdk';
import { PROFILE } from './_profile.js';

const client = new Anthropic();

const SYSTEM = `You are the assistant on Hayan Saab's personal website. Visitors (recruiters, mentors, classmates, collaborators) ask you questions about Hayan, and you answer from the profile below.

How to answer:
- Answer only from the profile. If something isn't in it, say you don't know and suggest emailing Hayan at saabh@whitman.edu. Never guess or invent details such as dates, numbers, employers, or opinions.
- Refer to Hayan by name. Hayan's pronouns aren't listed, so don't use he/she; repeat the name or use "they".
- Keep answers short and conversational: usually two to four sentences. Use a short list only when it genuinely helps.
- Write plain text. No markdown headings, bold, or tables. Links and emails can be written out as-is.
- Speak warmly and plainly, in the third person about Hayan. You are not Hayan.
- Don't share contact details beyond what's in the profile.
- If someone asks for something unrelated to Hayan (homework, code, general trivia), say briefly that you're here to answer questions about Hayan and offer a related question instead.
- Latency-sensitive; begin your visible answer immediately.

<profile>
${PROFILE}
</profile>`;

const MAX_TURNS = 12;
const MAX_CHARS = 1000;

const json = (status, body) => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json' },
});

export async function POST(request) {
  let messages;
  try {
    ({ messages } = await request.json());
  } catch {
    return json(400, { error: 'Invalid JSON.' });
  }

  // Accept only alternating user/assistant text turns, trimmed to the last few, ending on a user turn
  if (!Array.isArray(messages)) return json(400, { error: 'messages must be an array.' });
  messages = messages
    .filter((m) => (m?.role === 'user' || m?.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-MAX_TURNS)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));
  while (messages.length && messages[0].role !== 'user') messages.shift();
  if (!messages.length || messages.at(-1).role !== 'user') return json(400, { error: 'Ask a question first.' });

  const encoder = new TextEncoder();
  const body = new ReadableStream({
    async start(controller) {
      let wrote = false;
      try {
        const stream = client.beta.messages.stream({
          model: 'claude-opus-5-5',
          max_tokens: 2000,
          output_config: { effort: 'low' },
          system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
          messages,
          betas: ['server-side-fallback-2026-07-01'],
          fallbacks: 'default',
        });
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(event.delta.text));
            wrote = true;
          }
        }
        const final = await stream.finalMessage();
        if (!wrote) {
          controller.enqueue(encoder.encode(final.stop_reason === 'refusal'
            ? "I can't help with that one. Ask me about Hayan's work, research, or background."
            : "I don't have an answer for that. Try emailing Hayan at saabh@whitman.edu."));
        }
      } catch (err) {
        console.error(err);
        const msg = err instanceof Anthropic.RateLimitError
          ? "I'm getting a lot of questions right now. Try again in a minute."
          : "Something went wrong on my end. Try again, or email Hayan at saabh@whitman.edu.";
        controller.enqueue(encoder.encode(wrote ? `\n\n${msg}` : msg));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
  });
}
