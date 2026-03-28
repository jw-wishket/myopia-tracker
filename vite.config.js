import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss()],
  root: '.',
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('chart.js') || id.includes('chartjs-plugin-annotation')) {
            return 'chart';
          }
          if (id.includes('@supabase/supabase-js') || id.includes('@supabase')) {
            return 'supabase';
          }
        }
      }
    }
  },
});
