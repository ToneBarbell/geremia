const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");

const manifest = {
    id: "org.tvitaly.live",
    version: "1.0.0",
    name: "Ita Live",
    resources: ["catalog", "stream"],
    types: ["tv"],
    catalogs: [{ type: "tv", id: "italy_channels", name: "TV Italiana" }]
};

const builder = new addonBuilder(manifest);

builder.defineCatalogHandler(() => {
    return Promise.resolve({
        metas: [{
            id: "it_rai1",
            type: "tv",
            name: "Rai 1",
            poster: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Rai_1_logo_%282016%29.svg/200px-Rai_1_logo_%282016%29.svg.png"
        }]
    });
});

builder.defineStreamHandler((args) => {
    if (args.id === "it_rai1") {
        return Promise.resolve({
            streams: [{ 
                title: "Diretta HD", 
                url: "https://direttarai1.akamaized.net/hls/live/2017001/rai1/playlist.m3u8" 
            }]
        });
    }
    return Promise.resolve({ streams: [] });
});

const addonInterface = builder.getInterface();
serveHTTP(addonInterface, { port: process.env.PORT || 10000 });
