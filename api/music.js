/**
 * Vercel Serverless Function — Music Proxy (Tự Động 100%)
 * Sử dụng yt-search và @distube/ytdl-core trực tiếp, KHÔNG CẦN BACKEND PHỤ TRỢ.
 * 
 * Route: /api/music (GET)
 * Query params:
 *   action=play&q=...    → Tìm + lấy URL stream
 *   action=stream&id=... → Proxy stream audio
 */

import yts from 'yt-search';
import ytdl from '@distube/ytdl-core';

// Cache đơn giản trong memory (sẽ bị xóa khi function cold start)
const streamCache = new Map();
const CACHE_TTL = 2 * 60 * 60 * 1000; // 2 giờ

export default async function handler(req, res) {
  // Bật CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();

  const { action, q, id } = req.query;

  try {
    // ==========================================
    // ACTION: PLAY (Tìm kiếm & trả về URL)
    // ==========================================
    if (action === 'play' && q) {
      console.log(`[PLAY] Tìm bài hát: "${q}"`);
      
      // 1. Tìm video trên YouTube
      const r = await yts(q + ' official audio');
      const videos = r.videos;

      if (!videos || videos.length === 0) {
        return res.status(404).json({ error: 'Không tìm thấy bài hát' });
      }

      const bestVideo = videos[0];
      const videoId = bestVideo.videoId;
      
      console.log(`[PLAY] Đã tìm thấy: ${bestVideo.title} (${videoId})`);

      // 2. Kiểm tra cache
      const cached = streamCache.get(videoId);
      let streamUrl = null;
      
      if (cached && Date.now() - cached.time < CACHE_TTL) {
        streamUrl = cached.url;
        console.log(`[PLAY] Trả về từ Cache`);
      } else {
        // Lấy stream URL bằng ytdl-core
        const info = await ytdl.getInfo(videoId);
        
        // Chọn định dạng audio tốt nhất
        const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
        const bestAudio = audioFormats.sort((a, b) => (b.audioBitrate || 0) - (a.audioBitrate || 0))[0];
        
        if (bestAudio && bestAudio.url) {
          streamUrl = bestAudio.url;
          streamCache.set(videoId, { url: streamUrl, time: Date.now() });
        }
      }

      if (!streamUrl) {
        return res.status(500).json({ error: 'Lỗi trích xuất audio' });
      }

      return res.status(200).json({
        videoId,
        streamUrl, // Vercel sẽ trả về URL stream gốc từ YouTube
        title: bestVideo.title,
        thumbnail: bestVideo.thumbnail,
      });
    }

    // ==========================================
    // ACTION: PREFETCH
    // ==========================================
    if (action === 'prefetch' && q) {
      res.status(202).json({ status: 'prefetching' });
      return;
    }

    // ==========================================
    // ACTION: STREAM (Dùng nếu URL bị lỗi CORS)
    // ==========================================
    if (action === 'stream' && id) {
       // Lấy URL
       const info = await ytdl.getInfo(id);
       const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
       const bestAudio = audioFormats.sort((a, b) => (b.audioBitrate || 0) - (a.audioBitrate || 0))[0];
       
       if (bestAudio && bestAudio.url) {
         return res.redirect(302, bestAudio.url);
       }
       return res.status(404).json({ error: 'Stream không tìm thấy' });
    }

    return res.status(400).json({ error: 'Hành động không hợp lệ' });
  } catch (error) {
    console.error('Lỗi API Music:', error.message);
    return res.status(500).json({ error: 'Lỗi máy chủ', details: error.message });
  }
}
