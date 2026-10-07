#!/usr/bin/env python
"""
Bus Tickets -> "Coming soon" on the web (until the live provider keys arrive).

Unzip oam-bus-coming-soon-web.zip in the frontend root first, then:
    python3 apply_bus_coming_soon.py

  src/config/features.ts                 (zip) BUS_TICKETS_LIVE switch — off unless
                                         VITE_BUS_TICKETS_LIVE=true at build time
  src/pages/services/BusComingSoon.tsx   (zip) the "Coming soon" page
  src/App.tsx                 /travel/bus shows "Coming soon" while switched off
  src/pages/Dashboard.tsx     "Soon" badge on the Bus Tickets tile
  src/sections/Services.tsx   "Soon" badge on the home-page Bus Tickets card
  src/pages/public/landings.ts  (if the SEO update is installed) travel FAQ wording

To switch bus tickets ON later: Render -> static site -> Environment ->
VITE_BUS_TICKETS_LIVE = true, then redeploy. No code change needed.
Backups: *.bak-bussoon
"""
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
changed, skipped, problems = [], [], []


def patch(rel, marker, reps, optional=False):
    p = ROOT / rel
    if not p.exists():
        (skipped if optional else problems).append(f"{rel}: not found")
        return
    t = p.read_text(encoding="utf-8")
    if marker in t:
        skipped.append(rel)
        return
    for options in reps:
        options = options if isinstance(options, list) else [options]
        for old, new in options:              # first variant that matches wins
            if old in t:
                t = t.replace(old, new, 1)
                break
        else:
            problems.append(f"{rel}: couldn't find {options[0][0].strip()[:80]!r} — send me the file")
            return
    bak = p.with_name(p.name + ".bak-bussoon")
    if not bak.exists():
        shutil.copy2(p, bak)
    p.write_text(t, encoding="utf-8")
    changed.append(rel)


if not (ROOT / "package.json").exists() or not (ROOT / "src/App.tsx").exists():
    print("Run this from the frontend root (the folder containing package.json and src/App.tsx).")
    sys.exit(1)
for f in ("src/config/features.ts", "src/pages/services/BusComingSoon.tsx"):
    if not (ROOT / f).exists():
        print(f"{f} is missing — unzip oam-bus-coming-soon-web.zip here first.")
        sys.exit(1)

IMPORTS = ('import BusTickets from "./pages/services/BusTickets";\n',
           'import BusTickets from "./pages/services/BusTickets";\n'
           'import BusComingSoon from "./pages/services/BusComingSoon";\n'
           'import { BUS_TICKETS_LIVE } from "./config/features";\n')
patch("src/App.tsx", "BusComingSoon", [
    IMPORTS,
    [
        # with the SEO update installed
        ('<Route path="/travel/bus" element={<PublicOrApp app={<BusTickets />} pub={<ServiceLanding />} />} />',
         '<Route path="/travel/bus" element={BUS_TICKETS_LIVE ? <PublicOrApp app={<BusTickets />} pub={<ServiceLanding />} /> : <BusComingSoon />} />'),
        # without it
        ('<Route path="/travel/bus" element={<RequireAuth><BusTickets /></RequireAuth>} />',
         '<Route path="/travel/bus" element={BUS_TICKETS_LIVE ? <RequireAuth><BusTickets /></RequireAuth> : <BusComingSoon />} />'),
    ],
])

patch("src/pages/Dashboard.tsx", "BUS_TICKETS_LIVE", [
    ('import { useTranslation } from "react-i18next";\n',
     'import { useTranslation } from "react-i18next";\nimport { BUS_TICKETS_LIVE } from "../config/features";\n'),
    ('label: t("dashboard.services.bus", "Bus Tickets"), tint: "green" },',
     'label: t("dashboard.services.bus", "Bus Tickets"), tint: "green", soon: !BUS_TICKETS_LIVE },'),
    ('function ServiceCard({ to, icon, label, tint }: ServiceItem) {\n  return (\n    <Link\n      to={to}\n      className="flex flex-col',
     'function ServiceCard({ to, icon, label, tint, soon }: ServiceItem) {\n  const { t } = useTranslation();\n  return (\n    <Link\n      to={to}\n      className="relative flex flex-col'),
    ('      <span className="text-[11.5px] font-medium text-ink">{label}</span>\n    </Link>',
     '      <span className="text-[11.5px] font-medium text-ink">{label}</span>\n'
     '      {soon ? (\n'
     '        <span className="absolute right-1.5 top-1.5 rounded-full bg-brand-red px-1.5 py-[1px] text-[9px] font-semibold uppercase tracking-wide text-white">\n'
     '          {t("common.soon", "Soon")}\n'
     '        </span>\n'
     '      ) : null}\n'
     '    </Link>'),
])
# ServiceItem type gains `soon?`
p = ROOT / "src/pages/Dashboard.tsx"
if p.exists():
    t = p.read_text(encoding="utf-8")
    if "soon?: boolean" not in t:
        import re
        m = re.search(r"type ServiceItem = \{([^}]*)\}", t)
        if m:
            t = t.replace(m.group(0), "type ServiceItem = {" + m.group(1).rstrip().rstrip(";") + "; soon?: boolean }", 1)
            p.write_text(t, encoding="utf-8")
        elif "src/pages/Dashboard.tsx" in changed:
            problems.append("src/pages/Dashboard.tsx: couldn't find `type ServiceItem` — send me the file")

patch("src/sections/Services.tsx", "BUS_TICKETS_LIVE", [
    ('import { useTranslation } from "react-i18next";\n',
     'import { useTranslation } from "react-i18next";\nimport { BUS_TICKETS_LIVE } from "../config/features";\n'),
    ('''              <h3 className="text-[15px] font-medium text-ink">{title}</h3>''',
     '''              <h3 className="flex flex-wrap items-center gap-2 text-[15px] font-medium text-ink">
                {title}
                {s.key === "bus" && !BUS_TICKETS_LIVE ? (
                  <span className="rounded-full bg-brand-red px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                    {t("common.comingSoon", "Coming soon")}
                  </span>
                ) : null}
              </h3>'''),
])

patch("src/pages/public/landings.ts", "BUS_TICKETS_LIVE", [
    ('export type Landing = {', 'import { BUS_TICKETS_LIVE } from "../../config/features";\n\nexport type Landing = {'),
    ('''      { q: "Can I book bus tickets in the app?", a: "Yes — search routes and dates, pick your seats, enter passenger details and pay from your wallet or by card." },''',
     '''      { q: "Can I book bus tickets in the app?", a: BUS_TICKETS_LIVE
          ? "Yes — search routes and dates, pick your seats, enter passenger details and pay from your wallet or by card."
          : "Intercity bus booking is coming soon. Flights, hotels and car hire are available now." },'''),
], optional=True)

print("Changed: " + (", ".join(changed) or "nothing"))
if skipped:
    print("Already done / not present: " + ", ".join(skipped))
if problems:
    print("\nNEEDS ATTENTION:\n  - " + "\n  - ".join(problems))
    sys.exit(2)
print("\nCommit and push; the site redeploys with Bus Tickets marked \"Coming soon\".")
