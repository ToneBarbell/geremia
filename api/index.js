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
  version: "2.3.0",
  name: "Zappr Geremia",
  description: "Canali Zappr dinamici nazionali + Lombardia",
  resources: ["catalog", "stream"],
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

function buildPoster(logo) {
  if (!logo) return undefined;
  if (logo.startsWith("http://") || logo.startsWith("https://")) return logo;
  return `${LOGOS_BASE_URL}${logo}`;
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

  const hasDirectStream =
    typeof channel.url === "string" &&
    channel.url.trim() !== "" &&
    !channel.hbbtvapp &&
    !channel.hbbtvmosaic;

  if (!hasDirectStream) return false;

  return true;
}

function flattenChannels(channels, prefix = "zappr", parentLcn = null) {
  const result = [];

  for (const channel of channels) {
    if (!channel || !channel.name) continue;

    if (isRealTvChannel(channel)) {
      result.push({
        id: buildId(channel, prefix),
        type: "tv",
        name: channel.name,
        poster: buildPoster(channel.logo),
        background: buildPoster(channel.logo),
        stream: channel.url,
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
      "User-Agent": "Zappr-Geremia/2.3.0"
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

    const key = channel.id || `${channel.name}_${channel.stream}`;
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
        posterShape: "square"
      }))
    });
  } catch (error) {
    console.error(error);
    sendJson(res, { metas: [] });
  }
});

app.get("/stream/tv/:id.json", async (req, res) => {
  try {
    const channels = await loadChannels();
    const channel = channels.find((c) => c.id === req.params.id);

    if (!channel) {
      return sendJson(res, { streams: [] });
    }

    sendJson(res, {
      streams: [
        {
          title: channel.hd ? `${channel.name} HD` : channel.name,
          url: channel.stream
        }
      ]
    });
  } catch (error) {
    console.error(error);
    sendJson(res, { streams: [] });
  }
});

module.exports = app;
