// Lab experiments: one source of truth for the hero's code fragments, the
// demo tabs, the page's structured data and (later) the Project Universe.
// `id` doubles as the deep link (/lab/#id), which the home page and Digital
// Dawood already link to; don't rename these.

export type ExperimentId = 'filter' | 'routing' | 'booking' | 'inspector' | 'dashboard' | 'hardware';

export type Experiment = {
  id: ExperimentId;
  kind: string;
  name: string;
  /** One line on what you can do in it. Rendered in the static HTML, so search engines read it. */
  summary: string;
  /** "What this proves" line under the demo. */
  proves: string;
  /** Code fragment shown floating around the Lab Core. */
  fragment: string;
  /** Position of the fragment on the Core stage, in % of the stage. */
  at: { x: number; y: number };
  /** Parallax depth: higher moves more with the cursor. */
  depth: number;
};

export const EXPERIMENTS: Experiment[] = [
  {
    id: 'filter', kind: 'State', name: 'Portfolio filter engine',
    summary: 'Search, filter and sort a sample property portfolio instantly.',
    proves: 'State management, search and filters, accessible controls.',
    fragment: "filter({ town: 'Lisle' })", at: { x: 4, y: 12 }, depth: 1.3,
  },
  {
    id: 'routing', kind: 'Workflows', name: 'Lead routing simulator',
    summary: 'Send a test inquiry and watch it get validated, classified and routed.',
    proves: 'CRM thinking: validation, classification, routing and follow-up rules.',
    fragment: 'route(lead) → sales', at: { x: 0, y: 70 }, depth: 1.0,
  },
  {
    id: 'booking', kind: 'Forms', name: 'Studio booking flow',
    summary: 'Book a studio in five steps, with live availability and validation.',
    proves: 'Multi-step forms, conditional fields, validation and availability.',
    fragment: "book('Studio B', '2:00')", at: { x: 60, y: 5 }, depth: 0.8,
  },
  {
    id: 'inspector', kind: 'API', name: 'Site inspector',
    summary: 'See the kind of status and SEO report a page inspector returns.',
    proves: 'API design with loading, error and empty states, plus SEO know-how.',
    fragment: 'GET /inspect → 200', at: { x: 66, y: 47 }, depth: 1.1,
  },
  {
    id: 'dashboard', kind: 'Data', name: 'Campaign dashboard',
    summary: 'Filter twelve weeks of campaign results by channel.',
    proves: 'Turning raw campaign data into metrics people can act on.',
    fragment: 'kpi.conversion = 4.2%', at: { x: 50, y: 87 }, depth: 0.7,
  },
  {
    id: 'hardware', kind: 'Hardware', name: 'Virtual hardware lab',
    summary: 'Drive LEDs, change the room’s light and temperature, and automate a simulated microcontroller.',
    proves: 'Embedded thinking in the browser: GPIO and PWM, sensor math, rule-based automation, and an architecture ready for real hardware.',
    fragment: 'analogWrite(9, 180)', at: { x: 2, y: 40 }, depth: 1.2,
  },
];

/* ---------- Coming to the Lab (planned, not built) ---------- */
export type UpcomingArt = 'embedded' | 'arduino' | 'pi' | 'iot';
export type Upcoming = {
  id: string;
  title: string;
  summary: string;
  topics: string[];
  art: UpcomingArt;
  /** Filled in as each project ships. Until then the card shows "not yet". */
  links?: { page?: string; demo?: string; repo?: string };
};

export const UPCOMING: Upcoming[] = [
  { id: 'embedded', title: 'Embedded Systems', art: 'embedded', summary: 'Microcontrollers, low-level programming, sensors, and hardware/software integration.', topics: ['C / C++', 'interrupts', 'sensors', 'UART · I²C · SPI'] },
  { id: 'arduino', title: 'Arduino & Microcontrollers', art: 'arduino', summary: 'Interactive electronics, robotics, automation, and physical computing.', topics: ['electronics', 'robotics', 'motors', 'automation'] },
  { id: 'raspberry-pi', title: 'Raspberry Pi', art: 'pi', summary: 'Linux-based systems, edge computing, local servers, and connected applications.', topics: ['Linux', 'edge computing', 'local servers', 'GPIO'] },
  { id: 'iot', title: 'IoT & Connected Devices', art: 'iot', summary: 'Hardware-to-cloud communication, APIs, telemetry, dashboards, and intelligent automation.', topics: ['MQTT · WebSockets', 'APIs', 'telemetry', 'dashboards'] },
];
