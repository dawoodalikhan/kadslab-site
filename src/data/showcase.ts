// Live sites I worked on, grouped by employer. No URLs or client names are
// published: screenshots come from a local capture script whose URL list
// is gitignored (scripts/showcase.local.json).

export type ShowcaseItem = {
  id: string;            // also the screenshot file name: /showcase/<id>.jpg
  title: string;         // industry description, never the client name
  industry: string;
  platform: string;
  role: string;
  did: string;           // what I did, at the level I can verify
  own?: boolean;         // the employer's own site (no client to protect)
};

export type ShowcaseEra = { years: string; employer: string; position: string; items: ShowcaseItem[] };

export const SHOWCASE: ShowcaseEra[] = [
  {
    years: '2025 — 2026', employer: 'Link Creative', position: 'Digital Solutions Consultant',
    items: [
      { id: 'lc-restoration', title: 'Classic car restoration shop', industry: 'Automotive', platform: 'WordPress · HubSpot', role: 'Delivery lead & developer',
        did: 'Restructured a 44-page site and its navigation, turned client meetings into design changes, rebuilt it in WordPress, and set up HubSpot forms and workflows around a shared sales inbox.' },
      { id: 'lc-childcare', title: 'Six-location childcare center', industry: 'Early education', platform: 'WordPress · Rank Math', role: 'SEO & content systems',
        did: 'Ran a high-volume content system: topics checked against the live sitemap, every post linked to all six locations, consistent SEO rules, and monthly GA4 and Search Console reporting.' },
      { id: 'lc-concierge', title: 'Luxury concierge brand', industry: 'Hospitality', platform: 'HTML/CSS · GoHighLevel', role: 'Front end & integrations',
        did: 'When the site builder would not render the CRM form, built and shipped a standalone launch-list page with the form embedded, then helped set up payments.' },
      { id: 'lc-agency', title: 'Agency website', industry: 'Marketing agency', platform: 'WordPress', role: 'Developer & content', own: true,
        did: 'Site updates, technical SEO and high-volume blog publishing for the agency’s own website.' },
    ],
  },
  {
    years: '2022 — 2025', employer: 'Divine Design & Marketing', position: 'Lead Web Developer',
    items: [
      { id: 'dd-retail', title: 'Shopping & dining destination', industry: 'Retail real estate', platform: 'WordPress · Elementor', role: 'Lead developer',
        did: 'Website for a retail and dining center: tenant and dining pages, services, events and leasing information.' },
      { id: 'dd-manufacturer', title: 'Concrete sealer manufacturer', industry: 'Manufacturing & e-commerce', platform: 'WordPress · WooCommerce', role: 'Lead developer',
        did: 'Manufacturer site with an online store: product catalog, shop, and technical product content.' },
      { id: 'dd-partner', title: 'Electronics partner-marketing program', industry: 'B2B marketing', platform: 'WordPress · WPBakery', role: 'Lead developer',
        did: 'Co-branded site for an electronics brand’s partner program: bundled campaign packages and a promotional products catalog.' },
      { id: 'dd-agency', title: 'Agency website', industry: 'Marketing agency', platform: 'WordPress', role: 'Lead developer', own: true,
        did: 'Development and upkeep of the agency’s own website.' },
    ],
  },
  {
    years: '2019 — 2020', employer: 'The Digital Factory', position: 'Junior Web Developer',
    items: [
      { id: 'tdf-automaker', title: 'International automaker', industry: 'Automotive', platform: 'Custom build', role: 'Front-end developer (team)',
        did: 'Part of the team building and maintaining the brand site: responsive page templates and mobile-first front-end work.' },
      { id: 'tdf-apparel', title: 'Athleisure apparel brand', industry: 'Fashion e-commerce', platform: 'Shopify', role: 'Developer',
        did: 'Storefront development and support: theme customization, product templates and responsive layouts.' },
      { id: 'tdf-dealer', title: 'Car dealership model launch', industry: 'Automotive retail', platform: 'WordPress', role: 'Developer',
        did: 'Model launch page for a dealership: specifications, gallery, FAQs and booking inquiries.' },
    ],
  },
];
