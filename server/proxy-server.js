/**
 * CORS Proxy Server for VibeCloud Music
 * Uses @distube/ytdl-core and yt-search for fast, reliable YouTube audio extraction.
 * Run: node proxy-server.js
 */

import http from "http";
import https from "https";
import { URL } from "url";
import ytdl from "@distube/ytdl-core";
import yts from "yt-search";

const PORT = process.env.PORT || 3001;

// Cache stream URLs (they expire after ~2 hours)
const streamCache = new Map();
const CACHE_TTL = 2 * 60 * 60 * 1000;

const searchCache = new Map();
const SEARCH_CACHE_TTL = 30 * 60 * 1000;

async function resolveStreamForQuery(query) {
  let videoId = searchCache.get(query);
  
  if (!videoId) {
    console.log(`[PLAY] Searching for: "${query}"`);
    const r = await yts(query + ' official audio');
    if (!r.videos || r.videos.length === 0) {
      throw new Error("No video found");
    }
    videoId = r.videos[0].videoId;
    searchCache.set(query, videoId);
    setTimeout(() => searchCache.delete(query), SEARCH_CACHE_TTL);
    console.log(`[PLAY] Found videoId: ${videoId}`);
  } else {
    console.log(`[PLAY] Search cache hit → ${videoId}`);
  }

  // Check stream cache
  const cached = streamCache.get(videoId);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    console.log(`[PLAY] Stream cache hit for: ${videoId}`);
    return { videoId, proxiedUrl: `/audio/${videoId}` };
  }

  // Extract audio URL
  console.log(`[PLAY] Extracting audio for: ${videoId}...`);
  const info = await ytdl.getInfo(videoId);
  const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
  const bestAudio = audioFormats.sort((a, b) => (b.audioBitrate || 0) - (a.audioBitrate || 0))[0];
  
  if (!bestAudio || !bestAudio.url) {
    throw new Error("Could not extract audio URL");
  }

  streamCache.set(videoId, { url: bestAudio.url, time: Date.now() });
  console.log(`[PLAY] ✅ Ready: ${videoId}`);

  return { videoId, proxiedUrl: `/audio/${videoId}` };
}

const server = http.createServer(async (req, res) => {
  // 1. Bulletproof CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PATCH, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "X-Requested-With, Content-Type, Authorization, Accept");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  // Route: Health check
  if (url.pathname === "/ping" || url.pathname === "/") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "alive" }));
    return;
  }

  // Route: /api/play?q=...
  if (url.pathname === "/api/play") {
    const q = url.searchParams.get("q") || "";
    console.log(`\n⚡ [PLAY] "${q}"`);
    const startTime = Date.now();

    try {
      const { videoId, proxiedUrl } = await resolveStreamForQuery(q);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`⚡ [PLAY] Done in ${elapsed}s`);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ 
        videoId, 
        streamUrl: proxiedUrl,
        cached: elapsed < 1 
      }));
    } catch (e) {
      console.error(`[PLAY] Failed:`, e.message);
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Failed to resolve stream", message: e.message }));
    }
    return;
  }

  // Route: /api/prefetch?q=...
  if (url.pathname === "/api/prefetch") {
    const q = url.searchParams.get("q") || "";
    console.log(`🔮 [PREFETCH] "${q}"`);
    res.writeHead(202, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "prefetching" }));
    resolveStreamForQuery(q).then(({ videoId }) => {
      console.log(`🔮 [PREFETCH] ✅ Ready in cache: ${videoId}`);
    }).catch(e => {
      console.warn(`🔮 [PREFETCH] ❌ Failed:`, e.message);
    });
    return;
  }

  // Route: /audio/:videoId
  if (url.pathname.startsWith("/audio/")) {
    const videoId = url.pathname.replace("/audio/", "");
    console.log(`[AUDIO] Streaming audio for: ${videoId}`);

    function tryStream(audioUrl, range) {
      return new Promise((resolve, reject) => {
        const audioReqUrl = new URL(audioUrl);
        const client = audioReqUrl.protocol === "https:" ? https : http;
        const headers = {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        };
        if (range) headers["Range"] = range;

        const proxyReq = client.get(audioReqUrl, { headers }, (proxyRes) => {
          if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
            console.log(`[AUDIO] Redirecting to new URL...`);
            resolve(tryStream(proxyRes.headers.location, range));
            return;
          }
          if (proxyRes.statusCode >= 400) {
            reject(new Error(`YouTube returned status ${proxyRes.statusCode}`));
            return;
          }
          const resHeaders = {
            "Content-Type": proxyRes.headers["content-type"] || "audio/m4a",
            "Accept-Ranges": "bytes",
            "Cache-Control": "public, max-age=3600"
          };
          if (proxyRes.headers["content-length"]) resHeaders["Content-Length"] = proxyRes.headers["content-length"];
          if (proxyRes.headers["content-range"]) resHeaders["Content-Range"] = proxyRes.headers["content-range"];
          res.writeHead(proxyRes.statusCode || 200, resHeaders);
          proxyRes.pipe(res);
          proxyRes.on("end", () => resolve());
          proxyRes.on("error", reject);
        });
        proxyReq.on("error", reject);
        req.on("close", () => proxyReq.destroy());
      });
    }

    try {
      const cached = streamCache.get(videoId);
      if (!cached) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: "Stream URL not found in cache. Call /api/play first." }));
        return;
      }
      await tryStream(cached.url, req.headers.range);
      console.log(`[AUDIO] Stream ended normally: ${videoId}`);
    } catch (error) {
      console.error(`[AUDIO] Streaming error:`, error.message);
      if (!res.headersSent) {
        res.writeHead(502);
        res.end(JSON.stringify({ error: "Streaming failed" }));
      }
    }
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not Found" }));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[SYSTEM] CORS Proxy Server running on port ${PORT}`);
});
