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
  version: "1.0.5",
  name: "Zappr Geremia",
  description: "Canali TV da Zappr",
  resources: ["catalog", "stream"],
  types: ["tv"],
  catalogs: [
    {
      type: "tv",
      id: "zappr_tv",
      name: "Zappr TV"
    }
  ]
};

const channels = [
  {
    id: "zappr_rai1",
    type: "tv",
    name: "Rai 1",
    stream: "https://rai.zappr.stream/rai1.m3u8"
  },
  {
    id: "zappr_rai2",
    type: "tv",
    name: "Rai 2",
    stream: "https://rai.zappr.stream/rai2.m3u8"
  },
  {
    id: "zappr_rai3",
    type: "tv",
    name: "Rai 3",
    stream: "https://rai.zappr.stream/rai3.m3u8"
  },
  {
    id: "zappr_topcrime",
    type: "tv",
    name: "Top Crime",
    poster: "https://channels.zappr.stream/logos/topcrime.svg",
    background: "https://channels.zappr.stream/logos/topcrime.svg",
    stream: "https://live02-col.msf.cdn.mediaset.net/live/ch-lt/lt-clr.isml/index.m3u8"
  }
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
      poster: channel.poster,
      background: channel.background,
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
