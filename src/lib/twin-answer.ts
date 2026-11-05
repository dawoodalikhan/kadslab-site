// Digital Dawood's knowledge-based answers: no AI, no network, no cost.
//
// Used in two places:
//   - the Worker (/api/ask) when no AI key is configured, or the AI fails;
//   - the browser, when /api/ask can't be reached at all.
//
// Every factual sentence comes verbatim from src/data/knowledge.ts. The only
// text written here is conversational framing ("Here's the short version")
// and fixed replies for greetings, thanks and off-limits questions, none of
// which states anything about Dawood that isn't in the knowledge base.
import { rank, type Fact } from '../data/knowledge';

export type Show = { href: string; label: string };
/** `knowledge` = assembled from approved facts. `ai` = phrased by a model, grounded in the same facts. */
export type Source = 'knowledge' | 'ai';
export type Answer = { answer: string; show: Show | null; source: Source };

const CONTACT: Show = { href: '/contact/', label: 'Contact page' };

/** Questions are capped here and in the Worker; the chat input has the same maxLength. */
export const MAX_QUESTION = 500;

const TOPICS = 'his experience, skills and stack, CRM integration, the Lab demos, the virtual hardware lab, how he works, or whether he’s open to roles';

// Fixed replies, checked before the knowledge search. Order matters: the
// first match wins.
const INTENTS: { test: RegExp; answer: string; show?: Show }[] = [
  {
    // Pay, pricing and personal details are for Dawood to discuss himself.
    test: /\b(salary|salaries|compensation|(hourly|day|your|his) rates?|pricing|price|quote|how much (do|does|would) (you|he) charge|cost|budget|get paid|phone number|home address|how old|married|religio\w*|politic\w*|password|ssn|social security)\b/i,
    answer: 'That’s one Dawood would rather answer himself, so I don’t guess at it. The Contact page reaches him directly.',
    show: CONTACT,
  },
  {
    test: /\b(are you (an? )?(ai|bot|robot|real|human|chat ?gpt|claude|llm)|is this (an? )?(ai|bot|chat ?gpt|claude)|who (made|built|created) you)\b/i,
    answer: 'I’m Digital Dawood, the animated guide on this site. Right now I answer from a set of facts Dawood wrote and approved, not from an AI model. Each answer is labeled so you can tell which kind you got.',
    show: { href: '/engineering/digital-dawood/', label: 'How Digital Dawood works' },
  },
  {
    test: /^\s*(hi+|hey+|hello+|yo|hiya|howdy|sup|good (morning|afternoon|evening))\b[\s\w]{0,12}[!.?]*\s*$/i,
    answer: `Hey! I’m Digital Dawood. Ask me about ${TOPICS}.`,
  },
  {
    test: /^\s*(thanks|thank you|thank u|thx|ty|cheers|appreciate it|great|cool|nice|awesome|ok(ay)?)\b[\s\w!.]{0,24}$/i,
    answer: 'Anytime. Anything else you’d like to know?',
  },
  {
    test: /^\s*(how are you|how'?s it going|how are things|what'?s up)\b[\s\w]{0,12}[!.?]*\s*$/i,
    answer: `Running smoothly, thanks. Ask me about ${TOPICS}.`,
  },
  {
    test: /^\s*(what can (you|i) (do|ask)( you)?|what do you know|help|what should i ask)\s*[!.?]*\s*$/i,
    answer: `I can tell you about ${TOPICS}. Try one of the suggestions below, or ask in your own words.`,
  },
];

// A short, honest lead-in per kind of fact. Optional: many facts read fine alone.
const LEADS: Record<string, string> = {
  who: 'Here’s the short version.',
  experience: 'Here’s the career summary.',
  education: 'Here’s the education side.',
  stack: 'Here’s the toolbox.',
  crm: 'Here’s how the CRM work fits together.',
  roles: 'Here’s where things stand.',
  hardware: 'Here’s what the hardware lab does.',
  roadmap: 'To be clear, these are planned, not finished.',
  process: 'Here’s how he works.',
};
const leadFor = (f: Fact) =>
  LEADS[f.id] ?? (f.id.startsWith('case-') ? 'Here’s one from the case studies.' : f.id.startsWith('live-') ? 'That one’s from his live client work.' : '');

/** A light nudge toward facts that match the page the visitor is on. */
function pageBoost(f: Fact, page: string): number {
  if (page.startsWith('/lab')) return f.show?.href.startsWith('/lab') ? 1 : 0;
  if (page.startsWith('/work')) return f.id.startsWith('case-') || f.id.startsWith('live-') || f.id === 'nda' ? 1 : 0;
  if (page.startsWith('/engineering')) return ['education', 'range', 'twin', 'process', 'stack'].includes(f.id) ? 1 : 0;
  return 0;
}

/** Minimum score for a confident answer: one tag match, or three meaningful words. */
const CONFIDENT = 3;

export function answerFromKnowledge(question: string, page = '/'): Answer {
  const q = question.trim().slice(0, MAX_QUESTION);
  for (const i of INTENTS) if (i.test.test(q)) return { answer: i.answer, show: i.show ?? null, source: 'knowledge' };

  const ranked = rank(q)
    .map((x) => ({ ...x, score: x.score + pageBoost(x.f, page) }))
    .sort((a, b) => b.score - a.score);
  const top = ranked[0];
  if (!top || top.score < CONFIDENT) {
    return {
      answer: `I don’t have an approved answer for that, and I won’t make one up. I can tell you about ${TOPICS}. For anything else, Dawood can answer on the Contact page.`,
      show: CONTACT,
      source: 'knowledge',
    };
  }

  const lead = leadFor(top.f);
  let answer = lead ? `${lead} ${top.f.text}` : top.f.text;
  // Mention a strong second match as a follow-up topic (its name only, no new claims).
  const next = ranked.slice(1).find((x) => x.score >= Math.max(CONFIDENT, top.score * 0.75) && x.f.topic !== top.f.topic);
  if (next) answer += ` You can also ask me about ${next.f.topic}.`;
  return { answer, show: top.f.show ?? null, source: 'knowledge' };
}
