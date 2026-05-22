/**
 * Vercel Serverless Function — Music Proxy
 * Dùng Piped API (piped.video) làm nguồn thay thế yt-dlp trên serverless.
 * 
 * Route: /api/music (GET)
 * Query params:
 *   action=play&q=...    → Tìm + lấy URL stream
 *   action=prefetch&q=...→ Prefetch (trả OK ngay)
 *   action=stream&id=... → Proxy stream audio
 */

// Danh sách Piped instances (backend) - fallback nếu 1 cái chết
const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.adminforge.de',
  'https://api.piped.privacydev.net',
];

// Cache đơn giản trong memory (sẽ reset khi function cold start)
const cache = new Map();

async function fetchWithFallback(path) {
  for (const instance of PIPED_INSTANCES) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const response = await fetch(`${instance}${path}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.warn(`Piped instance ${instance} failed:`, e.message);
    }
  }
  return null;
}

async function searchMusic(query) {
  const data = await fetchWithFallback(`/search?q=${encodeURIComponent(query)}&filter=music_songs`);
  if (!data?.items) {
    // Fallback: thử không có filter
    const fallback = await fetchWithFallback(`/search?q=${encodeURIComponent(query)}&filter=videos`);
    return fallback?.items || [];
  }
  return data.items;
}

async function getStreamUrl(videoId) {
  const cached = cache.get(videoId);
  if (cached && Date.now() - cached.time < 4 * 60 * 60 * 1000) {
    return cached.url;
  }

  const data = await fetchWithFallback(`/streams/${videoId}`);
  if (!data) return null;

  // Tìm audio stream tốt nhất
  const audioStreams = data.audioStreams || [];
  const bestAudio = audioStreams
    .filter(s => s.mimeType?.includes('audio'))
    .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];

  if (bestAudio?.url) {
    cache.set(videoId, { url: bestAudio.url, time: Date.now() });
    return bestAudio.url;
  }

  return null;
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();

  const { action, q, id } = req.query;

  try {
    // === ACTION: PLAY ===
    if (action === 'play' && q) {
      console.log(`[PLAY] "${q}"`);
      
      // 1. Search
      const items = await searchMusic(q);
      if (!items || items.length === 0) {
        return res.status(404).json({ error: 'No results found' });
      }

      // 2. Lấy videoId từ URL
      const firstItem = items[0];
      const videoId = firstItem.url?.replace('/watch?v=', '') || '';
      
      if (!videoId) {
        return res.status(404).json({ error: 'No video ID found' });
      }

      // 3. Lấy stream URL
      const streamUrl = await getStreamUrl(videoId);
      
      if (!streamUrl) {
        return res.status(502).json({ error: 'Could not extract audio URL' });
      }

      return res.status(200).json({
        videoId,
        streamUrl,
        title: firstItem.title,
        thumbnail: firstItem.thumbnail,
      });
    }

    // === ACTION: PREFETCH ===
    if (action === 'prefetch' && q) {
      // Respond immediately
      res.status(202).json({ status: 'prefetching' });
      return;
    }

    // === ACTION: STREAM (proxy audio) ===
    if (action === 'stream' && id) {
      const streamUrl = await getStreamUrl(id);
      if (!streamUrl) {
        return res.status(502).json({ error: 'Could not get stream URL' });
      }

      // Redirect to the actual audio URL
      return res.redirect(302, streamUrl);
    }

    return res.status(400).json({ error: 'Invalid action. Use action=play&q=... or action=stream&id=...' });
  } catch (error) {
    console.error('Music proxy error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
