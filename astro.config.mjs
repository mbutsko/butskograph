import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import remarkBreaks from 'remark-breaks';
import remarkWikilinks from './src/lib/remark-wikilinks.mjs';

export default defineConfig({
  integrations: [react()],
  site: 'https://butsko.graph',
  markdown: {
    // Obsidian renders a single newline as a line break, and the prose is authored
    // there. Without this, one-per-line lists (bands, names) collapse into a blob.
    remarkPlugins: [remarkBreaks, remarkWikilinks],
  },
});
