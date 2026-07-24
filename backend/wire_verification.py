"""
Wire the uploads app and artisan verification into the project.

Verifies both edited files still parse and rolls back if not.

RUN FROM THE BACKEND ROOT:
    python3 wire_verification.py
"""
import ast
import pathlib
import re
import sys

ROOT = pathlib.Path(".")


def _safe_write(path: pathlib.Path, new: str, original: str, label: str) -> bool:
    path.write_text(new)
    try:
        ast.parse(new)
        print(f"  {label}: done")
        return True
    except SyntaxError as exc:
        path.write_text(original)
        print(f"  !! {label} would have broken ({exc}) — rolled back")
        return False


# -------------------------------------------------------------- INSTALLED_APPS
settings_file = None
for candidate in sorted(ROOT.glob("config/settings/*.py")) + sorted(ROOT.glob("config/*.py")):
    text = candidate.read_text()
    if "apps.homeservices" in text and "INSTALLED_APPS" in text:
        settings_file = candidate
        break
if settings_file is None:
    sys.exit("Could not find INSTALLED_APPS.")

text = settings_file.read_text()
if "apps.uploads" in text:
    print("  settings: already registered")
else:
    m = re.search(r'^(\s*)["\']apps\.homeservices["\'],', text, re.M)
    if not m:
        sys.exit("Could not find the apps.homeservices entry.")
    new = text[:m.end()] + f'\n{m.group(1)}"apps.uploads",' + text[m.end():]
    _safe_write(settings_file, new, text, f"settings ({settings_file})")

# ------------------------------------------------------------ Cloudinary config
text = settings_file.read_text()
if "CLOUDINARY_CLOUD_NAME" not in text:
    block = '''

# --- Cloudinary (file uploads) ----------------------------------------------
# The browser uploads straight to Cloudinary using a signature generated here,
# so large videos never pass through this server. The SECRET must stay
# server-side: it's what proves an upload was authorised by us.
CLOUDINARY_CLOUD_NAME = env("CLOUDINARY_CLOUD_NAME", default="")
CLOUDINARY_API_KEY = env("CLOUDINARY_API_KEY", default="")
CLOUDINARY_API_SECRET = env("CLOUDINARY_API_SECRET", default="")
'''
    if "env(" not in text:
        block = block.replace('env("CLOUDINARY_CLOUD_NAME", default="")',
                              'os.environ.get("CLOUDINARY_CLOUD_NAME", "")')
        block = block.replace('env("CLOUDINARY_API_KEY", default="")',
                              'os.environ.get("CLOUDINARY_API_KEY", "")')
        block = block.replace('env("CLOUDINARY_API_SECRET", default="")',
                              'os.environ.get("CLOUDINARY_API_SECRET", "")')
        if not re.search(r'^import os$', text, re.M):
            block = "\nimport os\n" + block
    _safe_write(settings_file, text + block, text, "settings: Cloudinary keys")
else:
    print("  settings: Cloudinary keys already present")

# ---------------------------------------------------------------- project urls
urls_file = ROOT / "config" / "urls.py"
text = urls_file.read_text()
if "apps.uploads.urls" in text:
    print("  urls: already registered")
else:
    m = re.search(r'^(\s*)path\([^\n]*include\(\s*["\']apps\.homeservices\.urls["\']\s*\)\s*\),',
                  text, re.M)
    if not m:
        m = re.search(r'^(\s*)path\([^\n]*include\([^\n]*apps\.\w+\.urls[^\n]*\),', text, re.M)
    if not m:
        sys.exit('Add by hand: path("api/v1/uploads/", include("apps.uploads.urls")),')
    new = (text[:m.end()]
           + f'\n{m.group(1)}path("api/v1/uploads/", include("apps.uploads.urls")),'
           + text[m.end():])
    _safe_write(urls_file, new, text, "urls")

# ------------------------------------------------- homeservices models + routes
models_file = ROOT / "apps" / "homeservices" / "models.py"
text = models_file.read_text()
if "from .verification import" in text:
    print("  homeservices/models.py: already imports verification")
else:
    # At the END: verification.py imports ArtisanProfile from here, so the
    # models must be defined before it loads.
    new = text.rstrip() + (
        "\n\n# Registered last: verification.py imports ArtisanProfile from this module,\n"
        "# so the models above must exist before it is loaded.\n"
        "from .verification import (  # noqa: E402,F401\n"
        "    ArtisanServiceImage,\n"
        "    ArtisanVerification,\n"
        ")\n"
    )
    _safe_write(models_file, new, text, "homeservices/models.py")

hs_urls = ROOT / "apps" / "homeservices" / "urls.py"
text = hs_urls.read_text()
if "MyVerificationView" in text:
    print("  homeservices/urls.py: already wired")
else:
    imp = (
        "from .verification_views import (\n"
        "    AttachDocumentView,\n"
        "    MyVerificationView,\n"
        "    RemoveServiceImageView,\n"
        "    ReviewDecisionView,\n"
        "    ReviewDetailView,\n"
        "    ReviewQueueView,\n"
        "    SubmitVerificationView,\n"
        ")\n"
    )
    m = re.search(r'^urlpatterns\s*=', text, re.M)
    new = text[:m.start()] + imp + "\n" + text[m.start():]

    # Literal paths BEFORE "artisans/<uuid:artisan_id>/", or the converter
    # swallows the word "verification" and you get a 404 that looks like a bug.
    detail = re.search(r'^([ \t]*)path\(\s*"artisans/<uuid:artisan_id>/"', new, re.M)
    if not detail:
        sys.exit("Could not find the artisan detail route to anchor to.")
    ind = detail.group(1)
    routes = (
        f'{ind}path("artisans/verification/", MyVerificationView.as_view(), name="hs-verification"),\n'
        f'{ind}path("artisans/verification/attach/", AttachDocumentView.as_view(), name="hs-verif-attach"),\n'
        f'{ind}path("artisans/verification/submit/", SubmitVerificationView.as_view(), name="hs-verif-submit"),\n'
        f'{ind}path("artisans/verification/images/<uuid:image_id>/", RemoveServiceImageView.as_view(), name="hs-verif-image"),\n'
        f'{ind}path("artisans/verification/queue/", ReviewQueueView.as_view(), name="hs-verif-queue"),\n'
        f'{ind}path("artisans/verification/queue/<uuid:verification_id>/", ReviewDetailView.as_view(), name="hs-verif-detail"),\n'
        f'{ind}path("artisans/verification/queue/<uuid:verification_id>/<str:decision>/", ReviewDecisionView.as_view(), name="hs-verif-decision"),\n'
    )
    new = new[:detail.start()] + routes + new[detail.start():]
    _safe_write(hs_urls, new, text, "homeservices/urls.py")

print("\nNow run:")
print("  python3 manage.py makemigrations homeservices")
print("  python3 manage.py migrate")
