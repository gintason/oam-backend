/**
 * Runtime config. `EXPO_PUBLIC_*` vars are inlined at build time by Expo.
 * For local dev, create a `.env` at the project root with:
 *   EXPO_PUBLIC_API_URL=http://<your-LAN-ip>:8080/api/v1
 * (a phone/simulator can't reach "localhost" of your Mac — use the LAN IP).
 * With nothing set, it points at production.
 */
export const env = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? "https://api.oam-app.com/api/v1",
} as const;
