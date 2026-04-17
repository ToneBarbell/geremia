const express = require("express");
const app = express();

function sendJson(res, data) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Content-Type", "application/json");
  res.send(JSON.stringify(data));
}

const manifest = {
  id: "org.zapprtv.geremia",
  version: "1.0.3",
  name: "Zappr Geremia",
  description: "Canali TV nazionali e locali Lombardia",
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

const channels = [
  { id: "zappr_rai1", type: "tv", name: "Rai 1", stream: "https://rai.zappr.stream/rai1.m3u8" },
  { id: "zappr_rai2", type: "tv", name: "Rai 2", stream: "https://rai.zappr.stream/rai2.m3u8" },
  { id: "zappr_rai3", type: "tv", name: "Rai 3", stream: "https://rai.zappr.stream/rai3.m3u8" },
  { id: "zappr_rete4", type: "tv", name: "Rete 4", stream: "https://mediaset.zappr.stream/rete4.m3u8" },
  { id: "zappr_canale5", type: "tv", name: "Canale 5", stream: "https://mediaset.zappr.stream/canale5.m3u8" },
  { id: "zappr_italia1", type: "tv", name: "Italia 1", stream: "https://mediaset.zappr.stream/italia1.m3u8" },
  { id: "zappr_la7", type: "tv", name: "La7", stream: "https://la7.zappr.stream/la7.m3u8" },
  { id: "zappr_tv8", type: "tv", name: "TV8", stream: "https://sky.zappr.stream/tv8.m3u8" },
  { id: "zappr_nove", type: "tv", name: "Nove", stream: "https://discovery.zappr.stream/nove.m3u8" },

  { id: "zappr_rai4", type: "tv", name: "Rai 4", stream: "https://rai.zappr.stream/rai4.m3u8" },
  { id: "zappr_rai5", type: "tv", name: "Rai 5", stream: "https://rai.zappr.stream/rai5.m3u8" },
  { id: "zappr_raimovie", type: "tv", name: "Rai Movie", stream: "https://rai.zappr.stream/raimovie.m3u8" },
  { id: "zappr_raipremium", type: "tv", name: "Rai Premium", stream: "https://rai.zappr.stream/raipremium.m3u8" },
  { id: "zappr_rainews24", type: "tv", name: "Rai News 24", stream: "https://rai.zappr.stream/rainews24.m3u8" },
  { id: "zappr_raisport", type: "tv", name: "Rai Sport", stream: "https://rai.zappr.stream/raisport.m3u8" },
  { id: "zappr_raiyoyo", type: "tv", name: "Rai Yoyo", stream: "https://rai.zappr.stream/raiyoyo.m3u8" },
  { id: "zappr_raigulp", type: "tv", name: "Rai Gulp", stream: "https://rai.zappr.stream/raigulp.m3u8" },

  { id: "zappr_bergamotv", type: "tv", name: "Bergamo TV", stream: "https://lombardia.zappr.stream/bergamotv.m3u8" },
  { id: "zappr_milanopaviatv", type: "tv", name: "Milano Pavia TV", stream: "https://lombardia.zappr.stream/milanopaviatv.m3u8" },
  { id: "zappr_seilatvbergamo", type: "tv", name: "Seilatv Bergamo", stream: "https://lombardia.zappr.stream/seilatvbergamo.m3u8" },
  { id: "zappr_teletutto", type: "tv", name: "Teletutto", stream: "https://lombardia.zappr.stream/teletutto.m3u8" },
  { id: "zappr_telelombardia", type: "tv", name: "Telelombardia", stream: "https://lombardia.zappr.stream/telelombardia.m3u8" },
  { id: "zappr_antenna3", type: "tv", name: "Antenna 3", stream: "https://lombardia.zappr.stream/antenna3.m3u8" },
  { id: "zappr_telenova", type: "tv", name: "Telenova", stream: "https://lombardia.zappr.stream/telenova.m3u8" }
];

app.get("/manifest.json", (req, res) => {
  sendJson(res, manifest);
});

app.get("/catalog/tv/zappr_tv.json", (req, res) => {
  sendJson(res, {
    metas: channels.map((channel) => ({
      id: channel.id,
      type: channel.type,
      name: channel.name,
      posterShape: "square"
    }))
  });
});

app.get("/stream/tv/:id.json", (req, res) => {
  const channel = channels.find((c) => c.id === req.params.id);

  if (!channel) {
    return sendJson(res, { streams: [] });
  }

  sendJson(res, {
    streams: [
      {
        title: channel.name,
        url: channel.stream
      }
    ]
  });
});

module.exports = app;
