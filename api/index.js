const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");
const fs = require("fs");
const path = require("path");

const builder = new addonBuilder({
  id: "com.geremia.tv",
  version: "3.0.9",
  name: "Geremia TV",
  description: "Canali TV italiani nazionali + Lombardia",
  resources: ["catalog", "meta", "stream"],
  types: ["tv"],
  idPrefixes: ["geremia:"],
  catalogs: [
    {
      type: "tv",
      id: "geremia-tv",
      name: "Geremia TV"
    }
  ]
});

function readJson(relativePath) {
  const fullPath = path.join(process.cwd(), relativePath);
  const raw = fs.readFileSync(fullPath, "utf8");
  return JSON.parse(raw);
}

function flattenChannels(items = []) {
  const out = [];

  for (const ch of items) {
    if (!ch || !ch.name || !ch.url) continue;

    out.push({
      ...ch,
      sublcn: null,
      isSubchannel: false
    });

    if (Array.isArray(ch.hbbtv)) {
      for (const sub of ch.hbbtv) {
        if (!sub || !sub.name || !sub.url) continue;

        out.push({
          ...sub,
          parentLcn: ch.lcn,
          lcn: ch.lcn,
          sublcn: sub.sublcn || null,
          isSubchannel: true
        });
      }
    }
  }

  return out;
}

function normalizeType(type = "") {
  return String(type).trim().toLowerCase();
}

function shouldKeepChannel(ch) {
  const type = normalizeType(ch.type);
  if (!["hls", "iframe", "youtube", "twitch"].includes(type)) return false;

  const name = (ch.name || "").toLowerCase();
  if (name.includes("radio")) return false;

  return true;
}

function makeId(ch) {
  const sub = ch.sublcn ? `-${ch.sublcn}` : "";
  return `geremia:${ch.lcn}${sub}:${slugify(ch.name)}`;
}

function slugify(str = "") {
  return String(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function logoUrl(logo) {
  if (!logo) return "https://via.placeholder.com/512x512.png?text=TV";

  const clean = logo.endsWith(".png") || logo.endsWith(".svg") ? logo : `${logo}.png`;

  return `https://raw.githubusercontent.com/ZapprTV/channels/main/logos/${clean}`;
}

function toMeta(ch) {
  const id = makeId(ch);
  const poster = logoUrl(ch.logo);

  const lcnLabel = ch.sublcn
    ? `${ch.lcn}.${ch.sublcn}`
    : `${ch.lcn}`;

  return {
    id,
    type: "tv",
    name: ch.name,
    poster,
    posterShape: "square",
    background: poster,
    logo: poster,
    description: `LCN ${lcnLabel}${ch.subtitle ? ` - ${ch.subtitle}` : ""}`,
    genres: ["Live TV"],
    releaseInfo: `LCN ${lcnLabel}`,
    behaviorHints: {
      defaultVideoId: id
    },
    _channel: ch
  };
}

function loadChannels() {
  const nationalData = readJson("data/national.json");
  const regionalData = readJson("data/regional/lombardia.json");

  const nationalChannels = flattenChannels(nationalData.channels || []);
  const regionalChannels = flattenChannels(regionalData.channels || []);

  const merged = [...nationalChannels, ...regionalChannels]
    .filter(shouldKeepChannel)
    .filter((ch, index, arr) => {
      const key = `${ch.lcn}|${ch.sublcn || ""}|${(ch.name || "").toLowerCase()}`;
      return arr.findIndex(x =>
        `${x.lcn}|${x.sublcn || ""}|${(x.name || "").toLowerCase()}` === key
      ) === index;
    })
    .sort((a, b) => {
      if (a.lcn !== b.lcn) return a.lcn - b.lcn;
      return (a.sublcn || 0) - (b.sublcn || 0);
    });

  return merged;
}

function getAllMetas() {
  return loadChannels().map(toMeta);
}

function findChannelById(id) {
  return getAllMetas().find(meta => meta.id === id)?._channel || null;
}

builder.defineCatalogHandler(({ type, id }) => {
  if (type !== "tv" || id !== "geremia-tv") {
    return Promise.resolve({ metas: [] });
  }

  const metas = getAllMetas().map(({ _channel, ...meta }) => meta);
  return Promise.resolve({ metas });
});

builder.defineMetaHandler(({ type, id }) => {
  if (type !== "tv") {
    return Promise.resolve({ meta: null });
  }

  const meta = getAllMetas().find(item => item.id === id);
  if (!meta) return Promise.resolve({ meta: null });

  const { _channel, ...cleanMeta } = meta;
  return Promise.resolve({ meta: cleanMeta });
});

builder.defineStreamHandler(({ type, id }) => {
  if (type !== "tv") {
    return Promise.resolve({ streams: [] });
  }

  const channel = findChannelById(id);
  if (!channel) {
    return Promise.resolve({ streams: [] });
  }

  const streamType = normalizeType(channel.type);
  let stream = null;

  if (streamType === "hls") {
    stream = {
      title: channel.name,
      url: channel.url,
      behaviorHints: {
        notWebReady: false
      }
    };
  } else if (streamType === "iframe") {
    stream = {
      title: `${channel.name} (iframe)`,
      externalUrl: channel.url
    };
  } else if (streamType === "youtube") {
    stream = {
      title: `${channel.name} (YouTube)`,
      ytId: channel.url
    };
  } else if (streamType === "twitch") {
    stream = {
      title: `${channel.name} (Twitch)`,
      externalUrl: `https://www.twitch.tv/${channel.url}`
    };
  }

  return Promise.resolve({
    streams: stream ? [stream] : []
  });
});

const port = process.env.PORT || 7000;
serveHTTP(builder.getInterface(), { port });
