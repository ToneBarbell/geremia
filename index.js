const { addonBuilder } = require("stremio-addon-sdk");
const express = require("express");
const app = express();

const builder = new addonBuilder({
  id: "org.stremio.geremia",
  version: "1.0.0",
  name: "Geremia TV",
  description: "Canali TV Italiani",
  resources: ["catalog", "stream"],
  types: ["tv"],
  catalogs: [
    {
      type: "tv",
      id: "geremia_catalog",
      name: "Geremia TV"
    }
  ]
});

builder.defineCatalogHandler((args) => {
  return Promise.resolve({
    metas: [
      {
        id: "ch_rai1",
        type: "tv",
        name: "Rai 1",
        poster: "https://upload.wikimedia.org/wikipedia/commons/5/5e/Rai_1_logo_%282016%29.svg",
        description: "Diretta Rai 1"
      }
    ]
  });
});

builder.defineStreamHandler((args) => {
  if (args.id === "ch_rai1") {
    return Promise.resolve({
      streams: [{ url: "https://v7.fancode.com/playlist/rai1/index.m3u8", title: "Rai 1 HD" }]
    });
  }
  return Promise.resolve({ streams: [] });
});

const addonInterface = builder.getInterface();

app.get("/manifest.json", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Content-Type", "application/json");
  res.send(addonInterface.manifest);
});

app.get("/:resource/:type/:id.json", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  addonInterface.get(req.params).then((resp) => {
    res.json(resp);
  });
});

module.exports = app;
