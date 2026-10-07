#!/usr/bin/env python3
"""
O.A.M Assistant — jobs/recruitment and delivery/dispatch knowledge, checked
against the code, plus a smarter answer matcher.

Unzip oam-assistant-jobs-delivery-backend.zip in the backend root (the folder
containing manage.py), then:
    python3 apply_assistant_jobs_delivery.py
    python manage.py test apps.assistant

  apps/assistant/knowledge.py              JOBS & RECRUITMENT and DELIVERY & DISPATCH facts
                                           rewritten from the code; 26 jobs/delivery/rider answers
  apps/assistant/service.py                topic-aware matching ("Premium for jobs" no longer gets
                                           the marketplace plans; whole words, not fragments)
  apps/assistant/test_jobs_delivery_kb.py  tests for the above

Works whether or not the earlier assistant-knowledge and bus-coming-soon
updates were installed. If either file has other local changes, NOTHING is
changed and you're told which file (send it to me), or use --force.
Backups: *.bak-kb2. No migrations. Push and Render redeploys.
"""
import hashlib
import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "assistant-kb2"
DST = ROOT / "apps" / "assistant"
FORCE = "--force" in sys.argv


def digest(p):
    return hashlib.sha256(p.read_bytes().replace(b"\r\n", b"\n")).hexdigest()


if not (ROOT / "manage.py").exists() or not SRC.exists() or not DST.exists():
    print("Run this from the backend root (with manage.py) after unzipping the update there.")
    sys.exit(1)

manifest = json.loads((SRC / "manifest.json").read_text())
todo, done, unknown = [], [], []
for name, info in manifest.items():
    h = digest(DST / name)
    if h == info["new"]:
        done.append(name)
    elif h in info["known"] or FORCE:
        todo.append(name)
    else:
        unknown.append(name)
if unknown and not FORCE:
    print("Nothing was changed. These files have changes this update doesn't know about:")
    for n in unknown:
        print("   apps/assistant/" + n)
    print("Send them to me, or re-run with --force (backups are kept).")
    sys.exit(1)

for name in todo:
    bak = DST / (name + ".bak-kb2")
    if not bak.exists():
        shutil.copy2(DST / name, bak)
    shutil.copyfile(SRC / name, DST / name)
shutil.copyfile(SRC / "test_jobs_delivery_kb.py", DST / "test_jobs_delivery_kb.py")
print(f"Updated: {', '.join(todo) or 'nothing'}; already up to date: {', '.join(done) or 'none'}.")
print("Added apps/assistant/test_jobs_delivery_kb.py. Now run: python manage.py test apps.assistant")
