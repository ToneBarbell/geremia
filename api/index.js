const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");

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
        poster: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Rai_1_-_Logo_2016.svg/512px-Rai_1_-_Logo_2016.svg.png"
      },
      {
        id: "zappr_canale5",
        type: "tv",
        name: "Canale 5",
        poster: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Canale_5_logo_2018.svg/512px-Canale_5_logo_2018.svg.png"
      },
      {
        id: "zappr_giallo",
        type: "tv",
        name: "Giallo",
        poster: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/Giallo_logo_2015.svg/512px-Giallo_logo_2015.svg.png"
      }
    ]
  });
});

builder.defineStreamHandler((args) => {
  const testStream = {
    streams: [
      {
        title: "Test Live",
        url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
      }
    ]
  };

  if (
    args.id === "zappr_rai1" ||
    args.id === "zappr_canale5" ||
    args.id === "zappr_giallo"
  ) {
    return Promise.resolve(testStream);
  }

  return Promise.resolve({ streams: [] });
});

module.exports = serveHTTP(builder.getInterface(), { cacheMaxAge: 0 });
