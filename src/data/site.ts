// Site-wide content. Client work is described by industry only (NDA).

export const SITE = {
  name: 'KADS Lab',
  owner: 'Dawood Ali Khan',
  email: 'dawoodali.1071@gmail.com',
  linkedin: 'https://linkedin.com/in/dawood-ali-khan-749927137',
  github: 'https://github.com/dawoodalikhan',
  repo: 'https://github.com/dawoodalikhan/kadslab-site',
  resume: '/resume.pdf',
  location: 'Chicago, IL',
};

export const NAV = [
  { href: '/', label: 'Home' },
  { href: '/work/', label: 'Work' },
  { href: '/lab/', label: 'Lab' },
  { href: '/engineering/', label: 'Engineering' },
  { href: '/about/', label: 'About' },
];

export type Discipline = 'web' | 'cms' | 'crm' | 'lead' | 'seo' | 'content';

export type Tile = {
  id: string;
  cats: Discipline[];
  industry: string;
  title: string;
  line: string;
  role: string;
  stack: string;
  mock: {
    brand: string;
    hero: string;
    cta: string;
    chips: string[];
    rows: { a: string; b: string }[];
    colors: { bg: string; fg: string; head: string; headFg: string; cta: string; ctaFg: string; card: string; img: string; line: string };
  };
};

export const TILES: Tile[] = [
  {
    id: 'real-estate', cats: ['web', 'cms'], industry: 'Multifamily real estate',
    title: 'A listings engine that replaced hand-built pages',
    line: 'Every property had its own hand-built page. I replaced that with a data model, an importer and templates, so the portfolio can grow without a developer.',
    role: 'Architecture, plugin development, launch', stack: 'WordPress · PHP · Custom post types',
    mock: {
      brand: '■■■■■■ RESIDENTIAL', hero: 'Homes near the train, run by people who answer.', cta: 'View communities',
      chips: ['All', 'Owned', 'Managed', 'Town ▾'],
      rows: Array.from({ length: 12 }, (_, i) => ({ a: `Property ${String(i + 1).padStart(2, '0')}`, b: `${[48, 64, 36, 72, 40, 56, 44, 52, 60, 38, 46, 58][i]} units` })),
      colors: { bg: '#EDEFF1', fg: '#1E2933', head: '#23303B', headFg: '#FFFFFF', cta: '#FFFFFF', ctaFg: '#23303B', card: '#FFFFFF', img: '#C3CDD6', line: '#B6C0C9' },
    },
  },
  {
    id: 'automotive', cats: ['web', 'crm', 'lead'], industry: 'Automotive restoration',
    title: 'One inquiry form, routed to the right team',
    line: 'A large service site with overlapping pages and forms that all landed in one place. I restructured it and connected each form to CRM workflows.',
    role: 'Delivery lead, site architecture, CRM setup', stack: 'WordPress · HubSpot · Figma',
    mock: {
      brand: 'APEX & IRON', hero: 'Classic cars, restored to the standard they left the factory with.', cta: 'Start a build',
      chips: ['Restoration', 'Engines', 'Gallery', 'Shop'],
      rows: [['Light restoration', 'Package'], ['Modified build', 'Package'], ['Signature build', 'Package'], ['Engine rebuild', 'Service'], ['Performance engine', 'Service'], ['Collection care', 'Service'], ['1973 coupe', 'Gallery'], ['1989 targa', 'Gallery'], ['1995 coupe', 'Gallery'], ['Suspension', 'Partner'], ['Detailing', 'Service'], ['FAQ', 'Page']].map(([a, b]) => ({ a, b })),
      colors: { bg: '#111214', fg: '#EDE8DF', head: '#111214', headFg: '#EDE8DF', cta: '#D9A441', ctaFg: '#111214', card: '#1D1E21', img: '#3A3B40', line: '#3A3B40' },
    },
  },
  {
    id: 'media', cats: ['web', 'cms'], industry: 'Media production',
    title: 'An episode platform inside a page builder',
    line: 'Shows and episodes needed their own structure, a player that kept playing between pages, and filtering. I built it without fighting the theme.',
    role: 'Architecture, custom templates, front end', stack: 'WordPress · ACF · AJAX',
    mock: {
      brand: 'LOW LIGHT STUDIO', hero: 'Shows recorded in the room next door.', cta: 'Book the studio',
      chips: ['Shows', 'Episodes', 'Studios'],
      rows: [['Ep. 14', '42 min'], ['Ep. 13', '38 min'], ['Ep. 12', '51 min'], ['Ep. 11', '33 min'], ['Ep. 10', '27 min'], ['Ep. 09', '45 min'], ['Studio A', 'Podcast'], ['Studio B', 'Video'], ['Studio C', 'Live'], ['Ep. 08', '29 min'], ['Ep. 07', '36 min'], ['Ep. 06', '40 min']].map(([a, b]) => ({ a, b })),
      colors: { bg: '#F3EEFA', fg: '#231D33', head: '#2A2340', headFg: '#FFFFFF', cta: '#FFFFFF', ctaFg: '#2A2340', card: '#FFFFFF', img: '#D6CCE8', line: '#CFC4E2' },
    },
  },
  {
    id: 'staffing', cats: ['seo', 'content'], industry: 'Staffing & recruitment',
    title: 'Six industries, five locations, one consistent site',
    line: 'A multi-location staffing site where every page type needed the right structured data and links to the right industry and location pages.',
    role: 'Technical SEO, schema, content rules', stack: 'WordPress · Rank Math · Schema',
    mock: {
      brand: 'NORTHLINE STAFFING', hero: 'The right people, on site Monday.', cta: 'Find talent',
      chips: ['Industrial', 'Office', 'Hospitality', 'IT'],
      rows: [['Industrial', 'Industry'], ['Office', 'Industry'], ['Hospitality', 'Industry'], ['Finance', 'Industry'], ['IT', 'Industry'], ['Executive', 'Industry'], ['Location 01', 'Office'], ['Location 02', 'Office'], ['Location 03', 'Office'], ['Location 04', 'Office'], ['Location 05', 'Office'], ['Open roles', 'Jobs']].map(([a, b]) => ({ a, b })),
      colors: { bg: '#F1F4EF', fg: '#1C2A1F', head: '#1F3A2A', headFg: '#FFFFFF', cta: '#E8C547', ctaFg: '#1F3A2A', card: '#FFFFFF', img: '#C9D6C6', line: '#BFCCBC' },
    },
  },
  {
    id: 'childcare', cats: ['content', 'seo'], industry: 'Early childhood education',
    title: 'A content system for six locations',
    line: 'High-volume articles where every post had to link to every location, avoid repeating past topics and pass the same SEO rules.',
    role: 'Content operations, SEO rules, reporting', stack: 'WordPress · GA4 · Search Console',
    mock: {
      brand: 'LITTLE OAK', hero: 'Where curious kids grow into confident ones.', cta: 'Schedule a tour',
      chips: ['Infants', 'Toddlers', 'Preschool'],
      rows: [['Campus 01', 'Tour'], ['Campus 02', 'Tour'], ['Campus 03', 'Tour'], ['Campus 04', 'Tour'], ['Campus 05', 'Tour'], ['Campus 06', 'Tour'], ['First week', 'Article'], ['Outdoor play', 'Article'], ['Routines', 'Article'], ['Milestones', 'Article'], ['Nutrition', 'Article'], ['Readiness', 'Article']].map(([a, b]) => ({ a, b })),
      colors: { bg: '#FFF9EC', fg: '#3A2A12', head: '#F4B63F', headFg: '#3A2A12', cta: '#3A2A12', ctaFg: '#FFF9EC', card: '#FFFFFF', img: '#F6DFA8', line: '#EAD39A' },
    },
  },
  {
    id: 'hospitality', cats: ['crm', 'lead', 'web'], industry: 'Hospitality & concierge',
    title: 'A launch page that shipped when the platform wouldn’t',
    line: 'The site builder refused to render the CRM form. I built a standalone launch-list page with the form embedded and deployed it the same day.',
    role: 'Front end, CRM form integration, deployment', stack: 'HTML/CSS · GoHighLevel · cPanel',
    mock: {
      brand: 'MAISON NOIR', hero: 'Something worth waiting for is almost here.', cta: 'Join the list',
      chips: ['Launch list', 'Members'],
      rows: [['Full name', 'Field'], ['Email', 'Field'], ['Phone', 'Field'], ['Interests', 'Field'], ['Join', 'Button'], ['Privacy', 'Link']].map(([a, b]) => ({ a, b })),
      colors: { bg: '#1A0F10', fg: '#F2E9E1', head: '#1A0F10', headFg: '#F2E9E1', cta: '#E8B96A', ctaFg: '#1A0F10', card: '#2A1C1D', img: '#4A2F30', line: '#4A2F30' },
    },
  },
];

export const JOBS = [
  { years: '2025 — 2026', role: 'Digital Solutions Consultant', org: 'Link Creative, Chicago' },
  { years: '2022 — 2025', role: 'Lead Web Developer', org: 'Divine Design & Marketing' },
  { years: '2020 — 2021', role: 'Web Developer', org: 'ABTACH Ltd., Karachi' },
  { years: '2019 — 2020', role: 'Junior Web Developer', org: 'The Digital Factory' },
  { years: '2018 — 2019', role: 'Trainee Web Developer', org: 'Cento Square' },
  { years: '2016 — 2020', role: 'BS Computer Science', org: 'Iqra University · ML focus' },
];

export const DRAWERS = [
  { name: 'Discovery & scoping', what: 'I run the first calls, audit what exists, and turn a loose request into a scope with priorities, risks and a plan a client can sign off.', tools: ['Workshops', 'Site audits', 'Semrush', 'GA4'] },
  { name: 'Architecture', what: 'Content models, page structure and integration points get decided before anything is built, so the build has fewer surprises.', tools: ['Figma', 'Sitemaps', 'Data models', 'ACF'] },
  { name: 'Build', what: 'Custom plugins, themes, storefronts and front ends. I choose the platform the client can maintain, not the one that looks best on a resume.', tools: ['PHP', 'JavaScript', 'React', 'WordPress', 'Shopify'] },
  { name: 'Integrations & automation', what: 'Forms, CRM, payments and analytics wired into one flow, so every lead lands with the right person and nothing is copied by hand.', tools: ['HubSpot', 'GoHighLevel', 'REST APIs', 'GTM'] },
  { name: 'Delivery & leadership', what: 'Testing, launch, reporting and the fixes the data points to, plus the people side: tasks, reviews and client updates.', tools: ['QA', 'Search Console', 'ClickUp', 'Agile'] },
];

export const PRINCIPLES = [
  { n: '01', t: 'Find the real requirement', d: 'The request is a starting point. The problem behind it is the job.' },
  { n: '02', t: 'Pick the simplest tool that holds', d: 'A plugin beats a platform when it solves the problem and the client can maintain it.' },
  { n: '03', t: 'Leave it maintainable', d: 'Documented, tested and handed over, so it keeps working after launch day.' },
];

export const RANGE = [
  { code: 'R1 · WEB SYSTEMS', when: '2018 — now', title: 'Platforms, plugins & integrations', what: 'Custom WordPress plugins, Shopify storefronts, PHP and JavaScript, REST APIs and CRM workflows for client businesses.', stack: 'PHP · Laravel · JavaScript · React · REST · HubSpot', dark: false },
  { code: 'R2 · EMBEDDED', when: 'College · final year', title: 'Fault diagnosis for DC motors', what: 'An Arduino-based project diagnosing faults in DC motors, the kind that drive conveyor belts and other industrial equipment.', stack: 'Arduino · C++ · DC motors', dark: true },
  { code: 'R3 · DATA', when: 'College · 2019', title: 'Big data & classical ML', what: 'Worked on data clusters using classical machine-learning models, as part of a computer science degree focused on machine learning.', stack: 'Data clusters · Classical ML', dark: false },
];
