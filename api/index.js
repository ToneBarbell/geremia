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
  version: "1.0.0",
  name: "Zappr Geremia",
  description: "Addon test",
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

app.get("/", (req, res) => {
  sendJson(res, manifest);
});

app.get("/manifest.json", (req, res) => {
  sendJson(res, manifest);
});

app.get("/catalog/tv/zappr_tv.json", (req, res) => {
  sendJson(res, {
    metas: [
      {
        id: "zappr_test",
        type: "tv",
        name: "Canale Test"
      }
    ]
  });
});

app.get("/stream/tv/zappr_test.json", (req, res) => {
  sendJson(res, {
    streams: [
      {
        title: "Test Live",
        url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
      }
    ]
  });
});

module.exports = app;
