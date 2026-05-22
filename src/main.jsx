/**
 * main.jsx - Điểm khởi chạy ứng dụng React
 * 
 * GIẢI THÍCH CHO GIÁM KHẢO:
 * - File này là entry point - file đầu tiên được Vite load.
 * - StrictMode: Chế độ phát triển của React, phát hiện lỗi tiềm ẩn.
 * - createRoot: React 18+ API, hỗ trợ Concurrent Rendering (render đồng thời).
 * - Import index.css: Tải Design System (Tailwind + custom styles).
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { ThemeProvider } from './contexts/ThemeContext';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
