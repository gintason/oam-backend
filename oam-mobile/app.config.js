/**
 * Extends app.json at build time. Everything still lives in app.json; this only
 * keeps the Google Sign-In iOS URL scheme in step with the iOS client ID, so it
 * always matches the one the app signs in with (src/features/auth/social-auth.ts).
 *
 * The scheme is the iOS client ID reversed:
 *   123-abc.apps.googleusercontent.com  →  com.googleusercontent.apps.123-abc
 */
// "OAM iOS Client" in the OAM Platform project (74521252008).
const DEFAULT_IOS_CLIENT_ID = "74521252008-5m06gkr34p4tcoimfrqjp62hq69d37v7.apps.googleusercontent.com";
const GOOGLE_PLUGIN = "@react-native-google-signin/google-signin";

function reversedClientId(clientId) {
  const id = (clientId || "").trim();
  const suffix = ".apps.googleusercontent.com";
  if (!id.endsWith(suffix)) return null;
  return `com.googleusercontent.apps.${id.slice(0, -suffix.length)}`;
}

module.exports = ({ config }) => {
  const scheme = reversedClientId(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || DEFAULT_IOS_CLIENT_ID);
  const plugins = [];
  for (const p of config.plugins || []) {
    const name = Array.isArray(p) ? p[0] : p;
    if (name !== GOOGLE_PLUGIN) plugins.push(p);
    else if (scheme) plugins.push([GOOGLE_PLUGIN, { ...(Array.isArray(p) && p[1] ? p[1] : {}), iosUrlScheme: scheme }]);
  }
  return { ...config, plugins };
};
