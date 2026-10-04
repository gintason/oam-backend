/**
 * Live map without a new native module: Leaflet + OpenStreetMap inside the
 * WebView the app already ships (react-native-webview), or an <iframe> on web.
 * That keeps the whole delivery feature deliverable as an over-the-air update.
 *
 * Props are pushed into the page as messages; a moving rider glides because
 * markers are diffed by id. With `onPick`, tapping the map drops a pin.
 */
import { useEffect, useMemo, useRef } from "react";
import { Platform, View, type ViewStyle } from "react-native";
import { WebView } from "react-native-webview";
import { colors } from "@/shared/theme";

export type MapMarker = { id: string; lat: number; lng: number; kind: "pickup" | "dropoff" | "rider" | "me"; label?: string };

const HTML = `<!doctype html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>html,body,#m{margin:0;height:100%;background:#F1F5F2}.leaflet-control-attribution{font-size:9px}</style>
</head><body><div id="m"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
(function(){
  var send=function(m){m.source="oam-map";try{if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify(m));else parent.postMessage(m,"*")}catch(e){}};
  if(!window.L){send({type:"error"});return;}
  var map=L.map("m",{zoomControl:false,attributionControl:true}).setView([6.5244,3.3792],12);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"© OpenStreetMap"}).addTo(map);
  var C={pickup:"#0B7327",dropoff:"#E31012",rider:"#111111",me:"#2563EB"};
  function icon(k){var c=C[k]||"#6B7280";
    if(k==="rider")return L.divIcon({className:"",iconSize:[34,34],iconAnchor:[17,17],html:'<div style="width:34px;height:34px;border-radius:50%;background:'+c+';border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font-size:16px">🛵</div>'});
    if(k==="me")return L.divIcon({className:"",iconSize:[18,18],iconAnchor:[9,9],html:'<div style="width:18px;height:18px;border-radius:50%;background:'+c+';border:3px solid #fff;box-shadow:0 0 0 6px rgba(37,99,235,.2)"></div>'});
    return L.divIcon({className:"",iconSize:[28,28],iconAnchor:[14,28],html:'<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:'+c+';border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35)"></div>'});}
  var markers={},line=null,pickable=false,lastFit="";
  map.on("click",function(e){if(pickable)send({type:"pick",lat:e.latlng.lat,lng:e.latlng.lng})});
  window.__oam=function(s){
    pickable=!!s.pickable;var seen={};
    (s.markers||[]).forEach(function(m){seen[m.id]=1;
      if(markers[m.id]){markers[m.id].setLatLng([m.lat,m.lng]);}
      else{markers[m.id]=L.marker([m.lat,m.lng],{icon:icon(m.kind)}).addTo(map);if(m.label)markers[m.id].bindTooltip(m.label);}});
    Object.keys(markers).forEach(function(id){if(!seen[id]){markers[id].remove();delete markers[id];}});
    if(line){line.remove();line=null;}
    var p=(s.markers||[]).filter(function(m){return m.kind==="pickup"})[0],d=(s.markers||[]).filter(function(m){return m.kind==="dropoff"})[0];
    if(p&&d)line=L.polyline([[p.lat,p.lng],[d.lat,d.lng]],{color:"#111",weight:3,dashArray:"6 8",opacity:.55}).addTo(map);
    if(s.fitKey!==lastFit){lastFit=s.fitKey;var pts=(s.markers||[]).map(function(m){return[m.lat,m.lng]});
      if(pts.length===1)map.setView(pts[0],15);else if(pts.length>1)map.fitBounds(pts,{padding:[36,36],maxZoom:16});}
  };
  window.addEventListener("message",function(e){var d=e.data;if(typeof d==="string"){try{d=JSON.parse(d)}catch(x){return}}if(d&&d.target==="oam-map")window.__oam(d);});
  document.addEventListener("message",function(e){try{var d=JSON.parse(e.data);if(d.target==="oam-map")window.__oam(d)}catch(x){}});
  send({type:"ready"});
})();
</script></body></html>`;

export function MapView({
  markers, onPick, height = 260, fitKey, style,
}: {
  markers: MapMarker[]; onPick?: (lat: number, lng: number) => void; height?: number; fitKey?: string; style?: ViewStyle;
}) {
  const state = useMemo(() => ({
    target: "oam-map", markers: markers.filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng)),
    pickable: Boolean(onPick), fitKey: fitKey ?? markers.map((m) => m.id).join("|"),
  }), [markers, onPick, fitKey]);
  const stateRef = useRef(state);
  stateRef.current = state;
  const pickRef = useRef(onPick);
  pickRef.current = onPick;
  const ready = useRef(false);
  const webRef = useRef<WebView>(null);
  const frameRef = useRef<HTMLIFrameElement | null>(null);

  const push = () => {
    if (!ready.current) return;
    if (Platform.OS === "web") frameRef.current?.contentWindow?.postMessage(stateRef.current, "*");
    else webRef.current?.injectJavaScript(`window.__oam && window.__oam(${JSON.stringify(stateRef.current)}); true;`);
  };
  useEffect(push, [state]);

  const onMessage = (raw: unknown) => {
    const msg = (typeof raw === "string" ? safeParse(raw) : raw) as { source?: string; type?: string; lat?: number; lng?: number } | null;
    if (!msg || msg.source !== "oam-map") return;
    if (msg.type === "ready") { ready.current = true; push(); }
    if (msg.type === "pick" && msg.lat != null && msg.lng != null) pickRef.current?.(msg.lat, msg.lng);
  };

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const h = (e: MessageEvent) => { if (e.source === frameRef.current?.contentWindow) onMessage(e.data); };
    window.addEventListener("message", h);
    return () => window.removeEventListener("message", h);
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const box: ViewStyle = { height, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: colors.hairline, backgroundColor: "#F1F5F2" };
  if (Platform.OS === "web") {
    return (
      <View style={[box, style]}>
        {/* eslint-disable-next-line react/no-unknown-property */}
        <iframe ref={(el) => { frameRef.current = el; }} srcDoc={HTML} title="Map" style={{ border: 0, width: "100%", height: "100%" }} />
      </View>
    );
  }
  return (
    <View style={[box, style]}>
      <WebView
        ref={webRef}
        source={{ html: HTML, baseUrl: "https://oam-app.com/" }}
        originWhitelist={["*"]}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        nestedScrollEnabled
        onMessage={(e) => onMessage(e.nativeEvent.data)}
        style={{ backgroundColor: "transparent" }}
      />
    </View>
  );
}

function safeParse(s: string) { try { return JSON.parse(s); } catch { return null; } }
