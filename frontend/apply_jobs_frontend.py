#!/usr/bin/env python3
"""
Wire the Jobs & Recruitment pages into the OAM web frontend.

Run from the frontend root (the folder with package.json):

    python3 apply_jobs_frontend.py            # apply
    python3 apply_jobs_frontend.py --check    # preview, writes nothing

Safe to run more than once. Each edited file is backed up once as
<file>.bak-jobs.

What it changes
  src/App.tsx             + {jobsRoutes}; JOB- payments go to the jobs return page
  src/pages/Dashboard.tsx + "Jobs" card under Shop & Services
  src/LandingPage.tsx     + Jobs section after Marketplace, + "Jobs" nav link
  src/sections/Services.tsx + "Jobs" card in the home page Services grid
  src/i18n/locales/en.json  + English strings for the above (other languages fall back)
  .env.example            + optional VITE_WS_URL note
"""
from __future__ import annotations

import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CHECK = "--check" in sys.argv
MARK = "oam-jobs"
changed, skipped, problems = [], [], []


def read(rel):
    p = ROOT / rel
    return p.read_text(encoding="utf-8") if p.exists() else None


def write(rel, text):
    changed.append(rel)
    if CHECK:
        return
    p = ROOT / rel
    bak = p.with_name(p.name + ".bak-jobs")
    if p.exists() and not bak.exists():
        shutil.copy2(p, bak)
    p.write_text(text, encoding="utf-8")


def patch_app():
    rel = "src/App.tsx"
    text = read(rel)
    if text is None:
        problems.append(f"{rel}: not found")
        return
    if "jobsRoutes" in text:
        skipped.append(rel)
        return

    # 1) imports after the last import statement
    imports = list(re.finditer(r"^import .*?;\s*$", text, flags=re.M))
    if not imports:
        problems.append(f"{rel}: no import lines found")
        return
    at = imports[-1].end()
    text = (text[:at]
            + f'\n// {MARK}: Jobs & Recruitment\n'
            + 'import { jobsRoutes } from "./routes/jobsRoutes";\n'
            + 'import { JobsPaymentGate } from "./pages/jobs/JobsPaymentReturn";\n'
            + text[at:])

    # 2) routes before the catch-all
    m = re.search(r'^([ \t]*)(\{/\*[^\n]*Fallback[^\n]*\*/\}\s*\n\s*)?<Route path="\*"', text, flags=re.M)
    if not m:
        problems.append(f'{rel}: couldn\'t find the <Route path="*"> fallback')
        return
    indent = m.group(1)
    text = text[:m.start()] + f"{indent}{{/* {MARK} */}}\n{indent}{{jobsRoutes}}\n\n" + text[m.start():]

    # 3) payment return pages: JOB- references go to the jobs page
    for comp in ("PaymentCallback", "FlutterwaveCallback"):
        tag = f"<{comp} />"
        if tag in text:
            text = text.replace(tag, f"<JobsPaymentGate fallback={{<{comp} />}} />", 1)
        else:
            problems.append(f"{rel}: {tag} route not found — jobs payments made on that gateway "
                            f"won't show a confirmation page (they still activate)")
    write(rel, text)


def patch_dashboard():
    rel = "src/pages/Dashboard.tsx"
    text = read(rel)
    if text is None:
        skipped.append(rel + " (not found)")
        return
    if '"/jobs"' in text:
        skipped.append(rel)
        return
    m = re.search(r'import \{([^}]*)\} from "lucide-react";', text)
    if not m:
        problems.append(f"{rel}: lucide-react import not found")
        return
    names = m.group(1)
    if "BriefcaseBusiness" not in names:
        text = text.replace(m.group(0), m.group(0).replace(names, names.rstrip() + ", BriefcaseBusiness "), 1)
    line = re.search(r'^(\s*)\{ to: "/marketplace",[^\n]*\n', text, flags=re.M)
    if not line:
        problems.append(f"{rel}: marketplace service card not found — add a /jobs link yourself")
        return
    indent = line.group(1)
    card = (f'{indent}{{ to: "/jobs", icon: <BriefcaseBusiness size={{20}} strokeWidth={{1.75}} />, '
            f'label: t("dashboard.services.jobs", "Jobs"), tint: "green" }},\n')
    text = text[:line.end()] + card + text[line.end():]
    write(rel, text)


def patch_env_example():
    rel = ".env.example"
    text = read(rel)
    if text is None or "VITE_WS_URL" in text:
        skipped.append(rel)
        return
    write(rel, text.rstrip() + (
        "\n\n# Optional: WebSocket URL for live jobs chat. Leave unset to derive it from\n"
        "# VITE_API_URL (https://api.x.com/api/v1 -> wss://api.x.com/ws/jobs/).\n"
        "# VITE_WS_URL=wss://your-api.onrender.com/ws/jobs/\n"))


def patch_landing():
    rel = "src/LandingPage.tsx"
    text = read(rel)
    if text is None:
        skipped.append(rel + " (not found)")
        return
    if "sections/Jobs" in text:
        skipped.append(rel)
        return
    imp = 'import Marketplace from "./sections/Marketplace";'
    tag = "<Marketplace />"
    nav = '{ key: "marketplace", href: "#marketplace" },'
    for needle in (imp, tag):
        if needle not in text:
            problems.append(f"{rel}: couldn't find {needle} — add <Jobs /> after Marketplace yourself")
            return
    text = text.replace(imp, imp + f'\nimport Jobs from "./sections/Jobs"; // {MARK}', 1)
    m = re.search(r"^([ \t]*)<Marketplace />[ \t]*\n", text, flags=re.M)
    text = text[:m.end()] + f"{m.group(1)}<Jobs />\n" + text[m.end():]
    if nav in text:
        text = text.replace(nav, nav + '\n  { key: "jobs", href: "#jobs" },', 1)
    write(rel, text)


def patch_services_grid():
    rel = "src/sections/Services.tsx"
    text = read(rel)
    if text is None:
        skipped.append(rel + " (not found)")
        return
    if 'key: "jobs"' in text:
        skipped.append(rel)
        return
    m = re.search(r'import \{([^}]*)\} from "lucide-react";', text)
    row = re.search(r'^([ \t]*)\{ Icon: Wrench,[^\n]*\n', text, flags=re.M) or \
        re.search(r'^([ \t]*)\{ Icon: Store,[^\n]*\n', text, flags=re.M)
    if not m or not row:
        problems.append(f"{rel}: services list not found — add a Jobs card yourself")
        return
    if "BriefcaseBusiness" not in m.group(1):
        text = text.replace(m.group(0), m.group(0).replace(m.group(1), m.group(1).rstrip() + ", BriefcaseBusiness "), 1)
        row = re.search(r'^([ \t]*)\{ Icon: Wrench,[^\n]*\n', text, flags=re.M) or \
            re.search(r'^([ \t]*)\{ Icon: Store,[^\n]*\n', text, flags=re.M)
    card = (f'{row.group(1)}{{ Icon: BriefcaseBusiness, key: "jobs", title: "Jobs", '
            f'desc: "Find work or hire talent.", route: "/jobs", tint: "green" }},\n')
    text = text[:row.end()] + card + text[row.end():]
    write(rel, text)


EN_KEYS = {
    ("landing", "nav", "jobs"): "Jobs",
    ("landing", "services", "items", "jobs", "title"): "Jobs",
    ("landing", "services", "items", "jobs", "desc"): "Find work or hire talent.",
    ("dashboard", "services", "jobs"): "Jobs",
    ("landing", "jobs", "eyebrow"): "Jobs & careers",
    ("landing", "jobs", "title"): "Hiring now on OAM",
    ("landing", "jobs", "subtitle"): "Apply in one tap with your OAM CV, or post a job and meet candidates today.",
    ("landing", "jobs", "viewAll"): "View all jobs",
    ("landing", "jobs", "featured"): "From Premium & Pro employers",
    ("landing", "jobs", "latest"): "Latest jobs",
    ("landing", "jobs", "emptyTitle"): "No open jobs yet",
    ("landing", "jobs", "emptyBody"): "Be the first employer to post — your job goes live in minutes.",
    ("landing", "jobs", "postJob"): "Post a job",
    ("landing", "jobs", "hiringTitle"): "Hiring?",
    ("landing", "jobs", "hiringBody"): "Post your first job free and manage applicants on one board.",
}


def patch_en_locale():
    import json
    rel = "src/i18n/locales/en.json"
    raw = read(rel)
    if raw is None:
        skipped.append(rel + " (not found)")
        return
    data = json.loads(raw)
    added = 0
    for path, value in EN_KEYS.items():
        node = data
        for k in path[:-1]:
            if not isinstance(node.get(k), dict):
                node[k] = {}
            node = node[k]
        if path[-1] not in node:
            node[path[-1]] = value
            added += 1
    if not added:
        skipped.append(rel)
        return
    out = json.dumps(data, indent=2, ensure_ascii=False)
    write(rel, out + ("\n" if raw.endswith("\n") else ""))


def main():
    if not (ROOT / "package.json").exists():
        print("Run this from the frontend root (the folder with package.json).")
        sys.exit(1)
    if not (ROOT / "src" / "routes" / "jobsRoutes.tsx").exists():
        print("src/routes/jobsRoutes.tsx is missing — unzip oam-jobs-frontend.zip here first.")
        sys.exit(1)
    for fn in (patch_app, patch_dashboard, patch_landing, patch_services_grid,
               patch_en_locale, patch_env_example):
        fn()
    print(("Would change: " if CHECK else "Changed: ") + (", ".join(changed) or "nothing"))
    if skipped:
        print("Already done / skipped: " + ", ".join(skipped))
    if problems:
        print("\nNEEDS ATTENTION:")
        for p in problems:
            print("  - " + p)
        sys.exit(2)
    print("\nNext: npm run dev   (then open /jobs)")


if __name__ == "__main__":
    main()
