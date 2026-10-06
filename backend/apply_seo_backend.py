#!/usr/bin/env python
"""
SEO backend: sitemap.xml, robots.txt, public read-only API for the public
marketplace/artisan pages, and server-rendered link previews.

Unzip oam-seo-backend.zip in the backend root first, then:
    python3 apply_seo_backend.py

  apps/seo/                 (from the zip) the new app
  config/settings/base.py   + "apps.seo", SEO_SITE_URL, SEO_SHELL_URL
  config/urls.py            + /api/v1/public/…, /sitemap.xml, /robots.txt,
                              /marketplace/<id>, /artisans/<id> (previews)
No migration (the app has no models). Backups: *.bak-seo
"""
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
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
    bak = p.with_name(p.name + ".bak-seo")
    if not bak.exists():
        shutil.copy2(p, bak)
    p.write_text(t, encoding="utf-8")
    changed.append(rel)


if not (ROOT / "manage.py").exists():
    print("Run this from the backend root (the folder containing manage.py).")
    sys.exit(1)
if not (ROOT / "apps/seo/views.py").exists():
    print("apps/seo is missing — unzip oam-seo-backend.zip here first.")
    sys.exit(1)

patch("config/settings/base.py", '"apps.seo"', [
    ('    "apps.deliveries",  # [oam-deliveries] delivery & dispatch\n',
     '    "apps.deliveries",  # [oam-deliveries] delivery & dispatch\n    "apps.seo",  # [oam-seo] sitemap, robots, public pages\n'),
])
patch("config/settings/base.py", "SEO_SITE_URL", [
    ('CLOUDINARY_CLOUD_NAME = env("CLOUDINARY_CLOUD_NAME", default="")',
     '''# [oam-seo] Public web address used in canonical URLs, the sitemap and link previews.
SEO_SITE_URL = env("SEO_SITE_URL", default="https://www.oam-app.com")
# Where to fetch the web app's index.html for server-rendered previews (default: SEO_SITE_URL/index.html).
SEO_SHELL_URL = env("SEO_SHELL_URL", default="")
CLOUDINARY_CLOUD_NAME = env("CLOUDINARY_CLOUD_NAME", default="")'''),
])
patch("config/urls.py", "apps.seo", [
    ('    path("api/v1/deliveries/", include("apps.deliveries.urls")),  # [oam-deliveries]\n',
     '    path("api/v1/deliveries/", include("apps.deliveries.urls")),  # [oam-deliveries]\n'
     '    path("api/v1/public/", include("apps.seo.api_urls")),  # [oam-seo] public pages data\n'),
    ('if settings.DEBUG:\n',
     '# [oam-seo] /sitemap.xml, /robots.txt and server-rendered /marketplace/<id>, /artisans/<id>.\n'
     '# Last, so nothing above can be shadowed.\n'
     'urlpatterns += [path("", include("apps.seo.urls"))]\n\n'
     'if settings.DEBUG:\n'),
])

print("Changed: " + (", ".join(changed) or "nothing"))
if skipped:
    print("Already done: " + ", ".join(skipped))
if problems:
    print("\nNEEDS ATTENTION:\n  - " + "\n  - ".join(problems))
    sys.exit(2)
print("\nNo migration needed. Commit and push; then follow SEO-SETUP.md (Render rewrites).")
