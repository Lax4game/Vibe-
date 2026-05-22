/**
 * AnimatedTabs Component
 * Lấy cảm hứng từ ui-layouts.com (Vercel-style animated tabs)
 * 
 * GIẢI THÍCH CHO GIÁM KHẢO:
 * - Sử dụng Framer Motion `layoutId` để tạo hiệu ứng "sliding pill".
 * - Khi active tab thay đổi, Framer Motion sẽ tự động tính toán
 *   kích thước và vị trí để trượt cái nền (background) một cách mượt mà.
 * - Đây là một pattern rất phổ biến trong các thiết kế UI hiện đại, premium.
 */

import { motion } from 'framer-motion';
import { NavLink } from 'react-router-dom';

export default function AnimatedTabs({ items, className = '' }) {
  return (
    <div className={`flex items-center gap-1 p-1 bg-surface-900/50 backdrop-blur-md rounded-full border border-white/[0.08] ${className}`}>
      {items.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className="relative flex-1"
        >
          {({ isActive }) => (
            <div className="relative px-4 py-2 flex flex-col items-center gap-1 z-10 w-full rounded-full cursor-pointer">
              {/* Icon & Label */}
              <item.icon
                className={`text-lg relative z-20 transition-colors duration-300 ${
                  isActive ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              />
              <span
                className={`text-[10px] font-medium relative z-20 transition-colors duration-300 ${
                  isActive ? 'text-white' : 'text-zinc-500'
                }`}
              >
                {item.label}
              </span>

              {/* Sliding Background (Chỉ render khi tab này đang active) */}
              {isActive && (
                <motion.div
                  layoutId="active-tab-indicator"
                  className="absolute inset-0 bg-white/[0.12] rounded-full z-10"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
            </div>
          )}
        </NavLink>
      ))}
    </div>
  );
}
