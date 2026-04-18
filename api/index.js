const express = require("express");
const app = express();

const NATIONAL_JSON_URL = "https://raw.githubusercontent.com/ZapprTV/channels/refs/heads/main/it/dtt/national.json";
const LOMBARDIA_JSON_URL = "https://raw.githubusercontent.com/ZapprTV/channels/refs/heads/main/it/dtt/regional/lombardia.json";
const LOGOS_BASE_URL = "https://raw.githubusercontent.com/ZapprTV/channels/refs/heads/main/logos/";

function sendJson(res, data) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Content-Type", "application/json");
  res.send(JSON.stringify(data));
}

const manifest = {
  id: "org.zapprtv.geremia",
  version: "3.0.3",
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

function isIframeOnly(channel) {
  return String(channel.type || "").toLowerCase() === "iframe";
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
  if (isIframeOnly(channel)) return null;
  return pickRawPlayableUrl(channel);
}

function isRealTvChannel(channel) {
  if (!channel || !channel.name) return false;
  if (isRadioChannel(channel)) return false;
  return !!buildStreamUrl(channel);
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
          
