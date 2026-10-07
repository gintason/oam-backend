/**
 * Feature switches.
 *
 * Bus tickets: OFF until the live provider keys arrive. To switch on, set
 * VITE_BUS_TICKETS_LIVE=true in the static site's environment on Render and
 * redeploy (and BUS_TICKETS_LIVE=true on the backend).
 */
export const BUS_TICKETS_LIVE = import.meta.env.VITE_BUS_TICKETS_LIVE === "true";
