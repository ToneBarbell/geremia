const { addonBuilder } = require("stremio-addon-sdk");
const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors());

const manifest = {
    id: "org.zapprtv.addon",
    version: "1.0.0",
    name: "Zappr TV",
    description: "Addon Open Source per la TV Italiana",
    resources: ["catalog", "stream"],
    types: ["tv"],
    catalogs: [{
        type: "tv",
        id: "zappr_list",
        name: "Zappr TV"
    }]
};

const builder = new addonBuilder(manifest);

builder.defineCatalogHandler(() => {
    return Promise.resolve({
        metas: [
            { id: "zappr_rai1", type: "tv", name: "Rai 1", poster: "https://zappr.tv/logos/rai1.png" },
            { id: "zappr_canale5", type: "tv", name: "Canale 5", poster: "https://zappr.tv/logos/canale5.png" }
        ]
    });
});

builder.defineStreamHandler((args) => {
    const streams = {
        "zappr_rai1": "https://zappr.tv/live/rai1.m3u8",
        "zappr_canale5": "https://zappr.tv/live/canale5.m3u8"
    };
    if (streams[args.id]) {
        return Promise.resolve({ streams: [{ url: streams[args.id] }] });
    }
    return Promise.resolve({ streams: [] });
});

const addonInterface = builder.getInterface();

app.get("/manifest.json", (req, res) => {
    res.json(addonInterface.manifest);
});

app.get("/:resource/:type/:id.json", (req, res) => {
    const { resource, type, id } = req.params;
    addonInterface.get({ resource, type, id: id.replace(".json", "") })
        .then(resp => res.json(resp));
});

module.exports = app;
