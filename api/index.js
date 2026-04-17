const express = require("express");
const app = express();

const NATIONAL_JSON_URL =
  "https://raw.githubusercontent.com/ZapprTV/channels/refs/heads/main/it/dtt/national.json";
const LOMBARDIA_JSON_URL =
  "https://raw.githubusercontent.com/ZapprTV/channels/refs/heads/main/it/dtt/regional/lombardia.json";
const LOGOS_BASE_URL =
  "https://raw.githubusercontent.com/ZapprTV/channels/refs/heads/main/logos/";

function sendJson(res, data) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Content-Type", "application/json");
  res.send(JSON.stringify(data));
}

const manifest = {
  id: "org.zapprtv.geremia",
  version: "2.6.0",
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

function buildId(channel, prefix = "zappr") {
  if (channel.id) return `${prefix}_${normalizeName(channel.id)}`;
  if (channel.name) return `${prefix}_${normalizeName(channel.name)}`;
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
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

function isRealTvChannel(channel) {
  if (!channel || !channel.name) return false;

  const type = String(channel.type || "").toLowerCase();

  const isRadio =
    type === "audio" ||
    channel.radio === true ||
    channel.isRadio === true;

  if (isRadio) return false;

  const hasPlayableSource =
    (typeof channel.url === "string" && channel.url.trim() !== "") ||
    (channel.geoblock &&
      typeof channel.geoblock === "object" &&
      typeof channel.geoblock.url === "string" &&
      channel.geoblock.url.trim() !== "") ||
    (channel.nativeHLS &&
      typeof channel.nativeHLS.url === "string" &&
      channel.nativeHLS.url.trim() !== "") ||
    (channel.fallback &&
      typeof channel.fallback === "object" &&
      typeof channel.fallback.url === "string" &&
      channel.fallback.url.trim() !== "");

  return hasPlayableSource;
}

function resolveStream(channel) {
  if (!channel) return null;

  const type = String(channel.type || "").toLowerCase();

  if (
    channel.nativeHLS &&
    typeof channel.nativeHLS.url === "string" &&
    channel.nativeHLS.url.trim() !== ""
  ) {
    return {
      url: channel.nativeHLS.url
    };
  }

  if (
    (type === "hls" || type === "dash") &&
    typeof channel.url === "string" &&
    channel.url.trim() !== "" &&
    !channel.url.startsWith("zappr://")
  ) {
    return {
      url: channel.url
    };
  }

  if (
    channel.geoblock &&
    typeof channel.geoblock === "object" &&
    typeof channel.geoblock.url === "string" &&
    channel.geoblock.url.trim() !== ""
  ) {
    return {
      url: channel.geoblock.url
    };
  }

  if (
    channel.fallback &&
    typeof channel.fallback === "object" &&
    typeof channel.fallback.url === "string" &&
    channel.fallback.url.trim() !== ""
  ) {
    return {
      externalUrl: channel.fallback.url
    };
  }

  if (
    (type === "iframe" || type === "popup") &&
    typeof channel.url === "string" &&
    channel.url.trim() !== ""
  ) {
    return {
      externalUrl: channel.url
    };
  }

  return null;
}

function flattenChannels(channels, prefix = "zappr", parentLcn = null) {
  const result = [];

  for (const channel of channels) {
    if (!channel || !channel.name) continue;

    if (isRealTvChannel(channel)) {
      const logoUrl = buildLogoUrl(channel.logo);
      const resolvedStream = resolveStream(channel);

      if (resolvedStream) {
        result.push({
          id: buildId(channel, prefix),
          type: "tv",
          name: channel.name,
          poster: buildPoster(channel),
          background: buildBackground(channel),
          logo: logoUrl,
          stream: resolvedStream,
          lcn: channel.lcn ?? parentLcn ?? null,
          hd: !!channel.hd,
          source: channel
        });
      }
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
      "User-Agent": "Zappr-Geremia/2.6.0"
    }
  });

  if (!response.ok) {
    throw new Error(`Errore ${response.status} su ${url}`);
  }

  const data = await response.json();
  const rawChannels = extractChannels(data);
  return flattenChannels(rawChannels, prefix);
}

function dedupeChannels(channels) {
  const map = new Map();

  for (const channel of channels) {
    if (!channel.stream) continue;

    const key = channel.id || `${channel.name}_${JSON.stringify(channel.stream)}`;
    if (!map.has(key)) {
      map.set(key, channel);
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
        type: channel.type,
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
        type: channel.type,
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

    if (!channel || !channel.stream) {
      return sendJson(res, { streams: [] });
    }

    const streamItem = {
      title: channel.hd ? `${channel.name} HD` : channel.name,
      ...channel.stream
    };

    sendJson(res, {
      streams: [streamItem]
    });
  } catch (error) {
    console.error(error);
    sendJson(res, { streams: [] });
  }
});

module.exports = app;
