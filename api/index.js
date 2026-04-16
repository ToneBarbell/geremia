const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");

const builder = new addonBuilder({
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
});

builder.defineCatalogHandler(() =>
  Promise.resolve({
    metas: [
      { id: "zappr_rai1", type: "tv", name: "Rai 1" },
      { id: "zappr_canale5", type: "tv", name: "Canale 5" },
      { id: "zappr_giallo", type: "tv", name: "Giallo" }
    ]
  })
);

builder.defineStreamHandler((args) => {
  if (
    args.id === "zappr_rai1" ||
    args.id === "zappr_canale5" ||
    args.id === "zappr_giallo"
  ) {
    return Promise.resolve({
      streams: [
        {
          title: "Test Live",
          url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
        }
      ]
    });
  }

  return Promise.resolve({ streams: [] });
});

serveHTTP(builder.getInterface(), { port: 7000 });
