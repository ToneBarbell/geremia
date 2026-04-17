const express = require("express");
const app = express();

const CHANNELS_JSON_URL =
  "https://raw.githubusercontent.com/ZapprTV/channels/main/it/dtt/regional/lombardia.json";
const LOGOS_BASE_URL =
  "https://raw.githubusercontent.com/ZapprTV/channels/main/logos/";

function sendJson(res, data) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Content-Type", "application/json");
  res.send(JSON.stringify(data));
}

const manifest = {
  id: "org.zapprtv.geremia",
  version: "2.1.0",
  name: "Zappr Geremia",
  description: "Canali Zappr dinamici Lombardia",
  resources: ["catalog", "stream"],
  types: ["tv"],
  catalogs: [
    {
      type: "tv",
      id: "zappr_tv",
      name: "Zappr TV Lombardia"
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

function buildId(channel) {
  if (channel.slug) return `zappr_${normalizeName(channel.slug)}`;
  if (channel.name) return `zappr_${normalizeName(channel.name)}`;
  return `zappr_${Date.now()}`;
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

async function loadChannels() {
  const response = await fetch(CHANNELS_JSON_URL, {
    headers: {
      "User-Agent": "Zappr-Geremia/2.1.0"
    }
  });

  if (!response.ok) {
    throw new Error(`Errore caricamento Zappr: ${response.status}`);
  }

  const data = await response.json();
  const rawChannels = extractChannels(data);

  return rawChannels
    .filter((channel) => channel && channel.name && channel.url)
    .map((channel) => ({
      id: buildId(channel),
      type: "tv",
      name: channel.name,
      poster: buildPoster(channel.logo),
      background: buildPoster(channel.logo),
      stream: channel.url,
      lcn: channel.lcn,
      hd: channel.hd,
      source: channel
    }));
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
