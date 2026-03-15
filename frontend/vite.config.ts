import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
	plugins: [react()],
	server: {
		port: 5173,
		host: true,
		hmr: {
			clientPort: 2443,
		},
		watch: {
			usePolling: process.env.CHOKIDAR_USEPOLLING === "true",
		},
		allowedHosts: [
			"frontend",
			...(process.env.NGROK_DOMAIN ? [process.env.NGROK_DOMAIN] : []),
		],
		proxy: {
			"/api": {
				target: "http://localhost:3001",
				changeOrigin: true,
			},
			"/auth": {
				target: "http://localhost:3002",
				changeOrigin: true,
			},
		},
	},
});
