import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  server: {
    // 使用非特權且常見的 Vite 開發埠，避免部分環境阻擋自訂埠
    port: 5173,
    host: "localhost",
    proxy: {
      "/game": "http://127.0.0.1:8000",
      "/ai": "http://127.0.0.1:8000",
      "/assets": "http://127.0.0.1:8000",
      "/config": "http://127.0.0.1:8000",
      "/health": "http://127.0.0.1:8000",
      "/reset": "http://127.0.0.1:8000",
    },
    watch: {
      // 避免 inotify watcher 數量不足造成 EMFILE，改用 polling
      usePolling: true,
      interval: 500,
    },
  },
});
