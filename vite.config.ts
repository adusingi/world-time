import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Allow access through Cloudflare quick tunnels (random *.trycloudflare.com
  // subdomain each run). The leading dot matches the domain and any subdomain.
  server: {
    allowedHosts: [".trycloudflare.com"],
  },
});
