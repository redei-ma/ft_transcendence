import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const BUILD_HASH = Date.now().toString(36);

function buildHashPlugin(): Plugin {
	const payload = JSON.stringify({ hash: BUILD_HASH });
	return {
		name: "build-hash",
		configureServer(server) {
			server.middlewares.use("/build-hash.json", (_req, res) => {
				res.setHeader("Content-Type", "application/json");
				res.setHeader("Cache-Control", "no-store");
				res.end(payload);
			});
		},
		generateBundle() {
			this.emitFile({
				type: "asset",
				fileName: "build-hash.json",
				source: payload,
			});
		},
	};
}

export default defineConfig({
	plugins: [react(), buildHashPlugin()],
	define: {
		__BUILD_HASH__: JSON.stringify(BUILD_HASH),
	},
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
