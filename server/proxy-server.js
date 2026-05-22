/**
 * CORS Proxy Server for VibeCloud Music
 * Uses yt-dlp for reliable YouTube audio URL extraction.
 * Run: node proxy-server.js
 */

import http from "http";
import https from "https";
import { exec } from "child_process";
import { URL } from "url";

const PORT = process.env.PORT || 3001;

// Cache stream URLs (they expire after ~6 hours)
const streamCache = new Map();
const CACHE_TTL = 5 * 60 * 60 * 1000; // 5 hours

// Cache search query → videoId mapping
const searchCache = new Map();
const SEARCH_CACHE_TTL = 30 * 60 * 1000; // 30 min

// Track in-flight extractions to avoid duplicate work
const pendingExtractions = new Map();

function ytdlpGetAudio(videoId) {
  // Deduplicate: if already extracting this videoId, return the same promise
  if (pendingExtractions.has(videoId)) {
    console.log(`[DEDUP] Reusing in-flight extraction for: ${videoId}`);
    return pendingExtractions.get(videoId);
  }

  const promise = new Promise((resolve, reject) => {
    const cmd = `yt-dlp -f "bestaudio[ext=m4a]/bestaudio" --get-url --no-warnings "https://www.youtube.com/watch?v=${videoId}"`;
    exec(cmd, { timeout: 40000 }, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ [yt-dlp ERROR] videoId=${videoId}:`, error.message);
        console.error("stderr:", stderr);
        reject(error);
        return;
      }
      const url = stdout.trim();
      if (url && url.startsWith("http")) {
        resolve(url);
      } else {
        reject(new Error("No valid URL returned"));
      }
    });
  }).finally(() => {
    pendingExtractions.delete(videoId);
  });

  pendingExtractions.set(videoId, promise);
  return promise;
}

function ytdlpSearchOne(query) {
  return new Promise((resolve, reject) => {
    // Only search for 1 result — much faster than 5
    const cmd = `yt-dlp --default-search "ytsearch1" --get-id --no-download --no-warnings "${query}"`;
    exec(cmd, { timeout: 30000 }, (error, stdout, stderr) => {
      if (error) {
        console.error("yt-dlp search error:", error.message);
        console.error("stderr:", stderr);
        reject(error);
        return;
      }
      const videoId = stdout.trim().split("\n")[0]?.trim();
      if (videoId && videoId.length === 11) {
        resolve(videoId);
      } else {
        reject(new Error("No video ID found"));
      }
    });
  });
}

function ytdlpSearch(query) {
  return new Promise((resolve, reject) => {
    const cmd = `yt-dlp --default-search "ytsearch5" --get-id --get-title --no-download --no-warnings "${query}"`;
    exec(cmd, { timeout: 30000 }, (error, stdout, stderr) => {
      if (error) {
        console.error("yt-dlp search error:", error.message);
        console.error("stderr:", stderr);
        reject(error);
        return;
      }
      const lines = stdout.trim().split("\n").filter(l => l.trim());
      const results = [];
      for (let i = 0; i < lines.length - 1; i += 2) {
        results.push({
          title: lines[i],
          videoId: lines[i + 1],
          url: `/watch?v=${lines[i + 1]}`
        });
      }
      resolve(results);
    });
  });
}

// Helper: resolve query to a ready-to-play proxied URL
async function resolveStreamForQuery(query) {
  // Check search cache
  let videoId = searchCache.get(query);
  
  if (!videoId) {
    console.log(`[PLAY] Searching for: "${query}"`);
    videoId = await ytdlpSearchOne(query);
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
  const audioUrl = await ytdlpGetAudio(videoId);
  streamCache.set(videoId, { url: audioUrl, time: Date.now() });
  console.log(`[PLAY] ✅ Ready: ${videoId}`);

  return { videoId, proxiedUrl: `/audio/${videoId}` };
}

const server = http.createServer(async (req, res) => {
  // 1. Bulletproof CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PATCH, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "X-Requested-With, Content-Type, Authorization, Accept");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  // Handle Preflight OPTIONS
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  // 2. Health Check Route (Explicit CORS)
  if (pathname === "/ping") {
    res.writeHead(200, { 
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*" 
    });
    res.end(JSON.stringify({ 
      status: "ok", 
      engine: "yt-dlp",
      time: new Date().toISOString() 
    }));
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  // ============================================
  // NEW: /api/play?q=... — One-call search+extract (FAST)
  // ============================================
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

  // ============================================
  // NEW: /api/prefetch?q=... — Background pre-extract (fire-and-forget from client)
  // ============================================
  if (url.pathname === "/api/prefetch") {
    const q = url.searchParams.get("q") || "";
    console.log(`🔮 [PREFETCH] "${q}"`);

    // Respond immediately, do extraction in background
    res.writeHead(202, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "prefetching" }));

    // Fire-and-forget
    console.log(`🔮 [PREFETCH] Starting background extraction for: "${q}"`);
    resolveStreamForQuery(q).then(({ videoId }) => {
      console.log(`🔮 [PREFETCH] ✅ Ready in cache: ${videoId} (for "${q}")`);
    }).catch(e => {
      console.warn(`🔮 [PREFETCH] ❌ Failed for "${q}":`, e.message);
    });
    return;
  }

  // Route: /api/streams/:videoId — get audio URL
  if (url.pathname.startsWith("/api/streams/")) {
    const videoId = url.pathname.replace("/api/streams/", "");
    console.log(`[STREAM] Fetching audio for: ${videoId}`);

    const cached = streamCache.get(videoId);
    if (cached && Date.now() - cached.time < CACHE_TTL) {
      console.log(`[CACHE] Hit for: ${videoId}`);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ audioStreams: [{ url: cached.url, mimeType: "audio/m4a" }] }));
      return;
    }

    try {
      const audioUrl = await ytdlpGetAudio(videoId);
      streamCache.set(videoId, { url: audioUrl, time: Date.now() });
      console.log(`[STREAM] Success for: ${videoId}`);
      const proxiedUrl = `http://localhost:${PORT}/audio/${videoId}`;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ audioStreams: [{ url: proxiedUrl, mimeType: "audio/m4a" }] }));
    } catch (e) {
      console.error(`[STREAM] Failed for: ${videoId}`, e.message);
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Failed to extract audio", message: e.message }));
    }
    return;
  }

  // Route: /audio/:videoId — stream audio through proxy
  if (url.pathname.startsWith("/audio/")) {
    const videoId = url.pathname.replace("/audio/", "");
    console.log(`[AUDIO] Streaming audio for: ${videoId}`);

    function tryStream(audioUrl, range) {
      return new Promise((resolve, reject) => {
        const audioReqUrl = new URL(audioUrl);
        const client = audioReqUrl.protocol === "https:" ? https : http;
        const headers = {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
        };
        if (range) headers["Range"] = range;
        const proxyReq = client.get(audioUrl, { headers }, (proxyRes) => {
          resolve(proxyRes);
        });
        proxyReq.on("error", reject);
        proxyReq.setTimeout(15000, () => {
          proxyReq.destroy();
          reject(new Error("Stream request timed out"));
        });
      });
    }

    const range = req.headers.range;
    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
      attempts++;
      let audioUrl;

      if (attempts === 1) {
        const cached = streamCache.get(videoId);
        if (cached && Date.now() - cached.time < CACHE_TTL) {
          audioUrl = cached.url;
        }
      }

      if (!audioUrl) {
        try {
          console.log(`[AUDIO] Extracting fresh URL (attempt ${attempts})...`);
          audioUrl = await ytdlpGetAudio(videoId);
          streamCache.set(videoId, { url: audioUrl, time: Date.now() });
        } catch (e) {
          console.error(`[AUDIO] yt-dlp failed (attempt ${attempts}):`, e.message);
          if (attempts >= maxAttempts) {
            res.writeHead(502);
            res.end("Failed to get audio URL");
            return;
          }
          continue;
        }
      }

      try {
        const proxyRes = await tryStream(audioUrl, range);
        
        if (proxyRes.statusCode === 403 || proxyRes.statusCode === 410) {
          console.warn(`[AUDIO] Got ${proxyRes.statusCode}, invalidating cache...`);
          proxyRes.resume();
          streamCache.delete(videoId);
          continue;
        }

        const responseHeaders = {
          "Content-Type": proxyRes.headers["content-type"] || "audio/mp4",
          "Access-Control-Allow-Origin": "*",
          "Accept-Ranges": "bytes",
          "Cache-Control": "public, max-age=31536000, immutable"
        };
        if (proxyRes.headers["content-length"]) responseHeaders["Content-Length"] = proxyRes.headers["content-length"];
        if (proxyRes.headers["content-range"]) responseHeaders["Content-Range"] = proxyRes.headers["content-range"];
        
        console.log(`[AUDIO] ✅ Streaming (${proxyRes.statusCode}) for: ${videoId}`);
        res.writeHead(proxyRes.statusCode, responseHeaders);
        proxyRes.pipe(res);
        return;
      } catch (e) {
        console.error(`[AUDIO] Stream error (attempt ${attempts}):`, e.message);
        streamCache.delete(videoId);
        if (attempts >= maxAttempts) {
          if (!res.headersSent) {
            res.writeHead(502);
            res.end("Audio proxy error");
          }
          return;
        }
      }
    }
    return;
  }

  // Route: /api/search?q=...
  if (url.pathname === "/api/search") {
    const q = url.searchParams.get("q") || "";
    console.log(`[SEARCH] Query: "${q}"`);
    try {
      const results = await ytdlpSearch(q);
      console.log(`[SEARCH] Found ${results.length} results`);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ items: results }));
    } catch (e) {
      console.error(`[SEARCH] Failed:`, e.message);
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Search failed", items: [] }));
    }
    return;
  }

  // Health check
  if (url.pathname === "/health" || url.pathname === "/ping") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", engine: "yt-dlp", timestamp: Date.now() }));
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`\n🎵 VibeCloud Proxy (yt-dlp) running on http://localhost:${PORT}`);
  console.log(`   Routes:`);
  console.log(`   GET /api/play?q=...        → ⚡ One-call search+extract (FAST)`);
  console.log(`   GET /api/prefetch?q=...    → 🔮 Background pre-extract`);
  console.log(`   GET /api/streams/:videoId  → Get proxied audio URL`);
  console.log(`   GET /audio/:videoId        → Stream audio (passthrough)`);
  console.log(`   GET /api/search?q=...      → YouTube music search\n`);
});

