#!/usr/bin/env python
"""
Marketplace + artisan videos and zoomable photos (mobile).

Unzip oam-mobile-media.zip in the mobile root first, then:
    python3 apply_media_mobile.py

New files (from the zip)
  src/features/media/*                     video player + full-screen zoomable photo viewer
  src/features/artisans/api/work-videos-api.ts
  src/app/(app)/artisan-videos.tsx         artisans upload/manage "videos of my work"

Patched (backups: *.bak-media)
  listing.tsx         tap a photo -> full screen, pinch/double-tap zoom, swipe;
                      the listing's video now plays (it was saved but never shown)
  post-listing.tsx    preview the uploaded video before posting; 2-minute limit
  marketplace.tsx, market-browse.tsx   "Video" badge on cards that have one
  artisan.tsx         public profile shows the artisan's work videos
  artisans.tsx        "Videos of my work" card for artisans
  artisan-verify.tsx  the verification work video is also added to the profile
  (app)/_layout.tsx   registers the new screen
  entity types + en.json

No new native modules: ships with `eas update`.
"""
import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
APP = "src/app/(app)/"
changed, skipped, problems = [], [], []


def patch(rel, marker, reps):
    p = ROOT / rel
    if not p.exists():
        problems.append(f"{rel}: not found")
        return
    t = p.read_text(encoding="utf-8")
    if marker in t:
        skipped.append(rel)
        return
    for old, new in reps:
        if old not in t:
            problems.append(f"{rel}: couldn't find {old.strip()[:70]!r} — send me the file")
            return
        t = t.replace(old, new, 1)
    bak = p.with_name(p.name + ".bak-media")
    if not bak.exists():
        shutil.copy2(p, bak)
    p.write_text(t, encoding="utf-8")
    changed.append(rel)


if not (ROOT / "app.json").exists():
    print("Run this from the mobile root (the folder containing app.json).")
    sys.exit(1)
for f in ("src/features/media/index.ts", "src/features/artisans/api/work-videos-api.ts", APP + "artisan-videos.tsx"):
    if not (ROOT / f).exists():
        print(f"{f} is missing — unzip oam-mobile-media.zip here first.")
        sys.exit(1)

# --- types -----------------------------------------------------------------
patch("src/entities/marketplace/types.ts", "has_video", [
    ("  views_count?: number; likes_count?: number; comments_count?: number; liked?: boolean;\n};",
     "  views_count?: number; likes_count?: number; comments_count?: number; liked?: boolean;\n  has_video?: boolean;\n};"),
])
patch("src/entities/homeservices/types.ts", "work_videos", [
    ("  years_experience: number; is_available: boolean; views_count: number; created_at: string;\n};",
     "  years_experience: number; is_available: boolean; views_count: number; created_at: string;\n"
     "  work_videos?: { id: string; url: string; caption: string }[];\n};"),
])

# --- listing detail: zoomable photos + video ---------------------------------
patch(APP + "listing.tsx", "ImageViewer", [
    ('import { catLabel } from "@/shared/i18n/labels";',
     'import { catLabel } from "@/shared/i18n/labels";\nimport { ImageViewer, VideoPlayer } from "@/features/media";'),
    ('import { ArrowLeft, Tag, MapPin, Eye, Lock, Send, CheckCircle2, Star, Heart, MessageCircle, Share2 } from "lucide-react-native";',
     'import { ArrowLeft, Tag, MapPin, Eye, Lock, Send, CheckCircle2, Star, Heart, MessageCircle, Share2, Maximize2 } from "lucide-react-native";'),
    ("  const [active, setActive] = useState(0);\n",
     "  const [active, setActive] = useState(0);\n  const [viewer, setViewer] = useState<number | null>(null);\n"),
    ('''                {images.length > 0 ? images.map((img) => (
                  <Image key={img.id} source={{ uri: img.url }} style={{ width: imgW, height: imgW * 0.75 }} resizeMode="cover" />
                )) : <View style={{ width: imgW, height: imgW * 0.75 }} />}''',
     '''                {images.length > 0 ? images.map((img, i) => (
                  <Pressable key={img.id} onPress={() => setViewer(i)} accessibilityLabel={t("media.openPhoto", "Open photo")}>
                    <Image source={{ uri: img.url }} style={{ width: imgW, height: imgW * 0.75 }} resizeMode="cover" />
                  </Pressable>
                )) : <View style={{ width: imgW, height: imgW * 0.75 }} />}'''),
    ('''              {images.length > 1 ? (
                <View style={{ position: "absolute", bottom: 10, alignSelf: "center", flexDirection: "row", gap: 5 }}>''',
     '''              {images.length > 0 ? (
                <Pressable onPress={() => setViewer(active)} hitSlop={6}
                  style={{ position: "absolute", top: 10, right: 10, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(0,0,0,0.55)", paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 }}>
                  <Maximize2 size={12} color="#FFF" /><Text variant="caption" color="paper" style={{ fontSize: 11 }}>{t("media.tapToZoom", "Tap to zoom")}</Text>
                </Pressable>
              ) : null}
              {images.length > 1 ? (
                <View style={{ position: "absolute", bottom: 10, alignSelf: "center", flexDirection: "row", gap: 5 }}>'''),
    ('''            {/* Info */}
            <View style={{ marginTop: 16 }}>''',
     '''            <ImageViewer images={images.map((img) => img.url)} index={viewer} onClose={() => setViewer(null)} />

            {/* Video(s) */}
            {(l.videos ?? []).length > 0 ? (
              <View style={{ marginTop: 14, gap: 10 }}>
                {(l.videos ?? []).map((v) => (
                  <VideoPlayer key={v.id} url={v.url} poster={v.thumbnail_url} height={Math.round(imgW * 0.5625)} />
                ))}
              </View>
            ) : null}

            {/* Info */}
            <View style={{ marginTop: 16 }}>'''),
])

# --- post listing: preview the clip ------------------------------------------
patch(APP + "post-listing.tsx", "VideoPlayer", [
    ('import { catLabel } from "@/shared/i18n/labels";',
     'import { catLabel } from "@/shared/i18n/labels";\nimport { VideoPlayer } from "@/features/media";'),
    ('mediaTypes: ["videos"], quality: 1, videoMaxDuration: 60 });',
     'mediaTypes: ["videos"], quality: 1, videoMaxDuration: 120 });'),
    ('''          {(form.videos ?? []).length > 0 ? (
            <View style={{ marginBottom: 16, borderRadius: 12,''',
     '''          {(form.videos ?? []).length > 0 ? (
            <View style={{ marginBottom: 16 }}>
            <VideoPlayer url={(form.videos ?? [])[0]} height={190} style={{ marginBottom: 8 }} />
            <View style={{ borderRadius: 12,'''),
    ('''                <X size={14} color={colors.muted} />
              </Pressable>
            </View>
          ) : (''',
     '''                <X size={14} color={colors.muted} />
              </Pressable>
            </View>
            </View>
          ) : ('''),
])

# --- cards: video badge -------------------------------------------------------
patch(APP + "marketplace.tsx", "VideoBadge", [
    ('import { Screen, Text } from "@/shared/ui";',
     'import { Screen, Text } from "@/shared/ui";\nimport { VideoBadge } from "@/features/media";'),
    ('''                {l.primary_image ? <Image source={{ uri: l.primary_image }} style={{ width: "100%", height: "100%" }} resizeMode="cover" /> : null}
              </View>''',
     '''                {l.primary_image ? <Image source={{ uri: l.primary_image }} style={{ width: "100%", height: "100%" }} resizeMode="cover" /> : null}
                {l.has_video ? <View style={{ position: "absolute", bottom: 6, right: 6 }}><VideoBadge /></View> : null}
              </View>'''),
])
patch(APP + "market-browse.tsx", "VideoBadge", [
    ('import { Screen, Text, Input, Button } from "@/shared/ui";',
     'import { Screen, Text, Input, Button } from "@/shared/ui";\nimport { VideoBadge } from "@/features/media";'),
    ('''                  {l.primary_image ? <Image source={{ uri: l.primary_image }} style={{ width: "100%", height: "100%" }} resizeMode="cover" /> : null}
''',
     '''                  {l.primary_image ? <Image source={{ uri: l.primary_image }} style={{ width: "100%", height: "100%" }} resizeMode="cover" /> : null}
                  {l.has_video ? <View style={{ position: "absolute", bottom: 8, right: 8 }}><VideoBadge /></View> : null}
'''),
])

# --- artisan public profile: work videos ---------------------------------------
patch(APP + "artisan.tsx", "work_videos", [
    ('import { tradeLabelByName } from "@/shared/i18n/labels";',
     'import { tradeLabelByName } from "@/shared/i18n/labels";\nimport { VideoPlayer } from "@/features/media";'),
    ('''            {/* Enquiry */}''',
     '''            {/* Videos of previous work */}
            {(a.work_videos ?? []).length > 0 ? (
              <View style={{ marginTop: 16, borderRadius: 18, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, padding: 16 }}>
                <Text variant="title">{t("artisans.profile.workVideos", "Videos of previous work")} ({(a.work_videos ?? []).length})</Text>
                <View style={{ gap: 12, marginTop: 12 }}>
                  {(a.work_videos ?? []).map((v) => (
                    <View key={v.id}>
                      <VideoPlayer url={v.url} height={200} />
                      {v.caption ? <Text variant="caption" color="muted" style={{ marginTop: 6 }}>{v.caption}</Text> : null}
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Enquiry */}'''),
])

# --- artisan hub: manage videos ------------------------------------------------
patch(APP + "artisans.tsx", "/artisan-videos", [
    ('import { ArrowLeft, Wrench, Search, ChevronRight, BadgeCheck, ShieldCheck, Rocket } from "lucide-react-native";',
     'import { ArrowLeft, Wrench, Search, ChevronRight, BadgeCheck, ShieldCheck, Rocket, Film } from "lucide-react-native";'),
    ('''        {isArtisan ? (
          <Pressable onPress={() => router.push("/boost")}''',
     '''        {isArtisan ? (
          <Pressable onPress={() => router.push("/artisan-videos")} style={{ marginTop: 12, borderRadius: 18, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, padding: 18, flexDirection: "row", alignItems: "center", gap: 14 }}>
            <View style={{ height: 46, width: 46, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(227,16,18,0.10)" }}>
              <Film size={22} strokeWidth={1.75} color={colors.brand.red} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="title">{t("artisans.videos.title", "Videos of my work")}</Text>
              <Text variant="caption" color="muted" style={{ marginTop: 2 }}>{t("artisans.videos.hubDesc", "Upload videos customers can watch on your profile.")}</Text>
            </View>
            <ChevronRight size={20} color={colors.muted} />
          </Pressable>
        ) : null}

        {isArtisan ? (
          <Pressable onPress={() => router.push("/boost")}'''),
])

# --- verification video also goes on the profile -------------------------------
patch(APP + "artisan-verify.tsx", "workVideosApi", [
    ('import { verificationApi } from "@/features/artisans/api/verification-api";',
     'import { verificationApi } from "@/features/artisans/api/verification-api";\n'
     'import { workVideosApi } from "@/features/artisans/api/work-videos-api";'),
    ('''      await attach.mutateAsync({ purpose: "artisan_work_video", public_id: up.public_id, url: up.url });
''',
     '''      await attach.mutateAsync({ purpose: "artisan_work_video", public_id: up.public_id, url: up.url });
      // Also show it on the public profile (best effort — verification already succeeded).
      workVideosApi.add({ video_url: up.url, public_id: up.public_id })
        .then(() => qc.invalidateQueries({ queryKey: ["artisans", "work-videos"] }))
        .catch(() => undefined);
'''),
])

# --- layout -----------------------------------------------------------------------
patch(APP + "_layout.tsx", 'name="artisan-videos"', [
    ('      <Tabs.Screen name="artisan-verify" options={{ href: null, tabBarStyle: { display: "none" } }} />',
     '      <Tabs.Screen name="artisan-verify" options={{ href: null, tabBarStyle: { display: "none" } }} />\n'
     '      <Tabs.Screen name="artisan-videos" options={{ href: null, tabBarStyle: { display: "none" } }} />'),
])

# --- strings ------------------------------------------------------------------------
STRINGS = {
    "media": {
        "video": "Video", "close": "Close", "openPhoto": "Open photo",
        "tapToZoom": "Tap to zoom", "zoomHint": "Pinch or double-tap to zoom",
    },
    "artisans": {
        "profile": {"workVideos": "Videos of previous work"},
        "videos": {
            "title": "Videos of my work",
            "subtitle": "Show customers what you can do. Videos appear on your public profile for everyone to watch.",
            "hubDesc": "Upload videos customers can watch on your profile.",
            "captionLabel": "Caption (optional)",
            "captionPlaceholder": "e.g. Kitchen tiling in Lekki",
            "add": "Upload a video",
            "uploading": "Uploading… keep the app open",
            "full": "Maximum {{n}} videos",
            "hint": "10 seconds to 3 minutes. MP4 or MOV, up to 100 MB.",
            "tooShort": "Please pick a video of at least 10 seconds.",
            "viewProfile": "See my public profile",
            "yours": "Your videos",
            "empty": "No videos yet.",
            "delete": "Delete video",
            "errDelete": "Couldn't delete the video.",
            "status": {"approved": "Live on your profile", "pending": "Waiting for review", "rejected": "Not approved"},
        },
    },
}


def merge(dst, src):
    added = 0
    for k, v in src.items():
        if isinstance(v, dict):
            if not isinstance(dst.get(k), dict):
                dst[k] = {}
            added += merge(dst[k], v)
        elif k not in dst:
            dst[k] = v
            added += 1
    return added


loc = ROOT / "src/shared/i18n/locales/en.json"
if loc.exists():
    raw = loc.read_text(encoding="utf-8")
    data = json.loads(raw)
    if merge(data, STRINGS):
        bak = loc.with_name(loc.name + ".bak-media")
        if not bak.exists():
            shutil.copy2(loc, bak)
        loc.write_text(json.dumps(data, ensure_ascii=False, indent=2) + ("\n" if raw.endswith("\n") else ""), encoding="utf-8")
        changed.append("src/shared/i18n/locales/en.json")
    else:
        skipped.append("en.json")
else:
    problems.append("src/shared/i18n/locales/en.json: not found")

print("Changed: " + (", ".join(changed) or "nothing"))
if skipped:
    print("Already done: " + ", ".join(skipped))
if problems:
    print("\nNEEDS ATTENTION:\n  - " + "\n  - ".join(problems))
    sys.exit(2)
print('\nNext: eas update --channel production --message "Videos + zoomable photos"')
