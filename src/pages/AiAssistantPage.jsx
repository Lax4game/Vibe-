import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSend, FiMusic, FiChevronRight, FiCpu, FiMessageSquare, FiPlay } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import { usePlayer } from '../contexts/PlayerContext';
import { useChat } from '../contexts/ChatContext';
import { musicApi } from '../services/musicApi';
import toast from 'react-hot-toast';

// Component con để hiển thị Card bài hát được gợi ý
const RecommendedSongCard = ({ songString, onPlay }) => {
  const [songData, setSongData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function verifySong() {
      try {
        const results = await musicApi.search(songString);
        if (results && results.length > 0) {
          setSongData(results[0]);
        }
      } catch (err) {
        console.error("Verify song failed", err);
      } finally {
        setLoading(false);
      }
    }
    verifySong();
  }, [songString]);

  if (loading) return (
    <div className="w-full max-w-sm h-20 bg-white/5 animate-pulse rounded-2xl border border-white/5 my-2"></div>
  );

  if (!songData) return null; // Không hiện nếu không tìm thấy bài hát

  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="group relative flex items-center gap-4 p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all my-2 max-w-sm shadow-lg overflow-hidden"
    >
      <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0">
        <img src={songData.thumbnail} alt={songData.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
        <button 
          onClick={() => onPlay(songData)}
          className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <FiPlay className="text-white text-xl fill-current" />
        </button>
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-white font-semibold text-sm truncate">{songData.title}</h4>
        <p className="text-zinc-400 text-xs truncate">{songData.artist}</p>
      </div>
      <button 
        onClick={() => onPlay(songData)}
        className="w-10 h-10 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center hover:bg-brand-500 hover:text-white transition-all shadow-lg"
      >
        <FiMusic />
      </button>
    </motion.div>
  );
};

export default function AiAssistantPage() {
  const [input, setInput] = useState('');
  const { user } = useAuth();
  const { playTrack } = usePlayer();
  const { messages, isLoading, sendMessage } = useChat();
  const chatEndRef = useRef(null);

  // Cuộn xuống mỗi khi có tin nhắn mới
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    await sendMessage(userMessage);
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
      <div className="space-y-3">
        <div className="whitespace-pre-wrap">
          {parts.map((part, index) => {
            if (part.toLowerCase().includes('song:') && part.toLowerCase().includes('artist:')) {
              const display = part.replace(/SONG:\s*\[?/i, '').replace(/\]?\s*\|\s*ARTIST:\s*\[?/i, ' - ').replace(/\]?$/i, '');
              return <span key={index} className="text-brand-400 font-bold decoration-brand-500/30 underline decoration-2 underline-offset-4">{display}</span>;
            }
            return part;
          })}
        </div>
        
        {/* Hiển thị Card theo hàng dọc flex-col */}
        {role === 'assistant' && recommendedSongs.length > 0 && (
          <div className="pt-2 flex flex-col gap-3">
            {recommendedSongs.map((song, idx) => (
              <RecommendedSongCard 
                key={idx} 
                songString={song} 
                onPlay={(track) => {
                  playTrack(track);
                  toast.success(`Đang phát: ${track.title}`);
                }} 
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] sm:h-[calc(100vh-160px)] relative max-w-5xl mx-auto">
      {/* Header */}
      <header className="mb-3 sm:mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-brand-500 overflow-hidden shadow-lg shadow-brand-500/20">
            <img src="/zenbot.gif" className="w-full h-full object-cover" alt="ZenBot" />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-display font-bold text-white">Trợ lý ZenBot</h1>
            <p className="text-zinc-500 text-xs">Hòa nhịp tâm hồn qua từng giai điệu</p>
          </div>
        </div>
        
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
           <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
           AI Engine: Groq Llama 3.3 (Pro)
        </div>
      </header>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto mb-3 sm:mb-6 pr-2 sm:pr-4 custom-scrollbar space-y-4 sm:space-y-6 scroll-smooth">
        {messages.map((m) => (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={m.id}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex gap-2 sm:gap-3 max-w-[95%] sm:max-w-[90%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`flex-shrink-0 mt-1`}>
                {m.role === 'user' ? (
                  <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center">
                    <FiMessageSquare className="text-xs text-zinc-300" />
                  </div>
                ) : (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-brand-500 overflow-hidden shadow-md shadow-brand-500/10">
                    <img src="/zenbot.gif" className="w-full h-full object-cover" alt="ZenBot" />
                  </div>
                )}
              </div>
              <div className={`p-3 sm:p-4 rounded-2xl text-[13px] sm:text-[14px] leading-relaxed shadow-xl ${
                m.role === 'user'
                  ? 'bg-brand-500 text-white rounded-tr-none'
                  : 'bg-zinc-900/50 text-zinc-200 border border-white/5 rounded-tl-none backdrop-blur-sm'
              }`}>
                {renderMessageContent(m.content, m.role)}
              </div>
            </div>
          </motion.div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex gap-4 items-center pl-10">
               <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-bounce"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-bounce [animation-delay:0.4s]"></span>
               </div>
               <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">ZenBot đang lắng nghe...</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Form */}
      <div className="mt-auto">
        <form onSubmit={handleSendMessage} className="relative">
          <div className="flex items-center bg-zinc-900/80 border border-white/10 rounded-2xl p-1 shadow-2xl focus-within:border-brand-500/50 transition-all backdrop-blur-md">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Chia sẻ tâm trạng của bạn..."
              className="flex-1 bg-transparent border-none px-3 sm:px-5 py-3 sm:py-3.5 text-sm text-white focus:outline-none placeholder-zinc-500"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-3 bg-brand-500 text-white rounded-xl hover:bg-brand-400 transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center"
            >
              <FiSend className="text-lg" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
