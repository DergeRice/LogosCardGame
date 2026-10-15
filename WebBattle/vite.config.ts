import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins: [react()], worker:{format:'es'}, server: { watch:{ignored:['**/.runtime/**','**/.wrangler/**','**/docs/one-example-per-pos/**']}, proxy: { '/socket': { target: 'ws://127.0.0.1:3001', ws: true, headers: { origin: 'http://localhost:5173' } }, '/health': 'http://127.0.0.1:3001' } } });
