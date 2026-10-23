#!/usr/bin/env python3
"""
Mobile: withdrawal receipts switch to "Successful Transaction" once the bank confirms.

Needs the backend update oam-withdrawal-receipt-status-backend.

Unzip in the mobile project root (with app.json), then:
    python3 apply_withdrawal_receipt_status_mobile.py
"""
import json, shutil, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA = json.loads('{"edits": {"src/features/wallet/api/payouts-api.ts": [["    api.get<Withdrawal[] | { results: Withdrawal[] }>(\\"/payouts/withdrawals/history/\\")\\n      .then((r) => (Array.isArray(r.data) ? r.data : r.data.results ?? [])),\\n\\n  /** Cancel a queued withdrawal — the money goes back to the wallet. */\\n  cancel: (id: string) => api.post<Withdrawal>(`/payouts/withdrawals/${id}/cancel/`, {}).then((r) => r.data),\\n\\n", "    api.get<Withdrawal[] | { results: Withdrawal[] }>(\\"/payouts/withdrawals/history/\\")\\n      .then((r) => (Array.isArray(r.data) ? r.data : r.data.results ?? [])),\\n\\n  /** One withdrawal, re-checked with the bank provider while it\'s processing. */\\n  get: (id: string) => api.get<Withdrawal>(`/payouts/withdrawals/${id}/`).then((r) => r.data),\\n\\n  /** Cancel a queued withdrawal — the money goes back to the wallet. */\\n  cancel: (id: string) => api.post<Withdrawal>(`/payouts/withdrawals/${id}/cancel/`, {}).then((r) => r.data),\\n\\n"]], "src/app/(app)/withdraw.tsx": [["import { ReceiptScreen, type MobileReceipt } from \\"@/features/receipts/ReceiptScreen\\";\\nimport { formatReceiptDate } from \\"@/features/receipts/format-receipt-date\\";\\nimport { KeyboardAware } from \\"@/shared/ui/keyboard\\";\\n\\nexport default function Withdraw() {\\n  const router = useRouter();\\n", "import { ReceiptScreen, type MobileReceipt } from \\"@/features/receipts/ReceiptScreen\\";\\nimport { formatReceiptDate } from \\"@/features/receipts/format-receipt-date\\";\\nimport { KeyboardAware } from \\"@/shared/ui/keyboard\\";\\nimport { useWithdrawalPoll } from \\"@/features/wallet/model/use-withdrawal-poll\\";\\n\\nexport default function Withdraw() {\\n  const router = useRouter();\\n"], ["  const accountsQuery = useQuery({ queryKey: [\\"payouts\\", \\"accounts\\"], queryFn: payoutsApi.getBankAccounts, enabled: isVerified });\\n  const accounts = accountsQuery.data ?? [];\\n\\n  const withdraw = useMutation({\\n    mutationFn: (pin: string) => payoutsApi.withdraw({ bank_account_id: accountId, amount: Number(amount), pin }),\\n    onSuccess: (w) => {\\n", "  const accountsQuery = useQuery({ queryKey: [\\"payouts\\", \\"accounts\\"], queryFn: payoutsApi.getBankAccounts, enabled: isVerified });\\n  const accounts = accountsQuery.data ?? [];\\n\\n  // While the bank confirms, keep checking and update the receipt when it settles.\\n  const [pollId, setPollId] = useState<string | null>(null);\\n  useWithdrawalPoll(pollId, (w) => {\\n    setPollId(null);\\n    qc.invalidateQueries({ queryKey: [\\"wallets\\"] });\\n    qc.invalidateQueries({ queryKey: [\\"transactions\\"] });\\n    if (w.status === \\"success\\") {\\n      setReceipt((r) => (r ? { ...r, status: \\"Successful Transaction\\" } : r));\\n    } else {\\n      setReceipt(null);\\n      const reason = (w.failure_reason as string) || \\"\\";\\n      setError(reason ? t(\\"withdraw.errFailedReason\\", { reason }) : t(\\"withdraw.errFailed\\"));\\n    }\\n  });\\n\\n  const withdraw = useMutation({\\n    mutationFn: (pin: string) => payoutsApi.withdraw({ bank_account_id: accountId, amount: Number(amount), pin }),\\n    onSuccess: (w) => {\\n"], ["      setError(null);\\n      if (w.status === \\"queued\\") { setQueued(w); setAmount(\\"\\"); return; }   // waiting for OAM\'s balance\\n      const pending = w.status === \\"pending\\" || w.status === \\"processing\\";\\n      if (w.reference) {\\n        setReceipt({\\n          amount: Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2 }),\\n", "      setError(null);\\n      if (w.status === \\"queued\\") { setQueued(w); setAmount(\\"\\"); return; }   // waiting for OAM\'s balance\\n      const pending = w.status === \\"pending\\" || w.status === \\"processing\\";\\n      if (pending) setPollId(String(w.id));\\n      if (w.reference) {\\n        setReceipt({\\n          amount: Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2 }),\\n"]]}, "files": {"src/features/wallet/model/use-withdrawal-poll.ts": "import { useEffect, useRef } from \\"react\\";\\nimport { payoutsApi, type Withdrawal } from \\"../api/payouts-api\\";\\n\\nconst FINAL = [\\"success\\", \\"failed\\", \\"reversed\\", \\"cancelled\\"];\\n\\n/**\\n * After a bank transfer comes back \\"processing\\", check it every few seconds\\n * (the backend re-asks the payout provider) and report once it settles, so the\\n * receipt can flip from \\"Transfer Processing\\" to \\"Successful Transaction\\".\\n * Stops after ~1 minute; the wallet history catches up later either way.\\n */\\nexport function useWithdrawalPoll(id: string | null, onFinal: (w: Withdrawal) => void, everyMs = 3000, tries = 20) {\\n  const cb = useRef(onFinal);\\n  cb.current = onFinal;\\n\\n  useEffect(() => {\\n    if (!id) return;\\n    let n = 0;\\n    let stopped = false;\\n    const timer = setInterval(async () => {\\n      n += 1;\\n      try {\\n        const w = await payoutsApi.get(id);\\n        if (!stopped && FINAL.includes(String(w.status))) {\\n          stopped = true;\\n          clearInterval(timer);\\n          cb.current(w);\\n          return;\\n        }\\n      } catch {\\n        /* keep trying */\\n      }\\n      if (n >= tries) clearInterval(timer);\\n    }, everyMs);\\n    return () => { stopped = true; clearInterval(timer); };\\n  }, [id, everyMs, tries]);\\n}\\n"}, "locales": {}}')
TAG = 'wdstatus'
if not (ROOT / 'app.json').exists():
    print("Run this from the mobile project root (the folder with app.json)."); sys.exit(1)

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
