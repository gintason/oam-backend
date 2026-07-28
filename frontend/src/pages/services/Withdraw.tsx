import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, BadgeCheck, Building2, CheckCircle2, Loader2, Plus, Search, X } from "lucide-react";
import AppHeader from "../../components/AppHeader";
import { useUserScope } from "../../auth/useUserScope";
import { useAuth } from "../../auth/AuthContext";
import { payoutsApi, type BankAccount } from "../../services/payouts";
import { walletApi, formatBalance } from "../../services/wallet";
import { apiErrorMessage } from "../../lib/api";
import { VerifyGate } from "./BuyData";
import { useDebounced } from "../../hooks/useDebounced";

/** Withdraw wallet funds to a Nigerian bank account. */
export default function Withdraw() {
  const scope = useUserScope();
  const { isVerified } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [accountId, setAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string>();
  const [done, setDone] = useState<string>();
  const [adding, setAdding] = useState(false);

  const walletsQuery = useQuery({
    queryKey: ["wallet", scope, "list"],
    queryFn: walletApi.getWallets,
    enabled: isVerified,
  });
  const ngn = walletsQuery.data?.wallets.find((w) => w.currency === "NGN");

  const accountsQuery = useQuery({
    queryKey: ["payouts", scope, "accounts"],
    queryFn: payoutsApi.getBankAccounts,
    enabled: isVerified,
  });

  const pinStatus = useQuery({
    queryKey: ["wallet", scope, "pin"],
    queryFn: walletApi.getPinStatus,
    enabled: isVerified,
  });
  const hasPin = pinStatus.data?.has_pin;

  const withdraw = useMutation({
    mutationFn: () => payoutsApi.withdraw({ bank_account_id: accountId, amount: Number(amount), pin }),
    onSuccess: (w) => {
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["payouts"] });

      // A withdrawal can come back already-failed (e.g. the payout provider had
      // no balance). Say WHY rather than just showing a status word.
      if (w.status === "failed") {
        setDone(undefined);
        const reason = (w.failure_reason as string) || "";
        setError(
          reason
            ? `Withdrawal failed: ${reason} Your wallet was not debited.`
            : "Withdrawal failed. Your wallet was not debited — please try again shortly."
        );
        return;
      }

      setError(undefined);
      setAmount("");
      setPin("");
      const pending = w.status === "pending" || w.status === "processing";
      setDone(
        pending
          ? `₦${Number(amount).toLocaleString()} is on its way to ${w.account_name || "your bank"}. It usually lands within minutes.`
          : `Withdrawal of ₦${Number(amount).toLocaleString()} completed.`
      );
    },
    onError: (err) => {
      setDone(undefined);
      pinStatus.refetch();
      setError(apiErrorMessage(err, "Withdrawal failed."));
    },
  });

  if (!isVerified) return <VerifyGate onBack={() => navigate("/dashboard")} />;

  const accounts = accountsQuery.data ?? [];
  const balance = Number(ngn?.balance ?? 0);

  return (
    <div className="min-h-screen bg-mist">
      <AppHeader />
      <main className="mx-auto max-w-md px-5 py-8 sm:py-10">
        <button onClick={() => navigate("/wallet")} className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted transition hover:text-ink">
          <ArrowLeft size={15} /> Back to wallet
        </button>

        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-green/10 text-brand-green">
            <ArrowUpRight size={22} strokeWidth={1.75} />
          </span>
          <div>
            <h1 className="font-display text-xl font-semibold text-ink">Withdraw</h1>
            <p className="text-[13px] text-muted">
              Available: <span className="font-medium text-ink">{formatBalance(ngn?.balance ?? "0", "NGN")}</span>
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-hairline bg-paper p-5">
          {error && <div className="mb-4 rounded-lg border border-danger/30 bg-danger/5 px-3.5 py-2.5 text-[13px] text-danger">{error}</div>}
          {done && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-brand-green/30 bg-brand-green/5 px-3.5 py-2.5 text-[13px] text-brand-green">
              <CheckCircle2 size={15} className="mt-0.5 shrink-0" />{done}
            </div>
          )}

          {/* Saved accounts */}
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-[12.5px] font-semibold text-ink">Bank account</label>
            <button onClick={() => setAdding((v) => !v)} className="inline-flex items-center gap-1 text-[12.5px] font-medium text-brand-green hover:underline">
              {adding ? <><X size={13} /> Cancel</> : <><Plus size={13} /> Add account</>}
            </button>
          </div>

          {adding ? (
            <AddAccount
              onDone={() => { setAdding(false); accountsQuery.refetch(); }}
              onError={setError}
            />
          ) : accountsQuery.isLoading ? (
            <div className="mb-4 space-y-2">
              {Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-[11px] bg-hairline/60" />)}
            </div>
          ) : accounts.length === 0 ? (
            <div className="mb-4 rounded-[11px] border border-dashed border-hairline p-5 text-center">
              <Building2 size={22} strokeWidth={1.5} className="mx-auto text-muted" />
              <p className="mt-2 text-[13px] text-muted">No bank account saved yet.</p>
              <button onClick={() => setAdding(true)} className="mt-3 rounded-lg bg-brand-green px-4 py-2 text-[13px] font-medium text-white">
                Add your bank account
              </button>
            </div>
          ) : (
            <div className="mb-4 space-y-2">
              {accounts.map((a: BankAccount) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setAccountId(a.id)}
                  className={`flex w-full items-center gap-3 rounded-[11px] border px-3.5 py-3 text-left transition ${
                    accountId === a.id ? "border-brand-green bg-brand-green/5" : "border-hairline bg-paper hover:bg-mist"
                  }`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mist text-muted">
                    <Building2 size={16} strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium text-ink">{a.account_name}</span>
                    <span className="block truncate text-[11.5px] text-muted">{a.bank_name} · {a.account_number}</span>
                  </span>
                  {accountId === a.id && <BadgeCheck size={16} className="shrink-0 text-brand-green" />}
                </button>
              ))}
            </div>
          )}

          {/* Amount */}
          {!adding && (
            <>
              <label htmlFor="amt" className="mb-1.5 block text-[12.5px] font-semibold text-ink">Amount (₦)</label>
              <input
                id="amt"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
                placeholder="0"
                className="h-12 w-full rounded-[11px] border border-hairline bg-paper px-3.5 text-[15px] text-ink outline-none transition focus:border-brand-green focus:ring-[3px] focus:ring-brand-green/10"
              />
              {amount && Number(amount) > balance && (
                <p className="mt-1.5 text-[12.5px] text-danger">That's more than your available balance.</p>
              )}

              {/* Fee summary — the platform currently applies no withdrawal fee,
                  so what you enter is what's sent. */}
              {amount && Number(amount) > 0 && (
                <div className="mt-3 space-y-1 rounded-[11px] border border-hairline bg-mist/50 px-3.5 py-2.5 text-[12.5px]">
                  <div className="flex justify-between text-muted">
                    <span>Amount</span><span className="text-ink">{formatBalance(amount, "NGN")}</span>
                  </div>
                  <div className="flex justify-between text-muted">
                    <span>Fee</span><span className="text-ink">{formatBalance(0, "NGN")}</span>
                  </div>
                  <div className="flex justify-between border-t border-hairline pt-1 font-semibold">
                    <span className="text-ink">Total debited</span>
                    <span className="text-ink">{formatBalance(amount, "NGN")}</span>
                  </div>
                </div>
              )}

              {/* Transaction PIN */}
              {pinStatus.isLoading ? (
                <div className="mt-4 h-11 animate-pulse rounded-[11px] bg-hairline/60" />
              ) : hasPin === false ? (
                <SetPin onDone={() => pinStatus.refetch()} onError={setError} />
              ) : (
                <div className="mt-4">
                  <label htmlFor="pin" className="mb-1.5 block text-[12.5px] font-semibold text-ink">
                    Transaction PIN
                  </label>
                  <input
                    id="pin"
                    type="password"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/[^\d]/g, ""))}
                    placeholder="Enter your PIN"
                    className="h-12 w-full rounded-[11px] border border-hairline bg-paper px-3.5 text-[15px] tracking-[0.3em] text-ink outline-none transition focus:border-brand-green focus:ring-[3px] focus:ring-brand-green/10"
                  />
                </div>
              )}

              <button
                onClick={() => {
                  setError(undefined); setDone(undefined);
                  if (!accountId) return setError("Choose a bank account.");
                  if (!amount || Number(amount) <= 0) return setError("Enter an amount.");
                  if (Number(amount) > balance) return setError("Amount exceeds your wallet balance.");
                  if (hasPin === false) return setError("Create your transaction PIN first.");
                  if (pin.length < 4) return setError("Enter your 4–6 digit transaction PIN.");
                  withdraw.mutate();
                }}
                disabled={withdraw.isPending || hasPin === false}
                className="mt-5 flex h-12 w-full items-center justify-center rounded-[11px] bg-brand-red text-[15px] font-semibold text-white shadow-[0_8px_20px_rgba(227,16,18,0.25)] transition hover:brightness-95 active:scale-[0.99] disabled:opacity-60"
              >
                {withdraw.isPending
                  ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  : amount ? `Withdraw ₦${Number(amount).toLocaleString()}` : "Withdraw"}
              </button>
              <p className="mt-3 text-center text-[12px] text-muted">
                Sent to your bank via Paystack. Arrival is usually within minutes.
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

/** Searchable bank picker + AUTOMATIC account-name verification. */
function AddAccount({ onDone, onError }: { onDone: () => void; onError: (m?: string) => void }) {
  const [bankCode, setBankCode] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankSearch, setBankSearch] = useState("");
  const [showList, setShowList] = useState(false);
  const [accountNumber, setAccountNumber] = useState("");
  const [resolvedName, setResolvedName] = useState<string>();

  const banksQuery = useQuery({ queryKey: ["payouts", "banks"], queryFn: () => payoutsApi.getBanks("NGN") });

  // Filter by name, code, acronym (GTB -> Guaranty Trust Bank) and common
  // aliases, then rank the closest matches first.
  const banks = useMemo(() => {
    const all = [...(banksQuery.data ?? [])];
    const q = bankSearch.trim().toLowerCase();
    if (!q) return all.sort((a, b) => String(a.name).localeCompare(String(b.name)));
    return all
      .map((b) => ({ b, score: bankScore(String(b.name), String(b.code), q) }))
      .filter((x) => x.score >= 0)
      .sort((a, b) => a.score - b.score || String(a.b.name).localeCompare(String(b.b.name)))
      .map((x) => x.b);
  }, [banksQuery.data, bankSearch]);

  const resolve = useMutation({
    mutationFn: () => payoutsApi.resolveAccount({ bank_code: bankCode, account_number: accountNumber.trim() }),
    onSuccess: (d) => {
      const name = (d.account_name as string) || (d.name as string) || "";
      if (name) { setResolvedName(name); onError(undefined); }
      else { setResolvedName(undefined); onError(d.detail || "Couldn't resolve that account."); }
    },
    onError: (err) => { setResolvedName(undefined); onError(apiErrorMessage(err, "Couldn't resolve that account.")); },
  });

  const save = useMutation({
    mutationFn: () => payoutsApi.addBankAccount({ bank_code: bankCode, account_number: accountNumber.trim() }),
    onSuccess: () => onDone(),
    onError: (err) => onError(apiErrorMessage(err, "Couldn't save that account.")),
  });

  // AUTO-VERIFY: once a bank is chosen and 10 digits are in, resolve by itself.
  const debouncedAccount = useDebounced(accountNumber, 600);
  useEffect(() => {
    if (bankCode && debouncedAccount.length === 10 && !resolvedName && !resolve.isPending) {
      resolve.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bankCode, debouncedAccount]);

  return (
    <div className="mb-4 rounded-[11px] border border-hairline bg-mist/50 p-3.5">
      <label className="mb-1.5 block text-[12.5px] font-semibold text-ink">Bank</label>

      {/* Searchable bank picker */}
      <div className="relative mb-3">
        <div className="flex h-11 items-center gap-2 rounded-[10px] border border-hairline bg-paper px-3">
          <Search size={15} strokeWidth={1.75} className="shrink-0 text-muted" />
          <input
            value={showList ? bankSearch : bankName || bankSearch}
            onChange={(e) => { setBankSearch(e.target.value); setShowList(true); setBankCode(""); setBankName(""); setResolvedName(undefined); }}
            onFocus={() => { setShowList(true); setBankSearch(""); }}
            placeholder={banksQuery.isLoading ? "Loading banks…" : "Search your bank (e.g. Fidelity)"}
            className="h-full w-full min-w-0 bg-transparent text-[14px] text-ink outline-none placeholder:text-muted"
          />
          {bankName && !showList && <BadgeCheck size={15} className="shrink-0 text-brand-green" />}
        </div>

        {showList && (
          <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-[10px] border border-hairline bg-paper shadow-lg">
            {banksQuery.isLoading ? (
              <p className="px-3 py-3 text-[13px] text-muted">Loading banks…</p>
            ) : banksQuery.isError ? (
              <div className="px-3 py-3 text-[13px]">
                <p className="text-danger">{apiErrorMessage(banksQuery.error, "Couldn't load the bank list.")}</p>
                <button type="button" onClick={() => banksQuery.refetch()} className="mt-1 underline text-ink">Try again</button>
              </div>
            ) : (banksQuery.data?.length ?? 0) === 0 ? (
              <p className="px-3 py-3 text-[13px] text-muted">
                The bank list came back empty. Your payout provider returned no banks —
                check the backend provider configuration.
              </p>
            ) : banks.length === 0 ? (
              <div className="px-3 py-3 text-[13px] text-muted">
                <p>No bank matches "{bankSearch}".</p>
                <button
                  type="button"
                  onClick={() => setBankSearch("")}
                  className="mt-1 underline text-ink"
                >
                  Show all {banksQuery.data?.length ?? 0} banks
                </button>
              </div>
            ) : (
              banks.map((b) => (
                <button
                  key={String(b.code)}
                  type="button"
                  onClick={() => {
                    setBankCode(String(b.code));
                    setBankName(String(b.name));
                    setBankSearch(String(b.name));
                    setShowList(false);
                    setResolvedName(undefined);
                  }}
                  className="block w-full px-3 py-2.5 text-left text-[13.5px] text-ink transition hover:bg-mist"
                >
                  {String(b.name)}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {banksQuery.isError && (
        <p className="mb-3 text-[12.5px] text-danger">
          Bank list unavailable — {apiErrorMessage(banksQuery.error, "please try again")}.
        </p>
      )}

      <label className="mb-1.5 block text-[12.5px] font-semibold text-ink">Account number</label>
      <input
        inputMode="numeric"
        maxLength={10}
        value={accountNumber}
        onChange={(e) => { setAccountNumber(e.target.value.replace(/[^\d]/g, "")); setResolvedName(undefined); }}
        placeholder="10 digits"
        className="h-11 w-full rounded-[10px] border border-hairline bg-paper px-3 text-[14px] text-ink outline-none focus:border-brand-green"
      />

      {/* Auto-verification feedback */}
      {resolve.isPending && (
        <div className="mt-2 flex items-center gap-1.5 text-[13px] text-muted">
          <Loader2 size={14} className="animate-spin" /> Checking account…
        </div>
      )}
      {resolvedName && (
        <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-brand-green/30 bg-brand-green/5 px-3 py-2 text-[13px] text-brand-green">
          <BadgeCheck size={15} strokeWidth={2} /> {resolvedName}
        </div>
      )}
      {!resolvedName && !resolve.isPending && bankCode && accountNumber.length > 0 && accountNumber.length < 10 && (
        <p className="mt-2 text-[12.5px] text-muted">Enter all 10 digits to check the account name.</p>
      )}

      <button
        type="button"
        onClick={() => { if (!resolvedName) return onError("Wait for the account name to be confirmed."); save.mutate(); }}
        disabled={save.isPending || !resolvedName}
        className="mt-3 h-11 w-full rounded-[10px] bg-brand-green text-[14px] font-medium text-white transition hover:brightness-95 disabled:opacity-50"
      >
        {save.isPending ? "Saving…" : "Save account"}
      </button>
    </div>
  );
}

/** First-time transaction-PIN setup, authorized with the account password. */
function SetPin({ onDone, onError }: { onDone: () => void; onError: (m?: string) => void }) {
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");

  const create = useMutation({
    mutationFn: () => walletApi.setPin({ pin, password }),
    onSuccess: () => onDone(),
    onError: (err) => onError(apiErrorMessage(err, "Couldn't set your PIN.")),
  });

  const valid = /^\d{4,6}$/.test(pin) && pin === confirm && password.length > 0;

  return (
    <div className="mt-4 rounded-[11px] border border-brand-green/30 bg-brand-green/5 p-3.5">
      <p className="text-[13px] font-semibold text-ink">Create your transaction PIN</p>
      <p className="mt-0.5 text-[12px] leading-relaxed text-muted">
        You'll enter this 4–6 digit PIN to authorize withdrawals. Confirm it with
        your account password to set it up.
      </p>

      <label className="mt-3 mb-1.5 block text-[12.5px] font-semibold text-ink">Account password</label>
      <input
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => { setPassword(e.target.value); onError(undefined); }}
        placeholder="Your login password"
        className="h-11 w-full rounded-[10px] border border-hairline bg-paper px-3 text-[14px] text-ink outline-none focus:border-brand-green"
      />

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1.5 block text-[12.5px] font-semibold text-ink">New PIN</label>
          <input
            type="password" inputMode="numeric" maxLength={6} value={pin}
            onChange={(e) => { setPin(e.target.value.replace(/[^\d]/g, "")); onError(undefined); }}
            placeholder="4–6 digits"
            className="h-11 w-full rounded-[10px] border border-hairline bg-paper px-3 text-[14px] tracking-[0.3em] text-ink outline-none focus:border-brand-green"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[12.5px] font-semibold text-ink">Confirm PIN</label>
          <input
            type="password" inputMode="numeric" maxLength={6} value={confirm}
            onChange={(e) => { setConfirm(e.target.value.replace(/[^\d]/g, "")); onError(undefined); }}
            placeholder="Repeat PIN"
            className="h-11 w-full rounded-[10px] border border-hairline bg-paper px-3 text-[14px] tracking-[0.3em] text-ink outline-none focus:border-brand-green"
          />
        </div>
      </div>
      {confirm.length > 0 && pin !== confirm && (
        <p className="mt-1.5 text-[12px] text-danger">PINs don't match.</p>
      )}

      <button
        type="button"
        onClick={() => { if (!valid) return onError("Enter a matching 4–6 digit PIN and your password."); create.mutate(); }}
        disabled={create.isPending || !valid}
        className="mt-3 h-11 w-full rounded-[10px] bg-brand-green text-[14px] font-medium text-white transition hover:brightness-95 disabled:opacity-50"
      >
        {create.isPending ? "Setting up…" : "Create PIN"}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Bank search matching                                                */
/* ------------------------------------------------------------------ */

// Words we drop when building an abbreviation, so "United Bank For Africa" ->
// "uba" and "Guaranty Trust Bank" -> "gt" (while the full acronym stays "gtb").
const BANK_STOPWORDS = new Set([
  "of", "for", "and", "the", "plc", "ltd", "limited", "co", "company",
  "nigeria", "microfinance", "mfb", "bank",
]);

// Nicknames people type that aren't a substring of the official name. The value
// is a fragment that IS in the official name.
const BANK_ALIASES: Record<string, string> = {
  gtb: "guaranty trust", gtbank: "guaranty trust", gtco: "guaranty trust",
  uba: "united bank for africa",
  fcmb: "first city monument",
  firstbank: "first bank", fbn: "first bank",
  ubn: "union bank",
  stanbic: "stanbic", ibtc: "stanbic ibtc",
  zenith: "zenith", access: "access", fidelity: "fidelity", wema: "wema",
  sterling: "sterling", polaris: "polaris", keystone: "keystone",
  ecobank: "ecobank", jaiz: "jaiz", providus: "providus", titan: "titan",
  kuda: "kuda", opay: "opay", palmpay: "palmpay", moniepoint: "moniepoint",
};

function bankAcronym(words: string[]): string {
  return words.map((w) => w[0] || "").join("");
}

/**
 * Lower score = better match; -1 means no match.
 *   0  strong (code / exact acronym / name starts with query)
 *   1  substring of the name, or acronym/alias contains the query
 */
function bankScore(name: string, code: string, q: string): number {
  const n = name.toLowerCase();
  const c = code.toLowerCase();
  const query = q.trim().toLowerCase();
  if (!query) return 2;
  const qz = query.replace(/[\s.]/g, "");

  const words = n.split(/\s+/).filter(Boolean);
  const acr = bankAcronym(words);
  const acrNoStop = bankAcronym(words.filter((w) => !BANK_STOPWORDS.has(w)));

  if (c === query || acr === qz || acrNoStop === qz || n.startsWith(query)) return 0;

  const alias = BANK_ALIASES[qz];
  if (
    n.includes(query) ||
    c.includes(query) ||
    acr.includes(qz) ||
    acrNoStop.includes(qz) ||
    (alias && n.includes(alias))
  ) {
    return 1;
  }
  return -1;
}
