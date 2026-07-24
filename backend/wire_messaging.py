"""
Register apps.messaging in INSTALLED_APPS and config/urls.py.

Finds the files by looking for where apps.marketplace is already registered,
so it works regardless of how your settings are split. Verifies both files
still parse before it finishes, and refuses to leave a broken file behind.

RUN FROM THE BACKEND ROOT:
    python3 wire_messaging.py
"""
import ast
import pathlib
import re
import sys

ROOT = pathlib.Path(".")


def _check(path: pathlib.Path, original: str) -> bool:
    """Roll back if our edit broke the file."""
    try:
        ast.parse(path.read_text())
        return True
    except SyntaxError as exc:
        path.write_text(original)
        print(f"  !! edit to {path} would have broken it ({exc}) — rolled back")
        return False


# ---------------------------------------------------------------- settings --
settings_file = None
for candidate in sorted(ROOT.glob("config/settings/*.py")) + sorted(ROOT.glob("config/*.py")):
    text = candidate.read_text()
    if "apps.marketplace" in text and "INSTALLED_APPS" in text:
        settings_file = candidate
        break

if settings_file is None:
    sys.exit("Could not find the file containing INSTALLED_APPS with apps.marketplace.")

text = settings_file.read_text()
if "apps.messaging" in text:
    print(f"  settings: already registered ({settings_file})")
else:
    original = text
    m = re.search(r'^(\s*)["\']apps\.marketplace["\'],', text, re.M)
    if not m:
        sys.exit(f'Found {settings_file} but not the "apps.marketplace" entry.')
    indent = m.group(1)
    text = text[:m.end()] + f'\n{indent}"apps.messaging",' + text[m.end():]
    settings_file.write_text(text)
    if _check(settings_file, original):
        print(f"  settings: added to {settings_file}")

# -------------------------------------------------------------------- urls --
urls_file = ROOT / "config" / "urls.py"
if not urls_file.exists():
    sys.exit("config/urls.py not found.")

text = urls_file.read_text()
if "apps.messaging.urls" in text:
    print("  urls: already registered")
else:
    original = text
    m = re.search(r'^(\s*)path\(\s*["\']api/v1/[^"\']*["\']\s*,\s*include\(\s*["\']apps\.marketplace\.urls["\']\s*\)\s*\),',
                  text, re.M)
    if not m:
        m = re.search(r'^(\s*)path\([^\n]*include\([^\n]*apps\.\w+\.urls[^\n]*\),', text, re.M)
    if not m:
        sys.exit("Could not find an existing api/v1 include to anchor to. Add by hand:\n"
                 '    path("api/v1/messaging/", include("apps.messaging.urls")),')
    indent = m.group(1)
    text = (text[:m.end()]
            + f'\n{indent}path("api/v1/messaging/", include("apps.messaging.urls")),'
            + text[m.end():])
    urls_file.write_text(text)
    if _check(urls_file, original):
        print("  urls: added to config/urls.py")

print("\nNow run:")
print("  python3 manage.py makemigrations messaging")
print("  python3 manage.py migrate")
