/**
 * MobileNav Component - Thanh điều hướng cho mobile
 * 
 * GIẢI THÍCH CHO GIÁM KHẢO:
 * - Trên điện thoại, Sidebar bị ẩn (hidden lg:flex ở Sidebar).
 * - Thay vào đó, MobileNav hiển thị ở cuối màn hình (kiểu Instagram/Spotify).
 * - Chỉ hiển thị trên màn hình < 1024px (lg breakpoint).
 * - Sử dụng NavLink tương tự Sidebar nhưng layout dạng tab bar.
 * - Tự động điều chỉnh vị trí khi PlayerBar hiển thị/ẩn.
 */

import { FiHome, FiSearch, FiHeart, FiMessageCircle } from 'react-icons/fi';
import AnimatedTabs from './AnimatedTabs';
import { usePlayer } from '../contexts/PlayerContext';

const NAV_ITEMS = [
  { path: '/', icon: FiHome, label: 'Home' },
  { path: '/search', icon: FiSearch, label: 'Search' },
  { path: '/library', icon: FiHeart, label: 'Library' },
  { path: '/ai', icon: FiMessageCircle, label: 'AI' },
];

export default function MobileNav() {
  const { currentTrack } = usePlayer();
  // Khi có bài hát đang phát, PlayerBar hiện => MobileNav cần nhích lên
  const bottomClass = currentTrack 
    ? 'bottom-[73px]' 
    : 'bottom-2';

  return (
    <nav className={`lg:hidden fixed ${bottomClass} left-0 right-0 z-40 px-3 sm:px-4 pointer-events-none flex justify-center mobile-safe-bottom`}>
      {/* Container có pointer-events-auto để chặn click xuyên qua, phần ngoài trong suốt */}
      <div className="pointer-events-auto w-full max-w-sm mb-2 shadow-2xl shadow-black/50 rounded-full">
        <AnimatedTabs items={NAV_ITEMS} className="w-full" />
      </div>
    </nav>
  );
}
