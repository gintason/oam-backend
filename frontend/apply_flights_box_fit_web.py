#!/usr/bin/env python3
"""
Web: the flights From / To boxes stay inside the card.

Long airport names made the "To" box wider than its column so it spilled out of
the card. Both boxes now keep their column width and shorten long names with "...".

Unzip in the web project root (with package.json), then:
    python3 apply_flights_box_fit_web.py
    npm run build
"""
import json, shutil, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA = json.loads('{"edits": {"src/pages/travel/Flights.tsx": [["            </button>\\n          </div>\\n\\n          <div className=\\"grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end\\">\\n            <div>\\n              <label className=\\"mb-1.5 block text-[12.5px] font-semibold text-ink\\">{t(\\"travel.flights.from\\")}</label>\\n              <AirportPicker value={origin} onChange={setOrigin} label={t(\\"travel.flights.from\\")} />\\n            </div>\\n", "            </button>\\n          </div>\\n\\n          <div className=\\"grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-end\\">\\n            <div className=\\"min-w-0\\">\\n              <label className=\\"mb-1.5 block text-[12.5px] font-semibold text-ink\\">{t(\\"travel.flights.from\\")}</label>\\n              <AirportPicker value={origin} onChange={setOrigin} label={t(\\"travel.flights.from\\")} />\\n            </div>\\n"], ["            >\\n              <ArrowRightLeft size={16} strokeWidth={1.75} />\\n            </button>\\n            <div>\\n              <label className=\\"mb-1.5 block text-[12.5px] font-semibold text-ink\\">{t(\\"travel.flights.to\\")}</label>\\n              <AirportPicker value={destination} onChange={setDestination} label={t(\\"travel.flights.to\\")} />\\n            </div>\\n", "            >\\n              <ArrowRightLeft size={16} strokeWidth={1.75} />\\n            </button>\\n            <div className=\\"min-w-0\\">\\n              <label className=\\"mb-1.5 block text-[12.5px] font-semibold text-ink\\">{t(\\"travel.flights.to\\")}</label>\\n              <AirportPicker value={destination} onChange={setDestination} label={t(\\"travel.flights.to\\")} />\\n            </div>\\n"]], "src/components/AirportPicker.tsx": [["  );\\n\\n  return (\\n    <div ref={box} className=\\"relative\\">\\n      <button\\n        type=\\"button\\"\\n        aria-label={label}\\n", "  );\\n\\n  return (\\n    <div ref={box} className=\\"relative w-full min-w-0\\">\\n      <button\\n        type=\\"button\\"\\n        aria-label={label}\\n"], ["        onClick={() => setOpen((v) => !v)}\\n        className=\\"flex h-11 w-full items-center justify-between gap-2 rounded-[10px] border border-hairline bg-paper px-3 text-left text-[14px] text-ink outline-none focus:border-brand-green\\"\\n      >\\n        <span className=\\"truncate\\">{display}</span>\\n        <ChevronDown size={16} className=\\"shrink-0 text-muted\\" />\\n      </button>\\n\\n", "        onClick={() => setOpen((v) => !v)}\\n        className=\\"flex h-11 w-full items-center justify-between gap-2 rounded-[10px] border border-hairline bg-paper px-3 text-left text-[14px] text-ink outline-none focus:border-brand-green\\"\\n      >\\n        <span className=\\"min-w-0 flex-1 truncate\\">{display}</span>\\n        <ChevronDown size={16} className=\\"shrink-0 text-muted\\" />\\n      </button>\\n\\n"]]}, "files": {}, "locales": {}}')
TAG = 'fltfit'
if not (ROOT / 'package.json').exists():
    print("Run this from the web project root (the folder with package.json)."); sys.exit(1)

plan, skipped = {}, []
for rel, pairs in DATA["edits"].items():
    p = ROOT / rel
    if not p.exists():
        print("Missing:", rel, "- nothing changed."); sys.exit(1)
    s = p.read_text(encoding="utf-8")
    if all(new in s for _, new in pairs):
        skipped.append(rel); continue
    for old, new in pairs:
        if s.count(old) != 1:
            print(rel, "doesn't look as expected - nothing changed. Send me that file and I'll adapt the update."); sys.exit(1)
        s = s.replace(old, new)
    plan[p] = s
for p, s in plan.items():
    shutil.copy2(p, p.with_name(p.name + ".bak-" + TAG))
    p.write_text(s, encoding="utf-8"); print("patched:", p.relative_to(ROOT))
for rel in skipped: print("already up to date:", rel)
for rel, text in DATA.get("files", {}).items():
    p = ROOT / rel; p.parent.mkdir(parents=True, exist_ok=True)
    if p.exists() and p.read_text(encoding="utf-8") == text:
        print("up to date:", rel); continue
    p.write_text(text, encoding="utf-8"); print("wrote:", rel)
for base, (dirrel, langs) in DATA.get("locales", {}).items():
    d = ROOT / dirrel; n = 0
    for lang, kv in langs.items():
        p = d / (lang + ".json")
        if not p.exists(): continue
        raw = p.read_text(encoding="utf-8"); obj = json.loads(raw); node = obj
        for part in base.split("."): node = node.setdefault(part, {})
        node.update(kv)
        p.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + ("\n" if raw.endswith("\n") else ""), encoding="utf-8"); n += 1
    print("translations:", base, "in", n, "languages")
print("Done.")
