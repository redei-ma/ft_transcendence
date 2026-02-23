
async function refreshToken() {
  const res = await fetch("/api/auth/refresh", {
    method: "POST",
    credentials: "include",
  });

  if (!res.ok) {
    console.warn(" Refresh failed");
    return false;
  }

  console.log(" Token refreshed");
  return true;
}

export function connectAuthenticatedSocket({
  url,
  options = {},
  onAuthenticated,
  onUnauthorized,
}) {
  const socket = io(url, {
    withCredentials: true,
    transports: ["websocket", "polling"],
    ...options,
  });

  socket.on("connect", () => {
    console.log(" Socket connected:", socket.id);
    onAuthenticated?.(socket);
  });

  socket.on("unauthorized", async () => {
    console.warn(" Socket unauthorized");

    const refreshed = await refreshToken();

    if (refreshed) {
      console.log(" Reconnecting socket");
      socket.connect();
    } else {
      console.warn(" Redirecting to login");
      onUnauthorized?.();
    }
  });

  socket.on("disconnect", (reason) => {
    console.log(" Socket disconnected:", reason);
  });

  socket.on("error", (err) => {
    console.error(" Socket error:", err);
  });

  return socket;
}
