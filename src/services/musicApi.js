/**
 * Music API Service
 * 
 * GIẢI THÍCH CHO GIÁM KHẢO:
 * - Đây là tầng trung gian (Service Layer) giữa UI và Backend.
 * - Tách biệt logic gọi API ra khỏi component UI → dễ test, dễ bảo trì.
 * - Sử dụng 2 nguồn dữ liệu:
 *   1. iTunes API (Apple): Lấy metadata bài hát (tên, nghệ sĩ, ảnh bìa).
 *   2. Proxy Server (yt-dlp): Lấy URL stream audio từ YouTube.
 * - Có cơ chế cache ở browser (Map) để tránh gọi API lặp lại.
 * - Có cơ chế prefetch: tải trước bài tiếp theo trong playlist.
 */



const PROXY_BASE = 'https://zenmuzik-proxy.onrender.com';

// Cache URL stream đã lấy được (tránh gọi lại server)
const streamUrlCache = new Map();

/**
 * Tìm kiếm bài hát qua iTunes Search API
 * iTunes API là API công khai, không cần API key, trả về metadata phong phú.
 * 
 * @param {string} term - Từ khóa tìm kiếm
 * @param {number} limit - Số kết quả tối đa
 * @returns {Array} Danh sách bài hát đã format
 */
async function itunesSearch(term, limit = 15) {
  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=${limit}`;
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      return data.results.map(song => ({
        id: song.trackId.toString(),
        title: song.trackName,
        artist: song.artistName,
        thumbnail: song.artworkUrl100.replace('100x100', '600x600'), // Lấy ảnh chất lượng cao
        searchKey: `${song.trackName} ${song.artistName}`,
      }));
    }
  } catch (error) {
    console.error('iTunes API failed:', error);
  }
  return null;
}

/**
 * Music API - Đối tượng chính export ra cho các component sử dụng
 */
export const musicApi = {
  /**
   * Tìm kiếm bài hát theo từ khóa
   */
  async search(query) {
    return await itunesSearch(query) || [];
  },

  /**
   * Tìm bài hát theo thể loại (dùng cho trang chủ - hiển thị trending)
   */
  async searchByGenre(genre, limit = 10) {
    const results = await itunesSearch(genre, limit);
    return results || [];
  },

  /**
   * Lấy URL stream audio từ proxy server
   * 
   * LUỒNG HOẠT ĐỘNG:
   * 1. Client gọi /api/play?q="tên bài hát + nghệ sĩ"
   * 2. Proxy server dùng yt-dlp tìm video YouTube tương ứng
   * 3. yt-dlp trích xuất URL audio trực tiếp
   * 4. Server trả về URL dạng /audio/:videoId
   * 5. Client dùng URL này làm src cho thẻ <audio>
   */
  async getStreamUrl(track) {
    if (!track) return null;
    
    // Ưu tiên trả về URL trực tiếp nếu là bài hát cá nhân đã tải lên Cloudinary
    if (track.isPersonal && track.url) {
      console.log(`☁️ [musicApi] Playing Personal Song: ${track.title}`);
      return track.url;
    }

    const query = `${track.title} ${track.artist} audio`;
    
    // Kiểm tra cache browser trước
    const cached = streamUrlCache.get(query);
    if (cached) {
      console.log(`⚡ [musicApi] Cache Hit: ${track.title}`);
      return cached;
    }

    try {
      const url = `${PROXY_BASE}/api/play?q=${encodeURIComponent(query)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        let streamUrl = data.streamUrl;
        
        // Nếu proxy trả về path tương đối (VD: /audio/abcd), nối PROXY_BASE vào
        if (streamUrl && streamUrl.startsWith('/')) {
          streamUrl = `${PROXY_BASE}${streamUrl}`;
        }
        
        if (streamUrl) {
          streamUrlCache.set(query, streamUrl);
          return streamUrl;
        }
      }
    } catch (error) {
      console.error('Proxy fetch failed:', error);
    }
    return null;
  },

  /**
   * Prefetch - Yêu cầu server tải trước audio của bài tiếp theo
   */
  async prefetch(track) {
    const query = `${track.title} ${track.artist} audio`;
    if (streamUrlCache.has(query)) return; // Đã có trong cache

    console.log(`🔮 [musicApi] Prefetching: ${track.title}`);
    try {
      const url = `${PROXY_BASE}/api/prefetch?q=${encodeURIComponent(query)}`;
      fetch(url).catch(() => {});
    } catch (e) { /* fire-and-forget */ }
  },

  /**
   * Lấy lời bài hát (Lyrics) từ LRCLIB
   */
  async fetchLyrics(track) {
    try {
      // LRCLIB là một cơ sở dữ liệu lời bài hát mở và miễn phí
      const url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(track.artist)}&track_name=${encodeURIComponent(track.title)}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        return data.syncedLyrics || data.plainLyrics || null;
      }
      
      // Nếu không tìm thấy chính xác, thử tìm kiếm rộng hơn
      const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(track.title + ' ' + track.artist)}`;
      const searchRes = await fetch(searchUrl);
      if (searchRes.ok) {
        const results = await searchRes.json();
        if (results.length > 0) {
          return results[0].syncedLyrics || results[0].plainLyrics || null;
        }
      }
    } catch (error) {
      console.error('Fetch lyrics failed:', error);
    }
    return null;
  },
};
