// Grounded knowledge base for Digital Dawood. Everything the assistant may
// say about Dawood comes from here. Client names are never included.
import { SHOWCASE } from './showcase';
import { TILES, JOBS, RANGE } from './site';

export type Fact = {
  id: string;
  topic: string;
  text: string;
  tags: string[];
  show?: { href: string; label: string }; // where on the site this is demonstrated
};

const profile: Fact[] = [
  { id: 'who', topic: 'About Dawood', text: 'Dawood Ali Khan is a digital solutions consultant and engineer based in Chicago. He scopes what a business needs, designs the data and architecture, builds it, and leads delivery from first call to launch. KADS Lab is his portfolio: Knowledge, Architecture, Development, Systems.', tags: ['who', 'about', 'what do you do', 'do', 'kads', 'dawood', 'yourself', 'background'], show: { href: '/about/', label: 'About page' } },
  { id: 'experience', topic: 'Experience', text: '7+ years building for the web, 30+ client sites shipped, and a team of 5+ developers led as Lead Web Developer. Most recently Digital Solutions Consultant at Link Creative (2025–2026); before that Lead Web Developer at Divine Design & Marketing (2022–2025).', tags: ['experience', 'years', 'team', 'lead', 'led', 'manager', 'career', 'resume', 'cv'], show: { href: '/about/', label: 'Experience timeline' } },
  { id: 'education', topic: 'Education', text: 'BS in Computer Science from Iqra University (2016–2020) with a machine learning focus. Final-year college projects: Arduino-based fault diagnosis for DC motors (the kind that drive conveyor belts), and big-data work on data clusters with classical machine-learning models (2019).', tags: ['education', 'degree', 'university', 'college', 'machine learning', 'ml', 'arduino', 'embedded', 'motor', 'big data', 'data'], show: { href: '/engineering/', label: 'Engineering page' } },
  { id: 'stack', topic: 'Stack', text: 'WordPress (custom plugins, themes, Salient/WPBakery), PHP and Laravel, JavaScript, React and TypeScript, Shopify and WooCommerce, HubSpot and GoHighLevel CRM, REST APIs, GA4, Google Tag Manager, Search Console, Rank Math. This site runs on Astro, React and TypeScript on Cloudflare Workers.', tags: ['stack', 'tech', 'technologies', 'tools', 'skills', 'languages', 'react', 'wordpress', 'php', 'shopify', 'typescript'], show: { href: '/engineering/', label: 'Engineering page' } },
  { id: 'crm', topic: 'CRM integration', text: 'His CRM work connects website lead capture to CRM workflows: forms validate and classify each inquiry, route it to the right pipeline or shared inbox, and trigger follow-ups. He has done this in HubSpot (forms, workflows, a shared sales inbox for an automotive restoration client) and GoHighLevel (a launch-list page with an embedded CRM form). The Lab has a working simulator of the routing logic.', tags: ['crm', 'hubspot', 'gohighlevel', 'lead', 'leads', 'routing', 'workflow', 'automation', 'integrate', 'integration', 'forms', 'inbox'], show: { href: '/lab/#routing', label: 'Lead routing demo' } },
  { id: 'roles', topic: 'Availability', text: 'Dawood is open to full-time roles in digital solutions, web engineering and technical project management, and takes on select website and systems projects. The fastest way to reach him is the Contact page.', tags: ['hire', 'hiring', 'available', 'availability', 'role', 'job', 'open', 'freelance', 'project', 'contact', 'email'], show: { href: '/contact/', label: 'Contact page' } },
  { id: 'nda', topic: 'Client names', text: 'Client work is covered by agreements with former employers, so client names, designs and code stay private. The industries, problems, decisions and his role are real, and he is happy to walk through any project in an interview.', tags: ['client', 'clients', 'nda', 'name', 'names', 'who was', 'which company', 'confidential'] },
  { id: 'twin', topic: 'Digital Dawood', text: 'Digital Dawood is this animated guide. Routine behavior (walking, sitting, reacting to scrolling and the cursor) runs locally in the browser. Questions go to a secure Cloudflare Worker that asks Claude, grounded only in this knowledge base. He can build the same kind of context-aware assistant for a business website.', tags: ['mascot', 'character', 'twin', 'digital dawood', 'this guide', 'animated', 'ai', 'assistant', 'build one', 'chatbot'], show: { href: '/engineering/digital-dawood/', label: 'How Digital Dawood works' } },
  { id: 'process', topic: 'How he works', text: 'K·A·D·S: Knowledge (discovery, audits, the real requirement), Architecture (content models, structure and integration points before any code), Development (build, test, review), Systems (launch, document, measure, keep it running). He picks the simplest tool that holds and leaves things maintainable.', tags: ['process', 'approach', 'how do you work', 'how you work', 'your process', 'method', 'workflow', 'philosophy', 'kads'] },
  { id: 'ai-use', topic: 'AI-assisted development', text: 'He uses AI tools daily for prototyping, investigation and drafting, and reviews every line before it ships.', tags: ['ai tools', 'claude', 'chatgpt', 'ai-assisted', 'copilot'] },
];

const cases: Fact[] = TILES.map((t) => ({
  id: `case-${t.id}`,
  topic: `${t.industry}: ${t.title}`,
  text: `${t.line} Role: ${t.role}. Built with ${t.stack}.`,
  tags: [t.industry.toLowerCase(), ...t.stack.toLowerCase().split(' · '), ...t.cats, ...t.title.toLowerCase().split(' ').filter((w) => w.length > 4)],
  show: { href: `/work/`, label: 'Case studies' },
}));

const live: Fact[] = SHOWCASE.flatMap((era) => era.items.map((i) => ({
  id: `live-${i.id}`,
  topic: `${i.title} (${era.employer}, ${era.years})`,
  text: `${i.did} Role: ${i.role}. Platform: ${i.platform}.`,
  tags: [i.industry.toLowerCase(), ...i.platform.toLowerCase().split(' · '), era.employer.toLowerCase(), ...i.title.toLowerCase().split(' ')],
  show: { href: '/work/', label: 'Live work' },
})));

const jobs: Fact = { id: 'jobs', topic: 'Work history', text: JOBS.map((j) => `${j.years}: ${j.role}, ${j.org}`).join('; ') + '.', tags: ['history', 'jobs', 'worked', 'companies', 'employers', 'timeline'] };
const range: Fact = { id: 'range', topic: 'Engineering range', text: RANGE.map((r) => `${r.title} (${r.when}): ${r.what}`).join(' '), tags: ['range', 'engineering', 'embedded', 'data'] };

export const FACTS: Fact[] = [...profile, jobs, range, ...cases, ...live];

// Small, dependency-free retrieval used both in the browser (offline
// fallback) and in the Worker (to pick the facts sent to the model).
export function search(q: string, n = 4): Fact[] {
  const words = q.toLowerCase().replace(/[^a-z0-9\s+.-]/g, ' ').split(/\s+/).filter((w) => w.length > 2);
  const text = q.toLowerCase();
  return FACTS
    .map((f) => {
      let score = 0;
      for (const t of f.tags) if (text.includes(t)) score += t.includes(' ') ? 4 : 3;
      for (const w of words) if (f.topic.toLowerCase().includes(w) || f.text.toLowerCase().includes(w)) score += 1;
      return { f, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map((x) => x.f);
}
