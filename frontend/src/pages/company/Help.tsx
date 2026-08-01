import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Search } from "lucide-react";
import { useTranslation, Trans } from "react-i18next";
import PageShell, { Block, Notice } from "./PageShell";

type Item = { id: string; qKey: string };
type Group = { id: string; items: Item[] };

/**
 * Answers written from how the platform actually behaves, not generic filler.
 * The electricity token questions come first deliberately — a delayed token is
 * the single most alarming thing that happens to a customer here, and it's the
 * moment they're most likely to pay twice.
 */
const GROUPS: Group[] = [
  { id: "electricity", items: [{ id: "e1", qKey: "q1" }, { id: "e2", qKey: "q2" }, { id: "e3", qKey: "q3" }] },
  { id: "wallet", items: [{ id: "w1", qKey: "q1" }, { id: "w2", qKey: "q2" }, { id: "w3", qKey: "q3" }, { id: "w4", qKey: "q4" }] },
  { id: "marketplace", items: [{ id: "m1", qKey: "q1" }, { id: "m2", qKey: "q2" }, { id: "m3", qKey: "q3" }, { id: "m4", qKey: "q4" }] },
  { id: "account", items: [{ id: "a1", qKey: "q1" }, { id: "a2", qKey: "q2" }] },
];

const orderLink = <Link to="/orders" className="font-medium text-brand-green underline" />;

/** Rich answers, keyed by item id. Structure lives here; wording comes from translations. */
const ANSWERS: Record<string, React.ReactNode> = {
  e1: (
    <>
      <p><Trans i18nKey="company.help.groups.electricity.a1p1" components={{ 1: <strong /> }} /></p>
      <p><Trans i18nKey="company.help.groups.electricity.a1p2" components={{ 1: orderLink }} /></p>
      <p><Trans i18nKey="company.help.groups.electricity.a1p3" /></p>
    </>
  ),
  e2: <p><Trans i18nKey="company.help.groups.electricity.a2" components={{ 1: orderLink }} /></p>,
  e3: <p><Trans i18nKey="company.help.groups.electricity.a3" components={{ 1: <strong /> }} /></p>,
  w1: (
    <>
      <p><Trans i18nKey="company.help.groups.wallet.a1p1" /></p>
      <p><Trans i18nKey="company.help.groups.wallet.a1p2" /></p>
    </>
  ),
  w2: <p><Trans i18nKey="company.help.groups.wallet.a2" /></p>,
  w3: <p><Trans i18nKey="company.help.groups.wallet.a3" /></p>,
  w4: (
    <p>
      <Trans
        i18nKey="company.help.groups.wallet.a4"
        components={{ 1: <Link to="/wallet/send" className="font-medium text-brand-green underline" />, 2: <strong /> }}
      />
    </p>
  ),
  m1: (
    <>
      <p><Trans i18nKey="company.help.groups.marketplace.a1p1" /></p>
      <p><Trans i18nKey="company.help.groups.marketplace.a1p2" /></p>
    </>
  ),
  m2: <p><Trans i18nKey="company.help.groups.marketplace.a2" /></p>,
  m3: (
    <ul className="ml-4 list-disc space-y-1.5">
      <li><Trans i18nKey="company.help.groups.marketplace.a3li1" /></li>
      <li><Trans i18nKey="company.help.groups.marketplace.a3li2" /></li>
      <li><Trans i18nKey="company.help.groups.marketplace.a3li3" /></li>
      <li><Trans i18nKey="company.help.groups.marketplace.a3li4" /></li>
      <li><Trans i18nKey="company.help.groups.marketplace.a3li5" /></li>
    </ul>
  ),
  m4: <p><Trans i18nKey="company.help.groups.marketplace.a4" components={{ 1: <strong /> }} /></p>,
  a1: <p><Trans i18nKey="company.help.groups.account.a1" /></p>,
  a2: <p><Trans i18nKey="company.help.groups.account.a2" /></p>,
};

export default function Help() {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const q = query.trim().toLowerCase();
  const groups = q
    ? GROUPS.map((g) => ({
        ...g,
        items: g.items.filter((i) => t(`company.help.groups.${g.id}.${i.qKey}`).toLowerCase().includes(q)),
      })).filter((g) => g.items.length > 0)
    : GROUPS;

  return (
    <PageShell title={t("company.help.title")} intro={t("company.help.intro")}>
      <div className="relative">
        <Search
          size={16}
          strokeWidth={1.75}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("company.help.searchPlaceholder")}
          className="h-12 w-full rounded-xl border border-hairline bg-paper pl-10 pr-3.5 text-[14px] text-ink shadow-[0_1px_2px_rgba(10,10,10,0.04)] outline-none transition focus:border-brand-green focus:ring-[3px] focus:ring-brand-green/10"
        />
      </div>

      {groups.length === 0 ? (
        <Block>
          <p>
            <Trans
              i18nKey="company.help.noMatch"
              values={{ query }}
              components={{ 1: <a href="mailto:info@oam-app.com" className="font-medium text-brand-green underline" /> }}
            />
          </p>
        </Block>
      ) : (
        groups.map((group) => (
          <Block key={group.id} heading={t(`company.help.groups.${group.id}.title`)}>
            <div className="-mx-1 divide-y divide-hairline">
              {group.items.map((item) => {
                const id = `${group.id}:${item.id}`;
                const isOpen = open === id;
                return (
                  <div key={id} className="px-1">
                    <button
                      onClick={() => setOpen(isOpen ? null : id)}
                      aria-expanded={isOpen}
                      className="flex w-full items-start justify-between gap-3 py-3.5 text-left"
                    >
                      <span className="text-[14px] font-medium text-ink">{t(`company.help.groups.${group.id}.${item.qKey}`)}</span>
                      <ChevronDown
                        size={17}
                        strokeWidth={2}
                        className={`mt-0.5 shrink-0 text-muted transition-transform duration-200 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {isOpen && <div className="space-y-3 pb-4 pr-6">{ANSWERS[item.id]}</div>}
                  </div>
                );
              })}
            </div>
          </Block>
        ))
      )}

      <Notice tone="info">
        <Trans
          i18nKey="company.help.stillStuck"
          components={{
            1: <a href="mailto:info@oam-app.com" className="font-semibold underline" />,
            2: <Link to="/contact" className="font-semibold underline" />,
          }}
        />
      </Notice>
    </PageShell>
  );
}
