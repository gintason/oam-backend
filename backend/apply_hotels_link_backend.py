#!/usr/bin/env python3
"""
Hotels (Klook) link opens in every country.

Klook's redirect page lands on the page named in the link (k_site / u). When the
link doesn't name one, Klook picks a page by the visitor's country and, outside
Nigeria, ends on "null is unreachable". The link now always names a landing page
(KLOOK_LANDING_URL, default https://www.klook.com/en-US/hotels/); your affiliate
id/marker in KLOOK_URL is kept. tpk.ro short links are still never handed out.

Unzip in the backend root (with manage.py), then:
    python3 apply_hotels_link_backend.py
    python manage.py test apps.affiliates --settings=config.settings.test
"""
import json, shutil, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA = json.loads('{"edits": {"integrations/hotels/klook/adapter.py": [["\\"\\"\\"\\nfrom __future__ import annotations\\n\\nfrom integrations.base import register, AffiliateProvider\\nfrom integrations.base.dto import AffiliateLink\\nfrom integrations.base.affiliate_links import sanitize_affiliate_url\\n", "\\"\\"\\"\\nfrom __future__ import annotations\\n\\nfrom urllib.parse import parse_qsl, urlencode, urlparse, urlunparse\\n\\nfrom integrations.base import register, AffiliateProvider\\nfrom integrations.base.dto import AffiliateLink\\nfrom integrations.base.affiliate_links import sanitize_affiliate_url\\n"], ["\\n# deep-link params Klook can receive as query (advisory pass-through)\\nACCEPTED_PARAMS = [\\"destination\\", \\"check_in\\", \\"check_out\\", \\"guests\\", \\"query\\"]\\n\\n\\n@register(\\"hotels\\", \\"klook\\")\\n", "\\n# deep-link params Klook can receive as query (advisory pass-through)\\nACCEPTED_PARAMS = [\\"destination\\", \\"check_in\\", \\"check_out\\", \\"guests\\", \\"query\\"]\\n\\nDEFAULT_LANDING = \\"https://www.klook.com/en-US/hotels/\\"\\n\\n\\ndef with_landing(url: str, landing: str) -> str:\\n    \\"\\"\\"Make sure a Klook/Travelpayouts redirect link names where it should land.\\n\\n    Klook\'s redirect page (affiliate.klook.com/redirect) and Travelpayouts\'\\n    click link (tp.media/r) send the visitor to the URL in `k_site` / `u`.\\n    When that is missing or \\"null\\", Klook picks a page by the visitor\'s country\\n    and, for many countries, ends on \\"null is unreachable\\". Setting it\\n    explicitly makes the link open the same page everywhere.\\n    \\"\\"\\"\\n    parsed = urlparse(url)\\n    host = parsed.netloc.lower()\\n    key = (\\"k_site\\" if host.endswith(\\"affiliate.klook.com\\")\\n           else \\"u\\" if host.endswith(\\"tp.media\\") or host.endswith(\\"travelpayouts.com\\") else \\"\\")\\n    if not key:\\n        return url\\n    query = dict(parse_qsl(parsed.query, keep_blank_values=True))\\n    if str(query.get(key, \\"\\")).strip().lower() in (\\"\\", \\"null\\", \\"undefined\\", \\"none\\"):\\n        query[key] = landing\\n    return urlunparse(parsed._replace(query=urlencode(query)))\\n\\n\\n@register(\\"hotels\\", \\"klook\\")\\n"], ["                             if k in ACCEPTED_PARAMS and v not in (None, \\"\\")})\\n        # Never expose a blocked tpk.ro host to the browser.\\n        url = sanitize_affiliate_url(url, self.category)\\n        final_url = self._append_query(url, tracking)\\n        return AffiliateLink(\\n            program=\\"klook:hotels\\",\\n", "                             if k in ACCEPTED_PARAMS and v not in (None, \\"\\")})\\n        # Never expose a blocked tpk.ro host to the browser.\\n        url = sanitize_affiliate_url(url, self.category)\\n        url = with_landing(url, self.config.get(\\"landing_url\\") or DEFAULT_LANDING)\\n        final_url = self._append_query(url, tracking)\\n        return AffiliateLink(\\n            program=\\"klook:hotels\\",\\n"]], "config/settings/base.py": [["\\n    \\"hotels\\": {\\n        \\n        \\"klook\\": {\\"url\\": env(\\"KLOOK_URL\\", default=\\"\\")},\\n\\n        \\"hotelbeds\\": {\\"api_key\\": env(\\"HOTELBEDS_API_KEY\\", default=\\"\\"),\\n                      \\"secret\\": env(\\"HOTELBEDS_SECRET\\", default=\\"\\"),\\n", "\\n    \\"hotels\\": {\\n        \\n        \\"klook\\": {\\"url\\": env(\\"KLOOK_URL\\", default=\\"\\"),\\n                   # Where the Klook link should land (hotels, in English). Always set\\n                   # explicitly so Klook\'s redirect never ends at \\"null\\" abroad.\\n                   \\"landing_url\\": env(\\"KLOOK_LANDING_URL\\", default=\\"https://www.klook.com/en-US/hotels/\\")},\\n\\n        \\"hotelbeds\\": {\\"api_key\\": env(\\"HOTELBEDS_API_KEY\\", default=\\"\\"),\\n                      \\"secret\\": env(\\"HOTELBEDS_SECRET\\", default=\\"\\"),\\n"]]}, "files": {"apps/affiliates/test_klook_link.py": "from urllib.parse import parse_qs, urlparse\\n\\nfrom django.test import TestCase, override_settings\\n\\nfrom integrations.hotels.klook.adapter import KlookHotels, with_landing\\n\\nLAND = \\"https://www.klook.com/en-US/hotels/\\"\\n\\n\\ndef q(url):\\n    return {k: v[0] for k, v in parse_qs(urlparse(url).query).items()}\\n\\n\\nclass KlookLandingTests(TestCase):\\n    def test_klook_redirect_without_destination_gets_one(self):\\n        url = with_landing(\\"https://affiliate.klook.com/redirect?aid=1234&aff_adid=99\\", LAND)\\n        self.assertEqual(q(url)[\\"k_site\\"], LAND)\\n        self.assertEqual(q(url)[\\"aid\\"], \\"1234\\")                     # attribution kept\\n\\n    def test_null_destination_replaced_but_real_one_kept(self):\\n        self.assertEqual(q(with_landing(\\"https://affiliate.klook.com/redirect?aid=1&k_site=null\\", LAND))[\\"k_site\\"], LAND)\\n        keep = \\"https://www.klook.com/en-US/city/78-dubai-things-to-do/\\"\\n        self.assertEqual(q(with_landing(f\\"https://affiliate.klook.com/redirect?aid=1&k_site={keep}\\", LAND))[\\"k_site\\"], keep)\\n\\n    def test_travelpayouts_click_link_gets_u(self):\\n        url = with_landing(\\"https://tp.media/r?marker=555&p=4110&trs=1\\", LAND)\\n        self.assertEqual((q(url)[\\"u\\"], q(url)[\\"marker\\"]), (LAND, \\"555\\"))\\n\\n    def test_other_links_untouched(self):\\n        self.assertEqual(with_landing(\\"https://www.klook.com/\\", LAND), \\"https://www.klook.com/\\")\\n\\n    def test_adapter_never_hands_out_tpk_ro_and_always_has_a_landing(self):\\n        link = KlookHotels({\\"url\\": \\"https://klook.tpk.ro/5WurYtDG\\"}).build_link(sub_id=\\"u1\\")\\n        self.assertNotIn(\\"tpk.ro\\", link.url)\\n        link = KlookHotels({\\"url\\": \\"https://affiliate.klook.com/redirect?aid=42\\", \\"landing_url\\": LAND}).build_link(sub_id=\\"u1\\")\\n        self.assertEqual((q(link.url)[\\"k_site\\"], q(link.url)[\\"sub_id\\"]), (LAND, \\"u1\\"))\\n\\n\\n@override_settings(SECURE_SSL_REDIRECT=False)\\nclass RedirectEndpointTests(TestCase):\\n    def test_go_klook_redirects_to_link_with_landing(self):\\n        from django.conf import settings\\n        cfg = {**settings.PROVIDER_CONFIG, \\"hotels\\": {\\"klook\\": {\\"url\\": \\"https://affiliate.klook.com/redirect?aid=42\\"}}}\\n        with override_settings(PROVIDER_CONFIG=cfg, DEFAULT_PROVIDERS={**settings.DEFAULT_PROVIDERS, \\"hotels\\": \\"klook\\"}):\\n            r = self.client.get(\\"/api/v1/affiliates/go/klook/\\")\\n        self.assertEqual(r.status_code, 302)\\n        self.assertTrue(r[\\"Location\\"].startswith(\\"https://affiliate.klook.com/redirect?\\"))\\n        self.assertEqual(q(r[\\"Location\\"])[\\"k_site\\"], \\"https://www.klook.com/en-US/hotels/\\")\\n"}, "locales": {}}')
TAG = 'klook'
if not (ROOT / 'manage.py').exists():
    print("Run this from the backend root (the folder with manage.py)."); sys.exit(1)

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
