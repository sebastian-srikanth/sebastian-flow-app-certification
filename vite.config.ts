import path from 'node:path';

import {
  manifestCspPlugin,
  mkcertPlugin,
} from '@cognite/app-sdk/vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  // manifestCspPlugin() must stay first — its middleware sets the
  // Content-Security-Policy header before any HTML response is sent.
  plugins: [manifestCspPlugin(), react(), mkcertPlugin(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    port: 3001,
  },
  build: {
    rollupOptions: {
      output: {
        // Route-level lazy loading alone leaves two chunks over Vite's 500 kB advisory: the PDF
        // engine and the vendor half of the entry chunk. Splitting them along dependency lines
        // keeps every emitted chunk under the limit and lets the browser cache them independently
        // of application code.
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('node_modules/pdfjs-dist')) return 'pdfjs-dist';
          if (id.includes('node_modules/react-pdf')) return 'react-pdf';
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react';
          // recharts and its d3 dependencies are the bulk of the charting weight. Aura's chart
          // wrapper stays in the Aura chunk because pulling it out makes the two chunks circular.
          if (/node_modules\/recharts\//.test(id)) return 'charts';
          if (id.includes('node_modules/@cognite/aura')) return 'aura';
          if (id.includes('node_modules/@cognite/sdk')) return 'cognite-sdk';
          // Everything else third-party goes to a shared chunk. Leaving these unassigned lets
          // Rollup fold shared helpers (clsx, react-is, d3 …) into whichever feature chunk it
          // reaches first, which produced a circular charts/aura chunk dependency.
          return 'vendor';
        },
      },
    },
  },
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    exclude: ['pdfjs-dist'],
  },
});
