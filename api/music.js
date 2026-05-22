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
      
      const r = await yts(q + ' lyric video');
      const videos = r.videos;

      if (!videos || videos.length === 0) {
        return res.status(404).json({ error: 'Không tìm thấy bài hát' });
      }

      const bestVideo = videos[0];
      const videoId = bestVideo.videoId;
      
      console.log(`[PLAY] Đã tìm thấy: ${bestVideo.title} (${videoId})`);

      // Trả về videoId ngay lập tức, không cần extract stream
      return res.status(200).json({
        videoId,
        streamUrl: `https://www.youtube.com/watch?v=${videoId}`, // URL cho ReactPlayer
        title: bestVideo.title,
        thumbnail: bestVideo.thumbnail,
      });
    }

    if (action === 'prefetch' && q) {
      res.status(202).json({ status: 'prefetching' });
      return;
    }

    return res.status(400).json({ error: 'Hành động không hợp lệ' });
  } catch (error) {
    console.error('Lỗi API Music:', error.message);
    return res.status(500).json({ error: 'Lỗi máy chủ', details: error.message });
  }
}
