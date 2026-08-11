import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Margin Notes",
    short_name: "Margin Notes",
    description: "Read, write, and discover long-form essays.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f5f2",
    theme_color: "#d4522a",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
