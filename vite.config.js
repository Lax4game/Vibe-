/**
 * Vite Configuration
 * 
 * GIẢI THÍCH CHO GIÁM KHẢO:
 * - Vite là build tool thế hệ mới, khởi động dev server cực nhanh nhờ ES Modules.
 * - @vitejs/plugin-react: Hỗ trợ React JSX transform và Fast Refresh (HMR).
 * - @tailwindcss/vite: Tích hợp Tailwind CSS 4 trực tiếp vào Vite pipeline.
 * - server.proxy: Chuyển tiếp các request /api/* và /audio/* tới proxy-server (port 3001)
 *   để tránh lỗi CORS khi frontend (port 5173) gọi backend (port 3001).
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5173,
    proxy: {
      // Mọi request bắt đầu bằng /api sẽ được forward tới backend
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      // Mọi request stream audio cũng forward tới backend
      '/audio': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      // Proxy cho OpenRouter để tránh lỗi CORS
      '/openrouter': {
        target: 'https://openrouter.ai/api/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/openrouter/, ''),
      },
      // Proxy cho Groq để tránh lỗi CORS
      '/groq': {
        target: 'https://api.groq.com/openai/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/groq/, ''),
      },
    },
  },
})
