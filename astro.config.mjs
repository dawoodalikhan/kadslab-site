// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// Static output: every page ships as plain HTML. React loads only
// for interactive islands (hero desk, demos, filters, forms).
export default defineConfig({
  site: 'https://kadslab.com',
  integrations: [react()],
  output: 'static',
});
