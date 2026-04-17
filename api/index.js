const express = require("express");
const app = express();

const NATIONAL_JSON_URL =
  "https://raw.githubusercontent.com/ZapprTV/channels/refs/heads/main/it/dtt/national.json";
const LOMBARDIA_JSON_URL =
  "https://raw.githubusercontent.com/ZapprTV/channels/refs/heads/main/it/dtt/regional/lombardia.json";
const LOGOS_BASE_URL =
  "https://raw.githubusercontent.com/ZapprTV/channels/refs/heads/main/logos/";

const RAI_HBBTV_UA = "HbbTV/1.6.1";
const DEFAULT_FETCH_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36";

function sendJson(res, data) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Content-Type", "application/json");
  res.send(JSON.stringify(data));
}

const manifest = {
  id: "org.zapprtv.geremia",
  version: "3.0.0",
  name: "Zappr Geremia",
  description: "Canali Zappr dinamici nazionali + Lombardia",
  resources: ["catalog", "meta", "stream"],
  types: ["tv"],
  catalogs: [
    {
      type: "tv",
      id: "zappr_tv",
      name: "Zappr TV Lombardia + Nazionali"
    }
  ]
};

function normalizeName(name) {
  return String(name || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function buildId(channel, prefix = "zappr", parentLcn = null) {
  const lcn = channel.lcn ?? parentLcn ?? "x";
  const base = channel.id || channel.epg?.id || channel.name || "canale";
  return `${prefix}_${lcn}_${normalizeName(base)}`;
}

function buildLogoUrl(logo) {
  if (!logo) return undefined;
  if (logo.startsWith("http://") || logo.startsWith("https://")) return logo;
  return `${LOGOS_BASE_URL}${logo}`;
}

function buildTextImage(text, bg = "F3F4F6", fg = "111827") {
  const cleanText = encodeURIComponent(String(text || "Canale TV").slice(0, 40));
  return `https://placehold.co/300x450/${bg}/${fg}.png?text=${cleanText}`;
}

function buildPoster(channel) {
  return buildTextImage(channel.name || "Canale TV", "F3F4F6", "111827");
}

function buildBackground(channel) {
  return buildTextImage(channel.name || "Canale TV", "E5E7EB", "111827");
}

function extractChannels(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.channels)) return data.channels;
  if (Array.isArray(data.items)) return data.items;
  return [];
}

function isRadioChannel(channel) {
  if (!channel) return true;
  const type = String(channel.type || "").toLowerCase();
  if (type === "audio") return true;
  if (channel.radio === true) return true;
  if (channel.isRadio === true) return true;
  return false;
}

function isHttpUrl(url) {
  return typeof url === "string" && /^https?:\/\//i.test(url.trim());
}

function isRaiRelinkerUrl(url) {
  return isHttpUrl(url) && url.includes("mediapolis.rai.it/relinker/relinkerServlet.htm");
}

function pickRawPlayableUrl(channel) {
  if (!channel) return null;

  if (
    channel.nativeHLS &&
    typeof channel.nativeHLS === "object" &&
    isHttpUrl(channel.nativeHLS.url)
  ) {
    return channel.nativeHLS.url.trim();
  }

  if (isHttpUrl(channel.url)) {
    return channel.url.trim();
  }

  if (
    channel.geoblock &&
    typeof channel.geoblock === "object" &&
    isHttpUrl(channel.geoblock.url)
  ) {
    return channel.geoblock.url.trim();
  }

  if (
    channel.fallback &&
    typeof channel.fallback === "object" &&
    isHttpUrl(channel.fallback.url)
  ) {
    return channel.fallback.url.trim();
  }

  return null;
}

function buildStreamUrl(channel) {
  const rawUrl = pickRawPlayableUrl(channel);
  if (!rawUrl) return null;
  if (rawUrl.startsWith("zappr://")) return null;
  return rawUrl;
}

function isRealTvChannel(channel) {
  if (!channel || !channel.name) return false;
  if (isRadioChannel(channel)) return false;
  return !!pickRawPlayableUrl(channel);
}

function flattenChannels(channels, prefix = "zappr", parentLcn = null) {
  const result = [];

  for (const channel of channels) {
    if (!channel || !channel.name) continue;

    if (isRealTvChannel(channel)) {
      const id = buildId(channel, prefix, parentLcn);
      const streamUrl = buildStreamUrl(channel);

      result.push({
        id,
        type: "tv",
        name: channel.name,
        poster: buildPoster(channel),
        background: buildBackground(channel),
        logo: buildLogoUrl(channel.logo),
        streamUrl,
        lcn: channel.lcn ?? parentLcn ?? null,
        hd: !!channel.hd,
        source: channel
      });
    }

    if (Array.isArray(channel.channels) && channel.channels.length > 0) {
      result.push(
        ...flattenChannels(
          channel.channels,
          prefix,
          channel.lcn ?? parentLcn ?? null
        )
      );
    }

    if (Array.isArray(channel.hbbtv) && channel.hbbtv.length > 0) {
      result.push(
        ...flattenChannels(
          channel.hbbtv,
          prefix,
          channel.lcn ?? parentLcn ?? null
        )
      );
    }
  }

  return result;
}

async function loadSource(url, prefix) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Zappr-Geremia/3.0.0"
    }
  });

  if (!response.ok) {
    throw new Error(`Errore ${response.status} su ${url}`);
  }

  const data = await response.json();
  return flattenChannels(extractChannels(data), prefix);
}

function dedupeChannels(channels) {
  const map = new Map();

  for (const channel of channels) {
    if (!channel.id) continue;
    if (!map.has(channel.id)) {
      map.set(channel.id, channel);
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    const lcnA = a.lcn ?? 999999;
    const lcnB = b.lcn ?? 999999;

    if (lcnA !== lcnB) return lcnA - lcnB;
    return a.name.localeCompare(b.name, "it");
  });
}

async function loadChannels() {
  const [nationalChannels, lombardiaChannels] = await Promise.all([
    loadSource(NATIONAL_JSON_URL, "zappr"),
    loadSource(LOMBARDIA_JSON_URL, "zappr")
  ]);

  return dedupeChannels([...nationalChannels, ...lombardiaChannels]);
}

function addOrReplaceParam(url, key, value) {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set(key, value);
    return parsed.toString();
  } catch {
    return url;
  }
}

async function fetchTextWithHeaders(url, headers = {}, redirect = "follow") {
  const response = await fetch(url, {
    method: "GET",
    redirect,
    headers
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} su ${url}`);
  }

  return await response.text();
}

function extractFirstHttpUrl(text) {
  if (!text) return null;
  const match = text.match(/https?:\/\/[^\s"'<>]+/i);
  return match ? match[0] : null;
}

function decodeHtmlEntities(str) {
  return String(str || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x2F;/g, "/")
    .replace(/&#47;/g, "/");
}

async function resolveRaiStream(url) {
  const baseUrl = addOrReplaceParam(url, "forceUserAgent", "raiplayappletv");
  const candidateUrls = [
    addOrReplaceParam(baseUrl, "output", "7"),
    addOrReplaceParam(baseUrl, "output", "16"),
    addOrReplaceParam(baseUrl, "output", "62"),
    baseUrl
  ];

  const headers = {
    "User-Agent": RAI_HBBTV_UA,
    "Accept": "*/*",
    "Referer": "https://www.raiplay.it/",
    "Origin": "https://www.raiplay.it"
  };

  for (const candidate of candidateUrls) {
    try {
      const text = await fetchTextWithHeaders(candidate, headers, "follow");
      const clean = decodeHtmlEntities(text);

      let finalUrl = null;

      try {
        const json = JSON.parse(clean);
        finalUrl =
          json.video?.contentUrl ||
          json.videoURL ||
          json.url ||
          json.mediaUri ||
          json.stream ||
          null;
      } catch {
        finalUrl = extractFirstHttpUrl(clean);
      }

      if (finalUrl && isHttpUrl(finalUrl)) {
        return finalUrl;
      }
    } catch (_) {
    }
  }

  throw new Error("Impossibile risolvere stream Rai");
}

app.get("/", (req, res) => {
  res.redirect("/manifest.json");
});

app.get("/manifest.json", (req, res) => {
  sendJson(res, manifest);
});

app.get("/catalog/tv/zappr_tv.json", async (req, res) => {
  try {
    const channels = await loadChannels();

    sendJson(res, {
      metas: channels.map((channel) => ({
        id: channel.id,
        type: "tv",
        name: channel.lcn ? `${channel.lcn} - ${channel.name}` : channel.name,
        poster: channel.poster,
        background: channel.background,
        logo: channel.logo,
        posterShape: "poster"
      }))
    });
  } catch (error) {
    console.error(error);
    sendJson(res, { metas: [] });
  }
});

app.get("/meta/tv/:id.json", async (req, res) => {
  try {
    const channels = await loadChannels();
    const channel = channels.find((c) => c.id === req.params.id);

    if (!channel) {
      return sendJson(res, { meta: null });
    }

    sendJson(res, {
      meta: {
        id: channel.id,
        type: "tv",
        name: channel.lcn ? `${channel.lcn} - ${channel.name}` : channel.name,
        poster: channel.poster,
        background: channel.background,
        logo: channel.logo,
        posterShape: "poster",
        description: `Canale TV live: ${channel.name}`
      }
    });
  } catch (error) {
    console.error(error);
    sendJson(res, { meta: null });
  }
});

app.get("/stream/tv/:id.json", async (req, res) => {
  try {
    const channels = await loadChannels();
    const channel = channels.find((c) => c.id === req.params.id);

    if (!channel || !channel.streamUrl) {
      return sendJson(res, { streams: [] });
    }

    let finalUrl = channel.streamUrl;

    if (isRaiRelinkerUrl(finalUrl)) {
      finalUrl = await resolveRaiStream(finalUrl);
    }

    sendJson(res, {
      streams: [
        {
          title: channel.hd ? `${channel.name} HD` : channel.name,
          url: finalUrl,
          behaviorHints: {
            notWebReady: true
          }
        }
      ]
    });
  } catch (error) {
    console.error(error);
    sendJson(res, { streams: [] });
  }
});

app.options("*", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.status(204).end();
});

module.exports = app;
