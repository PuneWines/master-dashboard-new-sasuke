/* eslint-env node */
import path from "path"
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    base: "/", 
    build: {
      outDir: "dist",
    },
    server: {
      proxy: {
        // 1. Purchase Management Proxy
        '/gas': {
          target: 'https://script.google.com',
          changeOrigin: true,
          secure: false,
          followRedirects: true,
          rewrite: (path) =>
            path.replace(
              /^\/gas/,
              `/macros/s/${env.VITE_PURCHASE_MANAGEMENT_ID}/exec`
            ),
        },
        // 2. Master Login / User Management Proxy
        '/user-api': {
          target: 'https://script.google.com',
          changeOrigin: true,
          secure: false,
          followRedirects: true,
          rewrite: (path) =>
            path.replace(
              /^\/user-api/,
              `/macros/s/${env.VITE_MASTER_LOGIN_ID}/exec`
            ),
        },
        // 3. WhatsApp Send Message Proxy
        '/whatsapp-api': {
          target: 'https://script.google.com',
          changeOrigin: true,
          secure: false,
          followRedirects: true,
          rewrite: (path) =>
            path.replace(
              /^\/whatsapp-api/,
              `/macros/s/${env.VITE_WHATSAPP_SEND_MESSAGE_ID}/exec`
            ),
        },
        // 4. Universal Macros Proxy
        '/macros': {
          target: 'https://script.google.com',
          changeOrigin: true,
          secure: false,
          followRedirects: true,
        },
        // 6. Maytapi WhatsApp API Proxy (avoids CORS from browser)
        '/maytapi': {
          target: 'https://api.maytapi.com',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/maytapi/, ''),
        },
        // 5. Device Logs Proxy
        '/api/device-logs': {
          target: 'http://103.195.203.77:15167',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/device-logs/, '/api/v2/WebAPI/GetDeviceLogs')
        },
      },
    },
  };
})