"""
Register the assistant app.

RUN FROM THE BACKEND ROOT:
    python3 wire_assistant.py
"""
import ast, pathlib, re, sys

ROOT = pathlib.Path(".")


def safe(path, new, original, label):
    path.write_text(new)
    try:
        ast.parse(new)
        print(f"  {label}: done")
        return True
    except SyntaxError as exc:
        path.write_text(original)
        print(f"  !! {label} would have broken ({exc}) — rolled back")
        return False


settings_file = None
for c in sorted(ROOT.glob("config/settings/*.py")) + sorted(ROOT.glob("config/*.py")):
    t = c.read_text()
    if "apps.marketplace" in t and "INSTALLED_APPS" in t:
        settings_file = c
        break
if settings_file is None:
    sys.exit("Could not find INSTALLED_APPS.")

s = settings_file.read_text()
if "apps.assistant" in s:
    print("  settings: already registered")
else:
    m = re.search(r'^(\s*)["\']apps\.marketplace["\'],', s, re.M)
    safe(settings_file, s[:m.end()] + f'\n{m.group(1)}"apps.assistant",' + s[m.end():],
         s, "settings")

s = settings_file.read_text()
if "ANTHROPIC_API_KEY" not in s:
    uses_env = "env(" in s
    block = '''

# --- Assistant --------------------------------------------------------------
# Optional. With a key, the assistant answers freely using a language model.
# Without one it falls back to answering from the built-in knowledge base, so
# the feature works either way and the button is never broken.
'''
    if uses_env:
        block += ('ANTHROPIC_API_KEY = env("ANTHROPIC_API_KEY", default="")\n'
                  'ASSISTANT_MODEL = env("ASSISTANT_MODEL", default="claude-sonnet-4-6")\n')
    else:
        block += ('ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")\n'
                  'ASSISTANT_MODEL = os.environ.get("ASSISTANT_MODEL", "claude-sonnet-4-6")\n')
        if not re.search(r'^import os$', s, re.M):
            block = "\nimport os\n" + block
    safe(settings_file, s + block, s, "settings: assistant keys")
else:
    print("  settings: assistant keys already present")

urls_file = ROOT / "config" / "urls.py"
s = urls_file.read_text()
if "apps.assistant.urls" in s:
    print("  urls: already registered")
else:
    m = re.search(r'^(\s*)path\([^\n]*include\([^\n]*apps\.marketplace\.urls[^\n]*\),', s, re.M)
    if not m:
        m = re.search(r'^(\s*)path\([^\n]*include\([^\n]*apps\.\w+\.urls[^\n]*\),', s, re.M)
    if not m:
        sys.exit('Add by hand: path("api/v1/assistant/", include("apps.assistant.urls")),')
    safe(urls_file,
         s[:m.end()] + f'\n{m.group(1)}path("api/v1/assistant/", include("apps.assistant.urls")),' + s[m.end():],
         s, "urls")

print("\nNo migration needed — the assistant stores nothing.")
print("Restart the server.")
