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
  version: "2.6.3",
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

function isBlockedPageUrl(url) {
  if (typeof url !== "string") return true;
  const clean = url.trim();
  if (!clean) return true;
  if (clean.startsWith("zappr://")) return true;

  const lower = clean.toLowerCase();

  if (lower.includes("raiplay.it/dirette/")) return true;
  if (lower.includes("mediasetinfinity.mediaset.it")) return true;
  if (lower.includes("wittytv.it")) return true;

  return false;
}

function normalizeRaiRelinker(url) {
  if (typeof url !== "string") return null;
  const clean = url.trim();
  if (!clean) return null;
  if (!clean.includes("mediapolis.rai.it/relinker/relinkerServlet.htm")) return null;

  try {
    const u = new URL(clean);

    if (!u.searchParams.get("output")) {
      u.searchParams.set("output", "16");
    }

    if (!u.searchParams.get("forceUserAgent")) {
      u.searchParams.set("forceUserAgent", "raiplayappletv");
    }

    return u.toString();
  } catch {
    return clean;
  }
}

function getDirectUrlFromChannel(channel) {
  if (!channel) return null;

  const type = String(channel.type || "").toLowerCase();

  if (
    channel.nativeHLS &&
    typeof channel.nativeHLS === "object" &&
    typeof channel.nativeHLS.url === "string" &&
    channel.nativeHLS.url.trim() !== ""
  ) {
    return channel.nativeHLS.url.trim();
  }

  if (
    typeof channel.url === "string" &&
    channel.url.includes("mediapolis.rai.it/relinker/relinkerServlet.htm")
  ) {
    return normalizeRaiRelinker(channel.url);
  }

  if (
    (type === "hls" || type === "dash") &&
    typeof channel.url === "string" &&
    channel.url.trim() !== "" &&
    !isBlockedPageUrl(channel.url)
  ) {
    return channel.url.trim();
  }

  if (
    channel
