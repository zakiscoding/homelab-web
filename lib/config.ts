/** Server-only homelab API settings (never expose API_KEY to the browser). */
export function homelabConfig() {
  const baseUrl = (
    process.env.HOMELAB_API_URL ?? "http://100.91.113.98"
  ).replace(/\/$/, "");
  const apiKey = process.env.HOMELAB_API_KEY ?? "";
  return { baseUrl, apiKey };
}
