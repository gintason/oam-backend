#!/usr/bin/env python
"""
Bus Tickets -> "Coming soon" in the mobile app (until the live provider keys arrive).

Unzip oam-bus-coming-soon-mobile.zip in the mobile root first, then:
    python3 apply_bus_coming_soon.py

  src/shared/config/features.ts   (zip) BUS_TICKETS_LIVE switch — false for now
  src/features/bus/ComingSoon.tsx (zip) the "Coming soon" screen
  src/app/(app)/bus.tsx           shows "Coming soon" while switched off
  src/app/(app)/home.tsx          "Soon" badge on the Bus Tickets tile

To switch bus tickets ON later: in src/shared/config/features.ts change false
to true, then `eas update`. Ships with `eas update` — no new build.
Backups: *.bak-bussoon
"""
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
            problems.append(f"{rel}: couldn't find {old.strip()[:80]!r} — send me the file")
            return
        t = t.replace(old, new, 1)
    bak = p.with_name(p.name + ".bak-bussoon")
    if not bak.exists():
        shutil.copy2(p, bak)
    p.write_text(t, encoding="utf-8")
    changed.append(rel)


if not (ROOT / "app.json").exists():
    print("Run this from the mobile root (the folder containing app.json).")
    sys.exit(1)
for f in ("src/shared/config/features.ts", "src/features/bus/ComingSoon.tsx"):
    if not (ROOT / f).exists():
        print(f"{f} is missing — unzip oam-bus-coming-soon-mobile.zip here first.")
        sys.exit(1)

patch(APP + "bus.tsx", "BusComingSoon", [
    ('import { busApi, type Trip, type BusBooking, type PassengerInput } from "@/features/bus";\n',
     'import { busApi, type Trip, type BusBooking, type PassengerInput } from "@/features/bus";\n'
     'import { BusComingSoon } from "@/features/bus/ComingSoon";\n'
     'import { BUS_TICKETS_LIVE } from "@/shared/config/features";\n'),
    ("export default function BusScreen() {\n",
     "// While bus tickets are switched off (live keys pending) the screen shows \"Coming soon\".\n"
     "export default function BusScreen() {\n"
     "  return BUS_TICKETS_LIVE ? <BusTicketsLive /> : <BusComingSoon />;\n"
     "}\n\n"
     "function BusTicketsLive() {\n"),
])

patch(APP + "home.tsx", "BUS_TICKETS_LIVE", [
    ('type Tile = { id: string; lkey: string; label: string; Icon: LucideIcon; tint: Tint };',
     'type Tile = { id: string; lkey: string; label: string; Icon: LucideIcon; tint: Tint; soon?: boolean };'),
    ('{ id: "bus", lkey: "bus", label: "Bus Tickets", Icon: Bus, tint: "green" },',
     '{ id: "bus", lkey: "bus", label: "Bus Tickets", Icon: Bus, tint: "green", soon: !BUS_TICKETS_LIVE },'),
    ('function ServiceTile({ label, Icon, tint, onPress }: Pick<Tile, "label" | "Icon" | "tint"> & { onPress: () => void }) {\n',
     'function ServiceTile({ label, Icon, tint, soon, onPress }: Pick<Tile, "label" | "Icon" | "tint" | "soon"> & { onPress: () => void }) {\n'
     '  const { t } = useTranslation();\n'),
    ('''        {label}
      </Text>
    </SpringPressable>''',
     '''        {label}
      </Text>
      {soon ? (
        <View pointerEvents="none" style={{ position: "absolute", top: 5, right: 5, borderRadius: 999, backgroundColor: colors.brand.red, paddingHorizontal: 6, paddingVertical: 1 }}>
          <Text variant="caption" color="paper" style={{ fontSize: 8.5, lineHeight: 12, textTransform: "uppercase", letterSpacing: 0.4 }}>
            {t("common.soon", "Soon")}
          </Text>
        </View>
      ) : null}
    </SpringPressable>'''),
    ('''                    tint={item.tint}
''', '''                    tint={item.tint}
                    soon={item.soon}
'''),
])
# import the switch in home.tsx
p = ROOT / (APP + "home.tsx")
t = p.read_text(encoding="utf-8")
if "BUS_TICKETS_LIVE" in t and 'from "@/shared/config/features"' not in t:
    first = t.index("\nimport ")
    t = t[: first + 1] + 'import { BUS_TICKETS_LIVE } from "@/shared/config/features";\n' + t[first + 1:]
    p.write_text(t, encoding="utf-8")

print("Changed: " + (", ".join(changed) or "nothing"))
if skipped:
    print("Already done: " + ", ".join(skipped))
if problems:
    print("\nNEEDS ATTENTION:\n  - " + "\n  - ".join(problems))
    sys.exit(2)
print('\nNext: eas update --channel production --message "Bus tickets: coming soon"')
