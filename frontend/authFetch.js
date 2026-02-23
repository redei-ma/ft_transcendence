
export async function fetchWithAuthRetry(url, options = {}) {
  let res = await fetch(url, { ...options, credentials: "include" });

  if (res.status === 401) {
    const refreshed = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
    });

    if (!refreshed.ok) {
      window.location.href = "index.html";
      return null;
    }
    res = await fetch(url, { ...options, credentials: "include" });
  }

  return res;
}
