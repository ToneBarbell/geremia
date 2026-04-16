const { addonBuilder } = require("stremio-addon-sdk");
const express = require("express");
const app = express();

const builder = new addonBuilder({
    id: "org.geremia.zappr",
    version: "1.0.0",
    name: "Geremia Zappr",
    description: "Powered by ZapprTV - Solo canali che funzionano",
    resources: ["catalog", "stream"],
    types: ["tv"],
    catalogs: [{
        type: "tv",
        id: "zappr_tv",
        name: "Zappr TV Live"
    }]
});

// Catalogatore basato su Zappr
builder.defineCatalogHandler(() => {
    return Promise.resolve({
        metas: [
            { id: "zappr_rai1", type: "tv", name: "Rai 1 (Zappr)", poster: "https://zappr.tv/logos/rai1.png" },
            { id: "zappr_canale5", type: "tv", name: "Canale 5 (Zappr)", poster: "https://zappr.tv/logos/canale5.png" }
        ]
    });
});

// Stream Handler con i link diretti di Zappr
builder.defineStreamHandler((args) => {
    const channels = {
        "zappr_rai1": "https://zappr.tv/live/rai1/index.m3u8",
        "zappr_canale5": "https://zappr.tv/live/canale5/index.m3u8"
    };

    if (channels[args.id]) {
        return Promise.resolve({
            streams: [{ url: channels[args.id], title: "Zappr High Quality" }]
        });
    }
    return Promise.resolve({ streams: [] });
});

const addonInterface = builder.getInterface();

app.get("/manifest.json", (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", "application/json");
    res.send(addonInterface.manifest);
});

app.get("/:resource/:type/:id.json", (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    const { resource, type, id } = req.params;
    addonInterface.get({ resource, type, id: id.replace(".json", "") })
        .then(resp => res.send(resp))
        .catch(() => res.status(500).send("Zappr Error"));
});

module.exports = app;
