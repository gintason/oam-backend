import { useEffect, useRef, useState } from "react";
import {
  Car, CarFront, Laptop, Home, Sofa, Shirt, Smartphone, Monitor,
  WashingMachine, Package, Sparkles, Watch, Wrench, ChevronLeft, ChevronRight,
} from "lucide-react";

/**
 * Horizontal category tabs, shared by the landing page and the in-app browse
 * screen so the two never drift apart.
 *
 * On a phone this is a snap-scrolling row; the edge fades and arrow buttons
 * exist because a plain overflow row gives no hint that more categories are
 * off-screen — people simply don't find them. The arrows only render when
 * there's actually somewhere to scroll.
 */

/** Slug -> icon. Falls back to a parcel for anything unrecognised. */
const ICONS: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>> = {
  "oam-motors": Sparkles,
  "o-a-m-motors": Sparkles,
  automobiles: Car,
  automobile: Car,
  cars: CarFront,
  electronics: Laptop,
  "real-estate": Home,
  property: Home,
  furniture: Sofa,
  fashion: Shirt,
  clothes: Shirt,
  accessories: Watch,
  equipment: Wrench,
  equipments: Wrench,
  phones: Smartphone,
  computers: Monitor,
  "household-appliances": WashingMachine,
  others: Package,
};

export type TabItem = { label: string; slug: string };

export default function CategoryTabs({
  tabs,
  activeSlug,
  onSelect,
  ariaLabel = "Categories",
}: {
  tabs: TabItem[];
  activeSlug: string;
  onSelect: (slug: string) => void;
  ariaLabel?: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  function measure() {
    const el = scroller.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }

  useEffect(() => {
    measure();
    const el = scroller.current;
    if (!el) return;
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [tabs.length]);

  // Keep the selected tab in view when it changes from outside (e.g. a filter reset).
  useEffect(() => {
    const el = scroller.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    el?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }, [activeSlug]);

  const fadeMask =
    atStart && atEnd
      ? "none"
      : atStart
      ? "linear-gradient(to right, #000 85%, transparent 100%)"
      : atEnd
      ? "linear-gradient(to right, transparent 0%, #000 15%)"
      : "linear-gradient(to right, transparent 0%, #000 15%, #000 85%, transparent 100%)";

  function nudge(direction: -1 | 1) {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: direction * Math.max(180, el.clientWidth * 0.7), behavior: "smooth" });
  }

  return (
    <div className="relative">
      {!atStart && (
        <button
          type="button"
          onClick={() => nudge(-1)}
          aria-label="Scroll categories left"
          className="absolute -left-1 top-1/2 z-20 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-hairline bg-paper text-ink shadow-sm transition hover:bg-mist sm:flex"
        >
          <ChevronLeft size={16} strokeWidth={2} />
        </button>
      )}
      {!atEnd && (
        <button
          type="button"
          onClick={() => nudge(1)}
          aria-label="Scroll categories right"
          className="absolute -right-1 top-1/2 z-20 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-hairline bg-paper text-ink shadow-sm transition hover:bg-mist sm:flex"
        >
          <ChevronRight size={16} strokeWidth={2} />
        </button>
      )}

      <div
        ref={scroller}
        onScroll={measure}
        role="tablist"
        aria-label={ariaLabel}
        className="scrollbar-hide flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-smooth py-1"
        style={{
          // Fade whichever edges have more content beyond them, so it's obvious
          // the row scrolls. Masking the row itself keeps this independent of
          // the page background.
          maskImage: fadeMask,
          WebkitMaskImage: fadeMask,
        }}
      >
        {tabs.map((t) => {
          const selected = t.slug === activeSlug;
          const Icon = ICONS[t.slug] ?? Package;
          return (
            <button
              key={t.slug}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onSelect(t.slug)}
              className={`group flex shrink-0 snap-start items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-2 text-[13px] font-medium transition duration-200 sm:px-4 sm:text-sm ${
                selected
                  ? "border border-transparent bg-[#0a0a0a] text-white shadow-[0_4px_14px_rgba(11,115,39,0.28)]"
                  : "border border-brand-green/[0.18] bg-[linear-gradient(150deg,rgba(11,115,39,0.14),rgba(17,17,17,0.04))] text-ink hover:-translate-y-0.5 hover:shadow-[0_6px_14px_rgba(11,115,39,0.12)]"
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition ${
                  selected ? "bg-brand-green text-white" : "text-brand-green"
                }`}
              >
                <Icon size={13} strokeWidth={2} />
              </span>
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
