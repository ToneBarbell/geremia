const { addonBuilder, getRouter } = require("stremio-addon-sdk");
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());

const manifest = {
  id: "org.zapprtv.geremia",
  version: "1.0.0",
  name: "Zappr Geremia",
  description: "Mini addon test per Stremio",
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

const builder = new addonBuilder(manifest);

builder.defineCatalogHandler(() => {
  return Promise.resolve({
    metas: [
      {
        id: "zappr_rai1",
        type: "tv",
        name: "Rai 1",
        poster: "https://static.vecteezy.com/system/resources/previews/019/766/240/non_2x/rai-logo-rai-icon-transparent-free-png.png"
      }
    ]
  });
});

builder.defineStreamHandler((args) => {
  if (args.id === "zappr_rai1") {
    return Promise.resolve({
      streams: [
        {
          title: "Rai 1",
          url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
        }
      ]
    });
  }

  return Promise.resolve({ streams: [] });
});

const router = getRouter(builder.getInterface());

app.use("/", router);

app.get("/", (req, res) => {
  res.json({
    ok: true,
    manifest: "/manifest.json"
  });
});

module.exports = app;
