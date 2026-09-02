import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowDownLeft, ArrowUpRight, BedDouble, Building2, Car, CreditCard, Eye, EyeOff, Gift, MapPinned, Plane, Plus, Receipt, Send, ShieldAlert, Smartphone, Store, Tv, Wifi, Wrench, Zap, ShoppingBag, Ticket, Bus } from "lucide-react";
import { useState } from "react";
import AppHeader from "../components/AppHeader";
import { useUserScope } from "../auth/useUserScope";
import { useAuth } from "../auth/AuthContext";
import { describeTransaction, friendlyTime } from "../lib/format";
import { walletApi, formatBalance, type Transaction } from "../services/wallet";
import { useCurrency } from "../currency/CurrencyContext";

/**
 * Real dashboard: wallet balance, quick actions, recent transactions.
 * Wallet endpoints require a verified user, so we only fetch when verified and
 * show a verification prompt otherwise.
 */
export default function Dashboard() {
  const { t } = useTranslation();
  const scope = useUserScope();
  const { user, isVerified } = useAuth();
  const [hideBalance, setHideBalance] = useState(false);
  const { currency: displayCurrency, format: formatMoney } = useCurrency();

  const walletsQuery = useQuery({
    queryKey: ["wallet", scope, "list"],
    queryFn: walletApi.getWallets,
    enabled: isVerified, // don't hit a 403 for unverified users
  });

  // Prefer the Naira wallet as the headline balance.
  const wallets = walletsQuery.data?.wallets ?? [];
  const defaultCurrency = wallets.some((w) => w.currency === "NGN")
    ? "NGN"
    : walletsQuery.data?.default_currency ?? "NGN";
  const defaultWallet =
    wallets.find((w) => w.currency === defaultCurrency) ?? wallets[0];

  const txnsQuery = useQuery({
    queryKey: ["wallet", scope, "transactions", defaultCurrency],
    queryFn: () => walletApi.getTransactions(defaultCurrency),
    enabled: isVerified && Boolean(defaultWallet),
  });

  const transactions = txnsQuery.data?.results ?? [];

  const greeting = user?.first_name
    ? t("dashboard.greetingNamed", { name: user.first_name })
    : t("dashboard.greeting");

  return (
    <div className="min-h-screen bg-mist">
      <AppHeader />

      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-6 sm:py-10">
        <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
          {greeting}
        </h1>

        {!isVerified && <VerifyBanner identifier={user?.email ?? user?.phone ?? ""} />}

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Balance card */}
          <section className="lg:col-span-2">
            <div className="relative overflow-hidden rounded-2xl bg-[#0a0a0a] p-6 text-white sm:p-7">
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "radial-gradient(circle at 15% 15%, rgba(11,115,39,0.35), transparent 55%), radial-gradient(circle at 90% 90%, rgba(227,16,18,0.14), transparent 50%)",
                }}
                aria-hidden="true"
              />
              <div
                className="absolute inset-x-0 top-0 h-[3px]"
                style={{ background: "linear-gradient(90deg,#111 33%,#E31012 33%,#E31012 66%,#0B7327 66%)" }}
                aria-hidden="true"
              />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <Link to="/wallet" className="text-[13px] text-white/60 transition hover:text-white/85">
                    {t("dashboard.walletBalance")} {defaultWallet ? `· ${displayCurrency.code}` : ""} ›
                  </Link>
                  <button
                    onClick={() => setHideBalance((v) => !v)}
                    aria-label={hideBalance ? t("dashboard.showBalance") : t("dashboard.hideBalance")}
                    className="text-white/50 transition hover:text-white/80"
                  >
                    {hideBalance ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <div className="mt-2 min-h-[44px]">
                  {!isVerified ? (
                    <div className="text-[22px] font-semibold text-white/40">— — —</div>
                  ) : walletsQuery.isLoading ? (
                    <div className="mt-1 h-9 w-40 animate-pulse rounded-lg bg-white/10" />
                  ) : walletsQuery.isError ? (
                    <div className="text-[15px] text-white/70">{t("dashboard.loadBalanceError")}</div>
                  ) : (
                    <div className="tabular text-[34px] font-bold tracking-tight sm:text-[40px]">
                      {hideBalance ? "••••••" : formatMoney(Number(defaultWallet?.balance ?? 0))}
                    </div>
                  )}
                </div>

                {isVerified && !walletsQuery.isLoading && !walletsQuery.isError &&
                  Number(defaultWallet?.balance ?? 0) === 0 && (
                    <p className="mt-1 text-[12.5px] text-white/50">
                      {t("dashboard.emptyWallet")}
                    </p>
                )}

                <div className="mt-5 flex flex-wrap gap-3">
                  <ActionPill to="/wallet/fund" icon={<Plus size={16} strokeWidth={2} />} label={t("dashboard.addMoney")} primary />
                  <ActionPill to="/wallet/send" icon={<Send size={15} strokeWidth={2} />} label={t("dashboard.send")} />
                  <ActionPill to="/wallet/withdraw" icon={<ArrowUpRight size={15} strokeWidth={2} />} label={t("dashboard.withdraw")} />
                </div>

                {/* other currency wallets, if any */}
                {isVerified && (walletsQuery.data?.wallets.length ?? 0) > 1 && (
                  <div className="mt-5 flex flex-wrap gap-2 border-t border-white/10 pt-4">
                    {walletsQuery.data!.wallets
                      .filter((w) => w.currency !== defaultCurrency)
                      .map((w) => (
                        <span key={w.id} className="rounded-lg bg-white/[0.06] px-3 py-1.5 text-[12px] text-white/75">
                          {w.currency} {hideBalance ? "••••" : formatBalance(w.balance, w.currency)}
                        </span>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* Services */}
            <div className="mt-6 space-y-5">
              <ServiceGroup
                title={t("dashboard.groups.bills")}
                items={[
                  { to: "/services/airtime", icon: <Smartphone size={20} strokeWidth={1.75} />, label: t("dashboard.services.airtime"), tint: "green" },
                  { to: "/services/data", icon: <Wifi size={20} strokeWidth={1.75} />, label: t("dashboard.services.data"), tint: "green" },
                  { to: "/services/electricity", icon: <Zap size={20} strokeWidth={1.75} />, label: t("dashboard.services.electricity"), tint: "green" },
                  { to: "/services/cable", icon: <Tv size={20} strokeWidth={1.75} />, label: t("dashboard.services.cable"), tint: "green" },
                ]}
              />
              <ServiceGroup
                title={t("dashboard.groups.money")}
                items={[
                  { to: "/wallet/fund", icon: <Plus size={20} strokeWidth={1.75} />, label: t("dashboard.services.fund"), tint: "green" },
                  { to: "/wallet/withdraw", icon: <ArrowUpRight size={20} strokeWidth={1.75} />, label: t("dashboard.services.withdraw"), tint: "green" },
                  { to: "/wallet/send", icon: <Send size={20} strokeWidth={1.75} />, label: t("dashboard.services.transfer"), tint: "green" },
                  { to: "/services/giftcards", icon: <Gift size={20} strokeWidth={1.75} />, label: t("dashboard.services.giftCards"), tint: "green" },
                ]}
              />
              <ServiceGroup
                title={t("dashboard.groups.travel")}
                items={[
                  { to: "/travel/flights", icon: <Plane size={20} strokeWidth={1.75} />, label: t("dashboard.services.flights"), tint: "green" },
                  { to: "/travel/hotels", icon: <BedDouble size={20} strokeWidth={1.75} />, label: t("dashboard.services.hotels"), tint: "green" },
                  { to: "/travel/carhire", icon: <Car size={20} strokeWidth={1.75} />, label: t("dashboard.services.carHire"), tint: "green" },
                  { to: "/travel/pickup", icon: <MapPinned size={20} strokeWidth={1.75} />, label: t("dashboard.services.pickup"), tint: "green" },
                  { to: "/travel/bus", icon: <Bus size={20} strokeWidth={1.75} />, label: t("dashboard.services.bus", "Bus Tickets"), tint: "green" },
                ]}
              />
              <ServiceGroup
                title={t("dashboard.groups.shop")}
                items={[
                  { to: "/marketplace", icon: <Store size={20} strokeWidth={1.75} />, label: t("dashboard.services.marketplace"), tint: "green" },
                  { to: "/artisans", icon: <Wrench size={20} strokeWidth={1.75} />, label: t("dashboard.services.artisans"), tint: "green" },
                  { to: "/ecommerce", icon: <ShoppingBag size={20} strokeWidth={1.75} />, label: t("dashboard.services.ecommerce", "E-commerce"), tint: "green" },
                  { to: "/services/betting", icon: <Ticket size={20} strokeWidth={1.75} />, label: t("dashboard.services.betting", "Fund Betting"), tint: "green" },
                  { to: "/referral", icon: <Gift size={20} strokeWidth={1.75} />, label: t("dashboard.services.referral", "Refer & Earn"), tint: "green" },
                ]}
              />
            </div>
          </section>

          {/* Recent transactions */}
          <section>
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-ink">{t("dashboard.recentTransactions")}</h2>
              {defaultWallet && (
                <Link to={`/wallet/transactions`} className="text-[13px] font-medium text-brand-green hover:underline">
                  {t("common.seeAll")}
                </Link>
              )}
            </div>

            <div className="mt-3 rounded-2xl border border-hairline bg-paper">
              {!isVerified ? (
                <TxnMessage icon={<ShieldAlert size={20} strokeWidth={1.5} />} text={t("dashboard.verifyToSeeTransactions")} />
              ) : txnsQuery.isLoading ? (
                <TxnSkeleton />
              ) : txnsQuery.isError ? (
                <TxnMessage icon={<Receipt size={20} strokeWidth={1.5} />} text={t("dashboard.loadTransactionsError")} />
              ) : transactions.length === 0 ? (
                <TxnMessage icon={<Receipt size={20} strokeWidth={1.5} />} text={t("dashboard.noTransactions")} />
              ) : (
                <ul className="divide-y divide-hairline">
                  {transactions.slice(0, 8).map((t) => (
                    <TxnRow key={t.id} txn={t} />
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function ActionPill({ to, icon, label, primary }: { to: string; icon: React.ReactNode; label: string; primary?: boolean }) {
  return (
    <Link
      to={to}
      className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] font-medium transition ${
        primary ? "bg-brand-red text-white hover:brightness-95" : "bg-white/[0.08] text-white hover:bg-white/[0.14]"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}

type ServiceItem = { to: string; icon: React.ReactNode; label: string; tint: "green" | "red" };

function ServiceGroup({ title, items }: { title: string; items: ServiceItem[] }) {
  return (
    <div>
      <h2 className="mb-3 text-[15px] font-semibold text-ink">{title}</h2>
      <div className="grid grid-cols-4 gap-3">
        {items.map((it) => (
          <ServiceCard key={it.to} {...it} />
        ))}
      </div>
    </div>
  );
}

function ServiceCard({ to, icon, label, tint }: ServiceItem) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center gap-2 rounded-xl border border-hairline bg-paper p-3 text-center transition hover:-translate-y-0.5 hover:border-ink/15 hover:shadow-sm"
    >
      <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tint === "red" ? "bg-brand-red/10 text-brand-red" : "bg-brand-green/10 text-brand-green"}`}>
        {icon}
      </span>
      <span className="text-[11.5px] font-medium text-ink">{label}</span>
    </Link>
  );
}

const TXN_ICONS: Record<string, React.ReactNode> = {
  airtime: <Smartphone size={16} strokeWidth={1.75} />,
  data: <Wifi size={16} strokeWidth={1.75} />,
  electricity: <Zap size={16} strokeWidth={1.75} />,
  cable: <Tv size={16} strokeWidth={1.75} />,
  funding: <CreditCard size={16} strokeWidth={1.75} />,
  withdrawal: <Building2 size={16} strokeWidth={1.75} />,
};

function TxnRow({ txn }: { txn: Transaction }) {
  const { t } = useTranslation();
  const isCredit = txn.direction === "credit";
  const amount = parseFloat(txn.amount);
  const symbol = { NGN: "₦", USD: "$", GBP: "£", EUR: "€" }[txn.currency.toUpperCase()] ?? "";
  const formatted = `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const { label, kind } = describeTransaction(txn.description);
  const when = friendlyTime(txn.created_at);

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${isCredit ? "bg-brand-green/10 text-brand-green" : "bg-mist text-muted"}`}>
        {TXN_ICONS[kind] ?? (isCredit ? <ArrowDownLeft size={16} strokeWidth={2} /> : <ArrowUpRight size={16} strokeWidth={2} />)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 text-[13.5px] font-medium text-ink">{label || (isCredit ? t("dashboard.credit") : t("dashboard.debit"))}</p>
        <p className="text-[11.5px] text-muted">{when}</p>
      </div>
      <span className={`shrink-0 tabular text-[13.5px] font-semibold ${isCredit ? "text-brand-green" : "text-ink"}`}>
        {isCredit ? "+" : "−"}{formatted}
      </span>
    </li>
  );
}

function TxnSkeleton() {
  return (
    <ul className="divide-y divide-hairline">
      {Array.from({ length: 5 }).map((_, i) => (
        <li key={i} className="flex items-center gap-3 px-4 py-3">
          <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-hairline/60" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-2/3 animate-pulse rounded bg-hairline/60" />
            <div className="h-2.5 w-1/3 animate-pulse rounded bg-hairline/60" />
          </div>
          <div className="h-3 w-14 animate-pulse rounded bg-hairline/60" />
        </li>
      ))}
    </ul>
  );
}

function TxnMessage({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-mist text-muted">{icon}</span>
      <p className="mt-3 max-w-[200px] text-[13px] text-muted">{text}</p>
    </div>
  );
}

function VerifyBanner({ identifier }: { identifier: string }) {
  const { t } = useTranslation();
  return (
    <div className="mt-4 flex items-start gap-3 rounded-xl border border-warn/30 bg-warn/5 p-4">
      <ShieldAlert size={20} strokeWidth={1.75} className="mt-0.5 shrink-0 text-warn" />
      <div className="flex-1">
        <p className="text-[14px] font-medium text-warn">{t("dashboard.verifyBanner.title")}</p>
        <p className="mt-0.5 text-[13px] text-warn/80">
          {t("dashboard.verifyBanner.body")}
        </p>
      </div>
      <Link
        to="/verify"
        state={{ identifier }}
        className="shrink-0 self-center rounded-lg bg-warn px-3.5 py-2 text-[13px] font-medium text-white transition hover:brightness-95"
      >
        {t("dashboard.verifyBanner.cta")}
      </Link>
    </div>
  );
}
