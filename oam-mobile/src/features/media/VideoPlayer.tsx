/**
 * Plays a video that someone uploaded (marketplace listing, artisan work video).
 *
 * Phones: an HTML5 <video> inside the WebView the app already ships — no new
 * native module, so this goes out with `eas update`. Tap the player's own
 * fullscreen button for full screen. Web: a plain <video> element.
 */
import { createElement, useMemo, useState } from "react";
import { ActivityIndicator, Platform, View, type StyleProp, type ViewStyle } from "react-native";
import { WebView } from "react-native-webview";
import { useTranslation } from "react-i18next";
import { Text } from "@/shared/ui";
import { videoPoster, videoSources } from "./video-urls";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

function html(url: string, poster?: string) {
  const sources = videoSources(url).map((s) => `<source src="${esc(s)}"${s.endsWith(".mp4") ? ' type="video/mp4"' : ""}>`).join("");
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}video{width:100%;height:100%;object-fit:contain;background:#000}
#e{display:none;position:absolute;inset:0;color:#fff;font:14px system-ui;align-items:center;justify-content:center;text-align:center;padding:16px}</style></head>
<body><video controls playsinline preload="metadata"${poster ? ` poster="${esc(poster)}"` : ""}>${sources}</video><div id="e">This video can't be played right now.</div>
<script>var v=document.querySelector('video'),s=v.querySelectorAll('source');s[s.length-1].addEventListener('error',function(){v.style.display='none';document.getElementById('e').style.display='flex';});</script>
</body></html>`;
}

export function VideoPlayer({
  url, poster, height = 220, style,
}: { url: string; poster?: string | null; height?: number; style?: StyleProp<ViewStyle> }) {
  const [loading, setLoading] = useState(true);
  const posterUrl = videoPoster(url, poster);
  const source = useMemo(() => ({ html: html(url, posterUrl), baseUrl: "https://oam-app.com/" }), [url, posterUrl]);
  const box: StyleProp<ViewStyle> = [{ height, borderRadius: 14, overflow: "hidden", backgroundColor: "#000" }, style];

  if (Platform.OS === "web") {
    return (
      <View style={box}>
        {createElement(
          "video",
          { controls: true, playsInline: true, preload: "metadata", poster: posterUrl, style: { width: "100%", height: "100%", objectFit: "contain", background: "#000" }, "data-testid": "video-player" },
          ...videoSources(url).map((s) => createElement("source", { key: s, src: s, type: s.endsWith(".mp4") ? "video/mp4" : undefined })),
        )}
      </View>
    );
  }

  return (
    <View style={box}>
      <WebView
        source={source}
        originWhitelist={["*"]}
        allowsFullscreenVideo
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction
        javaScriptEnabled
        scrollEnabled={false}
        bounces={false}
        setSupportMultipleWindows={false}
        onLoadEnd={() => setLoading(false)}
        style={{ flex: 1, backgroundColor: "#000" }}
      />
      {loading ? (
        <View pointerEvents="none" style={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color="#FFF" />
        </View>
      ) : null}
    </View>
  );
}

/** Small "▶ Video" badge for cards. */
export function VideoBadge() {
  const { t } = useTranslation();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(0,0,0,0.65)", paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 }}>
      <View style={{ width: 0, height: 0, borderTopWidth: 4, borderBottomWidth: 4, borderLeftWidth: 7, borderTopColor: "transparent", borderBottomColor: "transparent", borderLeftColor: "#FFF" }} />
      <Text variant="caption" color="paper" style={{ fontSize: 10 }}>{t("media.video", "Video")}</Text>
    </View>
  );
}
