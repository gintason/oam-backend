/**
 * Feature switches.
 *
 * Bus tickets: OFF until the live provider keys arrive. To switch on, change
 * `false` to `true` below (or set EXPO_PUBLIC_BUS_TICKETS_LIVE=true when
 * building), then ship with `eas update`. Also set BUS_TICKETS_LIVE=true on the backend.
 */
export const BUS_TICKETS_LIVE = process.env.EXPO_PUBLIC_BUS_TICKETS_LIVE === "true" || false;
