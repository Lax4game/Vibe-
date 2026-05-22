import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiSend, FiMusic, FiChevronRight } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import { usePlayer } from '../contexts/PlayerContext';
import { useChat } from '../contexts/ChatContext';
import { musicApi } from '../services/musicApi';
import toast from 'react-hot-toast';

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const { user } = useAuth();
  const { playTrack, showLyrics } = usePlayer();
  const { messages, isLoading, sendMessage } = useChat();
  const chatEndRef = useRef(null);

  // Cuộn xuống tin nhắn mới nhất
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    await sendMessage(userMessage);
  };

  // Hàm để tìm kiếm và phát nhạc khi nhấn vào tên bài hát
  const handlePlayRecommended = async (songString) => {
    // songString dạng "Tên bài hát - Nghệ sĩ"
    toast.loading(`Đang tìm bài: ${songString}...`, { id: 'search-song' });
    try {
      const results = await musicApi.search(songString);
      if (results && results.length > 0) {
        playTrack(results[0]);
        toast.success(`Đang phát: ${results[0].title}`, { id: 'search-song' });
      } else {
        toast.error('Không tìm thấy bài này trên hệ thống!', { id: 'search-song' });
      }
    } catch (err) {
      toast.error('Lỗi khi tìm nhạc!', { id: 'search-song' });
    }
  };

  // Tách nội dung tin nhắn để tìm bài hát - Regex linh hoạt hơn
  const parseSongsFromContent = (content) => {
    const regex = /SONG:\s*\[?(.*?)\]?\s*\|\s*ARTIST:\s*\[?(.*?)\]?(?=\s|$|[,.!\n])/gi;
    const matches = [...content.matchAll(regex)];
    return matches.map(m => `${m[1].trim()} - ${m[2].trim()}`);
  };

  const renderMessageContent = (content, role) => {
    const parts = content.split(/(SONG:\s*\[?.*?\]?\s*\|\s*ARTIST:\s*\[?.*?\]?(?=\s|$|[,.!\n]))/gi);
    const recommendedSongs = role === 'assistant' ? parseSongsFromContent(content) : [];

    return (
      <div className="space-y-2">
        <div className="whitespace-pre-wrap">
          {parts.map((part, index) => {
            if (part.toLowerCase().includes('song:') && part.toLowerCase().includes('artist:')) {
              const display = part.replace(/SONG:\s*\[?/i, '').replace(/\]?\s*\|\s*ARTIST:\s*\[?/i, ' - ').replace(/\]?$/i, '');
              return (
                <button
                  key={index}
                  onClick={() => handlePlayRecommended(display)}
                  className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded-md bg-brand-500/20 text-brand-400 hover:bg-brand-500/40 transition-all font-medium border border-brand-500/30"
                >
                  <FiMusic className="text-[10px]" />
                  {display}
                </button>
              );
            }
            return part;
          })}
        </div>
      </div>
    );
  };

  if (showLyrics) return null;

  return (
    <div className="fixed bottom-24 right-3 sm:right-6 z-[60] lg:bottom-28 lg:right-10">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9, transformOrigin: 'bottom right' }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="absolute bottom-16 right-0 w-[calc(100vw-24px)] sm:w-[400px] h-[420px] sm:h-[500px] flex flex-col rounded-2xl sm:rounded-3xl overflow-hidden glass-panel border border-white/10 shadow-2xl bg-zinc-900/90 backdrop-blur-2xl"
          >
            {/* Header */}
              <div className="p-4 bg-gradient-to-r from-brand-600/20 to-brand-400/10 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-brand-500 overflow-hidden shadow-lg shadow-brand-500/30">
                    <img src="/zenbot.gif" className="w-full h-full object-cover" alt="ZenBot" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">ZenBot</h3>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-[10px] text-zinc-400 uppercase tracking-widest">Đang trực tuyến</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white"
              >
                <FiX />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-white/[0.02]">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                    m.role === 'user' 
                      ? 'bg-brand-500 text-white rounded-tr-none shadow-lg shadow-brand-500/20' 
                      : 'bg-white/10 text-zinc-200 border border-white/5 rounded-tl-none'
                  }`}>
                    {renderMessageContent(m.content, m.role)}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white/10 p-3 rounded-2xl rounded-tl-none flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10 bg-zinc-950/50">
              <div className="relative flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Hôm nay bạn thế nào?"
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-brand-500/50 transition-all"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="w-10 h-10 rounded-xl bg-brand-500 text-white flex items-center justify-center hover:bg-brand-400 transition-all shadow-lg shadow-brand-500/30 disabled:opacity-50 disabled:shadow-none"
                >
                  <FiSend />
                </button>
              </div>
              <p className="text-[10px] text-zinc-500 text-center mt-3">Powered by DeepSeek AI via DS2API</p>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-300 ${
          isOpen ? 'bg-zinc-800 text-white rotate-90' : 'bg-brand-500 text-white shadow-brand-500/40'
        }`}
      >
        {isOpen ? <FiX className="text-2xl" /> : (
          <div className="w-8 h-8 rounded-lg overflow-hidden">
            <img src="/zenbot.gif" className="w-full h-full object-cover" alt="" />
          </div>
        )}
        {!isOpen && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-zinc-900 animate-bounce"></span>
        )}
      </motion.button>
    </div>
  );
}
