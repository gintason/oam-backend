"""
Adds per-charge `callback_url` support to the Paystack adapter.

Why: Paystack's LIVE dashboard rejects localhost as a callback URL. But a
callback_url sent with each charge OVERRIDES the dashboard setting, and it may
point at localhost — Paystack only redirects the user's own browser there.

Run from the backend root:   python3 patch_callback.py
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(".").resolve()
SKIP = {"venv", ".venv", "node_modules", ".git", "__pycache__", "staticfiles"}

targets = []
for p in ROOT.rglob("*.py"):
    if any(part in SKIP for part in p.parts):
        continue
    try:
        text = p.read_text()
    except Exception:
        continue
    if "/transaction/initialize" in text:
        targets.append(p)

if not targets:
    sys.exit("Could not find the Paystack adapter (no file calls /transaction/initialize).")

patched = []
for p in targets:
    s = p.read_text()
    if "callback_url" in s:
        print(f"  - {p}: already has callback_url, skipping")
        continue

    # Match the initialize payload dict passed to /transaction/initialize
    pattern = re.compile(
        r'(data\s*=\s*self\.post\(\s*"/transaction/initialize"\s*,\s*json=)\{(.*?)\}\s*\)',
        re.S,
    )
    m = pattern.search(s)
    if not m:
        print(f"  ! {p}: found the endpoint but not the expected payload shape; skipping")
        continue

    body = m.group(2)
    replacement = (
        "payload = {" + body + "}\n"
        "        _cb = _paystack_callback_url()\n"
        "        if _cb:\n"
        "            payload[\"callback_url\"] = _cb\n"
        "        data = self.post(\"/transaction/initialize\", json=payload)"
    )
    s = s[: m.start()] + replacement + s[m.end():]

    # module-level helper + imports
    helper = (
        '\n\ndef _paystack_callback_url():\n'
        '    """Where Paystack should send the user after payment (overrides dashboard)."""\n'
        '    import os\n'
        '    try:\n'
        '        from django.conf import settings\n'
        '        val = getattr(settings, "PAYSTACK_CALLBACK_URL", "")\n'
        '    except Exception:\n'
        '        val = ""\n'
        '    return val or os.environ.get("PAYSTACK_CALLBACK_URL", "")\n'
    )
    # insert helper after the last import line near the top
    lines = s.splitlines(keepends=True)
    last_import = 0
    for i, ln in enumerate(lines[:60]):
        if ln.startswith("import ") or ln.startswith("from "):
            last_import = i
    lines.insert(last_import + 1, helper)
    s = "".join(lines)

    p.write_text(s)
    patched.append(p)
    print(f"  ✓ patched {p}")

if patched:
    print("\nDone. Now add the setting + env var (see instructions).")
else:
    print("\nNothing patched.")
