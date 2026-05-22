import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('zenmuzik_chat_history');
    return saved ? JSON.parse(saved) : [
      { id: 1, role: 'assistant', content: 'Chào bạn! Mình là ZenBot - người bạn đồng hành âm nhạc của bạn. Hôm nay tâm trạng của bạn thế nào? Cứ thoải mái chia sẻ nhé, mình sẽ tìm những bài hát thật "chill" để cùng bạn nghe ngay bây giờ. 🎵' }
    ];
  });
  const [isLoading, setIsLoading] = useState(false);

  // Lưu tin nhắn vào localStorage mỗi khi có thay đổi
  useEffect(() => {
    localStorage.setItem('zenmuzik_chat_history', JSON.stringify(messages));
  }, [messages]);

  const sendMessage = useCallback(async (content) => {
    if (!content.trim() || isLoading) return;

    const userMessage = { id: Date.now(), role: 'user', content: content.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      const systemPrompt = `
        Bạn là ZenBot - Chuyên gia âm nhạc thực thụ của ứng dụng ZenMuzik.
        Nhiệm vụ của bạn là trò chuyện như một người bạn thân và gợi ý âm nhạc dựa trên tâm trạng người dùng.
        Thông tin người dùng: ${user?.displayName || 'Thành viên'}, Quốc gia: Việt Nam.

        DANH SÁCH BÀI HÁT GỢI Ý (CHỈ DÙNG NHỮNG BÀI NÀY HOẶC BÀI CÓ THẬT 100%):
        - HIEUTHUHAI: Ngủ Một Mình, Exit Sign, Không Thể Say, Giờ Thì Ai Cười.
        - MCK: Anh Đã Ổn Hơn, Tại Vì Sao, Chìm Sâu, Thôi Em Đừng Đi.
        - tlinh: Nếu Lúc Đó, Ghệ Đẹp, Nữ Siêu Anh Hùng.
        - Wren Evans: Tò Te Tú Tí, Bé Ơi Là Bé, Thích Em Hơi Nhiều.
        - Grey D: Đưa Em Về Nhà, dự báo thời tiết hôm nay thế nào, vaicaunoicokhiennguoithaydoi.
        - Soobin: Giá Như, Lâu Lâu Nhắc Lại, Trò Chơi.
        - Sơn Tùng M-TP: Đừng Làm Trái Tim Anh Đau, Chúng Ta Của Tương Lai, Making My Way, Lạc Trôi.
        
        QUY TẮC:
        1. KHÔNG ĐƯỢC TỰ BỊA TÊN BÀI HÁT. Nếu không chắc chắn, hãy dùng danh sách trên.
        2. Luôn phản hồi lịch sự, ấm áp và đồng cảm.
        3. Định dạng gợi ý nhạc: SONG: [Tên bài] | ARTIST: [Tên nghệ sĩ]
      `;

      // Sử dụng Groq API
      // Production: Vercel serverless function /api/groq
      // Development: Vite proxy /groq/chat/completions
      const IS_PROD = import.meta.env.PROD;
      const groqUrl = IS_PROD ? '/api/groq' : '/groq/chat/completions';
      
      const response = await fetch(groqUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(IS_PROD ? {} : { 'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}` })
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            ...updatedMessages.slice(-10).map(m => ({ role: m.role, content: m.content }))
          ],
          stream: false
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'API Error');
      
      const botReply = data.choices[0].message.content;
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: botReply }]);
    } catch (error) {
      console.error('Chat Error:', error);
      toast.error(`ZenBot lỗi: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, user]);

  const clearHistory = useCallback(() => {
    const initialMessage = [
      { id: 1, role: 'assistant', content: 'Chào bạn! Mình là ZenBot - người bạn đồng hành âm nhạc của bạn. Hôm nay tâm trạng của bạn thế nào? Cứ thoải mái chia sẻ nhé, mình sẽ tìm những bài hát thật "chill" để cùng bạn nghe ngay bây giờ. 🎵' }
    ];
    setMessages(initialMessage);
    localStorage.removeItem('zenmuzik_chat_history');
  }, []);

  return (
    <ChatContext.Provider value={{ messages, isLoading, sendMessage, clearHistory }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat must be used within a ChatProvider');
  return context;
}
