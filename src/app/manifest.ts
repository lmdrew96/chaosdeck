import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ChaosDeck",
    short_name: "ChaosDeck",
    description: "MTG deckbuilder + goldfish-plus playtester",
    start_url: "/",
    display: "standalone",
    background_color: "#201913",
    theme_color: "#201913",
    icons: [
      // TODO(nae): swap for real 192x192/512x512 PNG app icons once brand
      // art exists — this favicon is a placeholder so installability isn't
      // blocked on it.
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
