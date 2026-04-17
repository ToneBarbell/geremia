const POSTER_BASE = "https://dummyimage.com";
const DEFAULT_BG = "https://images.stremioaddons.net/bg/tv-blue.jpg";

function makePoster(channel) {
  const name = encodeURIComponent(channel.name || "Canale TV");
  return `${POSTER_BASE}/600x900/0f172a/ffffff.png&text=${name}`;
}

function makeBackground(channel) {
  const name = encodeURIComponent(channel.name || "Canale TV");
  return `${POSTER_BASE}/1280x720/111827/e5e7eb.png&text=${name}`;
}

function withArtwork(channel) {
  return {
    ...channel,
    poster: channel.poster || makePoster(channel),
    background: channel.background || makeBackground(channel),
    logo: channel.logoUrl || channel.logo || undefined,
    posterShape: channel.posterShape || "square"
  };
}
