import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './public/manifest.json' // หรือเส้นทางไฟล์ manifest ของคุณ

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
  ],
  server: {
    // กำหนด Port ให้คงที่
    port: 5173,
    strictPort: true,
    // อนุญาต CORS ให้ Extension เข้าถึง Localhost ได้
    cors: true,
    // ตั้งค่า HMR (Hot Module Replacement) ให้ใช้ Port เดียวกัน
    hmr: {
      port: 5173,
    },
  },
})