import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
	plugins: [react()],
	server: {
		port: 5173,
		host: true,
		allowedHosts: ['decently-implicational-bebe.ngrok-free.dev'],
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
