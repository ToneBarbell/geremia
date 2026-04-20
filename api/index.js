const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();

const NATIONAL_JSON_PATH = path.join(process.cwd(), "data", "national.json");
const LOMBARDIA_JSON_PATH = path.join(process.cwd(), "data", "regional", "lombardia.json");

// NUOVO: i tuoi loghi su GitHub
const GEREMIA_LOGOS_BASE = "https://raw.githubusercontent.com/ToneBarbell/geremia/main/loghi/";

// Vecchie costanti (lasciate per fallback)
const ZAPPR_LOGOS_BASE = "https://channels.zappr.stream/logos/it";
const ZAPPR_OPTIMIZED_LOGOS_BASE = "https://channels.zappr.stream/logos/it/optimized";
const TUNDRAK_LOGOS_BASE = "https://cdn.jsdelivr.net/gh/Tundrak/IPTV-Italia/logos/";

function sendJson(res, data) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Content-Type", "application/json");
  res.send(JSON.stringify(data));
}

const manifest = {
  id: "org.zapprtv.geremia",
  version: "3.0.9",
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
    .replace(/[\\u0300-\\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeLogoKey(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\\u0300-\\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .replace(/^_+|_+$/g, "");
}

function buildId(channel, prefix = "zappr", parentLcn = null) {
  const lcn = channel.lcn ?? parentLcn ?? "x";
  const base = channel.id || (channel.epg && channel.epg.id) || channel.name || "canale";
  return `${prefix}_${lcn}_${normalizeName(base)}`;
}

function buildLogoCandidates(channel) {
  const byName = normalizeLogoKey(channel?.name);
  const byId = normalizeLogoKey(channel?.id);
  const byEpgId = normalizeLogoKey(channel?.epg?.id);

  const manual = {
    rai1: "rai1",
    rai2: "rai2",
    rai3: "rai3",
    rai4: "rai4",
    rai5: "rai5",
    raimovie: "raimovie",
    raipremium: "raipremium",
    raistoria: "raistoria",
    raiscuola: "raiscuola",
    raisport: "raisport",
    raigulp: "raigulp",
    raiyoyo: "raiyoyo",
    rainews24: "rainews24",
    rete4: "rete4",
    canale5: "canale5",
    italia1: "italia1",
    la7: "la7",
    tv8: "tv8",
    nove: "nove",
    discovery: "discovery",
    focus: "focus",
    giallo: "giallo",
    topcrime: "topcrime",
    boing: "boing",
    k2: "k2",
    cartoonito: "cartoonito",
    frisbee: "frisbee",
    realtime: "realtime",
    dmax: "dmax",
    la5: "la5",
    cine34: "cine34",
    iris: "iris",
    mediasetextra: "mediasetextra",
    la7cinema: "la7cinema",
    la7d: "la7d",
    skytg24: "skytg24",
    tgcom24: "tgcom24",
    qvc: "qvc",
    hgtv: "hgtv",
    foodnetwork: "foodnetwork",
    supertennis: "supertennis",
    telelombardia: "telelombardia",
    telereporter: "telereporter",
    lombardiatv: "lombardiatv",
    antennatre: "antennatre",
    malpensa24tv: "malpensa24",
    topcalcio24: "topcalcio24"
  };

  const ordered = [
    manual[byName],
    manual[byId],
    manual[byEpgId],
    byName,
    byId,
    byEpgId
  ].filter(Boolean);

  return [...new Set(ordered)];
}

// MODIFICATO: priorità ai TUOI loghi GitHub
function buildLogoUrl(channel) {
  const candidates = buildLogoCandidates(channel);

  for (const key of candidates) {
    if (!key) continue;

    // PRIORITÀ 1: I TUOI LOGHI GitHub
    const geremiaUrl = `${GEREMIA_LOGOS_BASE}${key}.png`;
    
    // Priorità successive (fallback)
    const urls = [
      geremiaUrl,  // I TUOI LOGHI
      `${ZAPPR_OPTIMIZED_LOGOS_BASE}/${key}.webp`,
      `${ZAPPR_LOGOS_BASE}/${key}.png`,
      `${TUNDRAK_LOGOS_BASE}${key}.png`
    ];

    // Ritorna il primo disponibile (i tuoi loghi hanno priorità massima)
    for (const url of urls) {
      // Controlla se esiste (solo per sviluppo, in produzione puoi togliere)
      // fetch(url).then(r => r.ok).catch(() => false)
      return url;
    }
  }

  return undefined;
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

function isAdultOrShopping(channel) {
  if (!channel) return false;
  if (channel.adult === true) return true;

  const name = String(channel.name || "").toLowerCase();
  if (
    name.includes("adult") ||
    name.includes("shopping") ||
    name.includes("promo")
  ) {
    return true;
  }

  return false;
}

function isHbbtvAppOnly(channel) {
  if (!channel) return false;
  if (channel.hbbtvapp === true) return true;
  if (channel.hbbtvmosaic === true) return true;
  return false;
}

function isHttpUrl(url) {
  return typeof url === "string" && /^https?:\\/\\//i.test(url.trim());
}

function isIframeOnly(channel) {
  return String(channel.type || "").toLowerCase() === "iframe";
}

function buildRaiRelinkerUrlFromIframeUrl(url) {
  if (!isHttpUrl(url)) return null;

  try {
    const parsed = new URL(url);
    const videoURL = parsed.searchParams.get("videoURL");
    const cont = parsed.searchParams.get("cont");

    if (!videoURL || !cont) return null;

    const base = videoURL.replace(/\\/+$/, "");
    return `${base}?cont=${encodeURIComponent(cont)}&output=16`;
  } catch {
    return null;
  }
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

  const type = String(channel.type || "").toLowerCase();

  if (type === "iframe") {
    const raiRelinker = buildRaiRelinkerUrlFromIframeUrl(channel.url);
    if (raiRelinker) return raiRelinker;
  }

  if (isHttpUrl(channel.url) && type !== "iframe") {
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
    const fallbackType = String(channel.fallback.type || "").toLowerCase();

    if (fallbackType === "iframe") {
      const raiRelinker = buildRaiRelinkerUrlFromIframeUrl(channel.fallback.url);
      if (raiRelinker) return raiRelinker;
    }

    if (fallbackType !== "iframe") {
      return channel.fallback.url.trim();
    }
  }

  return null;
}

function buildStreamUrl(channel) {
  return pickRawPlayableUrl(channel);
}

function isVisibleTvChannel(channel) {
  if (!channel || !channel.name) return false;
  if (isRadioChannel(channel)) return false;
  if (isAdultOrShopping(channel)) return false;
  if (isHbbtvAppOnly(channel)) return false;
  return !!buildStreamUrl(channel) || isIframeOnly(channel);
}

function flattenChannels(channels, prefix = "zappr", parentLcn = null) {
  const result = [];

  for (const channel of channels) {
    if (!channel || !channel.name) continue;

    if (isVisibleTvChannel(channel)) {
      const id = buildId(channel, prefix, parentLcn);
      const streamUrl = buildStreamUrl(channel);
      const logo = buildLogoUrl(channel);

      result.push({
        id,
        type: "tv",
        name: channel.name,
        poster: logo,
        background: logo,
        logo: logo,
        streamUrl,
        iframeOnly: isIframeOnly(channel),
        lcn: channel.lcn ?? parentLcn ?? null,
        hd: !!channel.hd,
        source: channel
      });
    }

    if (Array.isArray(channel.channels)
