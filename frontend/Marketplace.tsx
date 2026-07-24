import { useState } from "react";
import { useCurrency } from "../currency/CurrencyContext";
import { ArrowRight, BadgeCheck, ImageOff, MapPin } from "lucide-react";
import CategoryTabs from "../components/CategoryTabs";

/**
 * Marketplace section with category tabs. Each tab shows the listings posted
 * under that category. Mock data for now — structured so a real API call to
 * /api/v1/marketplace/listings/?category=<slug> drops straight in later.
 *
 * Tab label -> backend category slug(s) it maps to:
 *   O.A.M Motors -> oam-motors        (admin-only official listings)
 *   Automobile   -> automobiles
 *   Electronics  -> electronics
 *   Real Estate  -> real-estate
 *   Furniture    -> furniture
 *   Fashion      -> fashion
 *   Clothes      -> clothes
 *   Accessories  -> accessories
 *   Equipment    -> equipment
 *   Others       -> phones, computers, household-appliances (everything else)
 */

type Listing = {
  id: string;
  title: string;
  priceNGN: number;   // base amount in Naira; displayed via currency switcher
  location: string;
  emoji: string;      // stand-in for a photo (mock); swap for <img> with real data
  verified?: boolean;
  tag?: string;       // optional badge, e.g. "Official"
};

type Tab = { label: string; slug: string; items: Listing[] };

const TABS: Tab[] = [
  {
    label: "O.A.M Motors",
    slug: "oam-motors",
    items: [
      { id: "m1", title: "Toyota Camry 2020 (Official)", priceNGN: 18500000, location: "Abuja", emoji: "🚗", verified: true, tag: "Official" },
      { id: "m2", title: "Mercedes-Benz GLE 2019", priceNGN: 42000000, location: "Lagos", emoji: "🚙", verified: true, tag: "Official" },
      { id: "m3", title: "Lexus RX 350 2021", priceNGN: 55000000, location: "Port Harcourt", emoji: "🚘", verified: true, tag: "Official" },
      { id: "m4", title: "Honda Accord 2018", priceNGN: 14200000, location: "Abuja", emoji: "🚗", verified: true, tag: "Official" },
    ],
  },
  {
    label: "Automobile",
    slug: "automobiles",
    items: [
      { id: "a1", title: "Toyota Corolla 2016", priceNGN: 8900000, location: "Ibadan", emoji: "🚗" },
      { id: "a2", title: "Kia Sportage 2019", priceNGN: 16500000, location: "Lagos", emoji: "🚙" },
      { id: "a3", title: "Innoson G5 SUV", priceNGN: 22000000, location: "Enugu", emoji: "🚘", verified: true },
      { id: "a4", title: "Ford Explorer 2017", priceNGN: 19800000, location: "Abuja", emoji: "🚙" },
    ],
  },
  {
    label: "Electronics",
    slug: "electronics",
    items: [
      { id: "e1", title: "MacBook Pro 14\" M3", priceNGN: 1850000, location: "Lagos", emoji: "💻", verified: true },
      { id: "e2", title: "iPhone 15 Pro Max 256GB", priceNGN: 1320000, location: "Abuja", emoji: "📱" },
      { id: "e3", title: "Samsung 55\" QLED TV", priceNGN: 680000, location: "Kano", emoji: "📺" },
      { id: "e4", title: "Sony PlayStation 5", priceNGN: 720000, location: "Lagos", emoji: "🎮" },
    ],
  },
  {
    label: "Real Estate",
    slug: "real-estate",
    items: [
      { id: "r1", title: "3-Bedroom Flat, Lekki", priceNGN: 85000000, location: "Lagos", emoji: "🏢", verified: true },
      { id: "r2", title: "Detached Duplex, Maitama", priceNGN: 320000000, location: "Abuja", emoji: "🏡", verified: true },
      { id: "r3", title: "Land 1000sqm, Gwarinpa", priceNGN: 45000000, location: "Abuja", emoji: "🏞️" },
      { id: "r4", title: "2-Bedroom Bungalow", priceNGN: 28000000, location: "Ibadan", emoji: "🏠" },
    ],
  },
  {
    label: "Furniture",
    slug: "furniture",
    items: [
      { id: "f1", title: "7-Seater Leather Sofa", priceNGN: 480000, location: "Lagos", emoji: "🛋️" },
      { id: "f2", title: "6-Seater Dining Set", priceNGN: 320000, location: "Abuja", emoji: "🪑" },
      { id: "f3", title: "King Size Bed Frame", priceNGN: 250000, location: "Enugu", emoji: "🛏️" },
      { id: "f4", title: "Office Executive Desk", priceNGN: 180000, location: "Lagos", emoji: "🗄️" },
    ],
  },
  {
    label: "Fashion",
    slug: "fashion",
    items: [
      { id: "s1", title: "Men's Italian Leather Shoes", priceNGN: 45000, location: "Lagos", emoji: "👞" },
      { id: "s2", title: "Designer Handbag", priceNGN: 120000, location: "Abuja", emoji: "👜", verified: true },
      { id: "s3", title: "Ankara Gown (Custom)", priceNGN: 35000, location: "Ibadan", emoji: "👗" },
      { id: "s4", title: "Wristwatch (Automatic)", priceNGN: 95000, location: "Lagos", emoji: "⌚" },
    ],
  },
  {
    label: "Clothes",
    slug: "clothes",
    items: [
      { id: "c1", title: "Men's Senator Kaftan (Navy)", priceNGN: 38000, location: "Kano", emoji: "\u{1F454}" },
      { id: "c2", title: "Ankara Two-Piece Set", priceNGN: 26500, location: "Lagos", emoji: "\u{1F457}" },
      { id: "c3", title: "Children's School Uniforms (Bulk)", priceNGN: 9500, location: "Abuja", emoji: "\u{1F9E5}" },
      { id: "c4", title: "Agbada Three-Piece, Hand-Embroidered", priceNGN: 85000, location: "Ibadan", emoji: "\u{1F45A}", verified: true },
    ],
  },
  {
    label: "Accessories",
    slug: "accessories",
    items: [
      { id: "ac1", title: "Leather Handbag (Genuine)", priceNGN: 45000, location: "Lagos", emoji: "\u{1F45C}" },
      { id: "ac2", title: "Seiko Automatic Watch", priceNGN: 128000, location: "Abuja", emoji: "\u{231A}", verified: true },
      { id: "ac3", title: "Gold-Plated Bridal Jewellery Set", priceNGN: 62000, location: "Enugu", emoji: "\u{1F48D}" },
      { id: "ac4", title: "Ray-Ban Sunglasses", priceNGN: 34000, location: "Port Harcourt", emoji: "\u{1F576}\u{FE0F}" },
    ],
  },
  {
    label: "Equipment",
    slug: "equipment",
    items: [
      { id: "eq1", title: "5.5KVA Generator (Firman)", priceNGN: 420000, location: "Abuja", emoji: "\u{26A1}", verified: true },
      { id: "eq2", title: "Industrial Sewing Machine", priceNGN: 185000, location: "Aba", emoji: "\u{1F9F5}" },
      { id: "eq3", title: "Complete Welding Set", priceNGN: 240000, location: "Kaduna", emoji: "\u{1F527}" },
      { id: "eq4", title: "Commercial Deep Freezer 500L", priceNGN: 395000, location: "Lagos", emoji: "\u{1F9CA}" },
    ],
  },
  {
    label: "Others",
    slug: "others",
    items: [
      { id: "o1", title: "LG Double-Door Fridge", priceNGN: 520000, location: "Abuja", emoji: "🧊" },
      { id: "o2", title: "HP Pavilion Desktop", priceNGN: 410000, location: "Lagos", emoji: "🖥️" },
      { id: "o3", title: "Tecno Spark 20 Pro", priceNGN: 185000, location: "Kano", emoji: "📱" },
      { id: "o4", title: "Industrial Gas Cooker", priceNGN: 140000, location: "Enugu", emoji: "🍳" },
    ],
  },
];

export default function Marketplace() {
  const [active, setActive] = useState(0);
  const tab = TABS[active];

  return (
    <section id="marketplace" className="bg-brand-green/[0.04]">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-6 sm:py-24">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="max-w-2xl">
          <p className="mb-2 text-sm font-medium uppercase tracking-wider text-brand-green">
            Marketplace
          </p>
          <h2 className="font-display text-2xl font-medium text-ink sm:text-3xl lg:text-4xl">
            Buy and sell, all in one place
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted">
            From cars to electronics to real estate — browse listings near you,
            or post your own in a minute.
          </p>
        </div>
        <a
          href="#"
          className="inline-flex shrink-0 items-center gap-2 text-[15px] font-medium text-brand-red transition-all hover:gap-3"
        >
          View all listings
          <ArrowRight size={18} strokeWidth={1.75} />
        </a>
      </div>

      {/* Tabs */}
      <div className="-mx-4 mb-7 px-4 sm:mx-0 sm:px-0">
        <CategoryTabs
          tabs={TABS.map((t) => ({ label: t.label, slug: t.slug }))}
          activeSlug={TABS[active].slug}
          onSelect={(slug) => setActive(Math.max(0, TABS.findIndex((t) => t.slug === slug)))}
          ariaLabel="Marketplace categories"
        />
      </div>

      {/* Items grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {tab.items.map((item) => (
          <ListingCard key={item.id} item={item} />
        ))}
      </div>
      </div>
    </section>
  );
}

function ListingCard({ item }: { item: Listing }) {
  const { format, isConverted } = useCurrency();
  return (
    <a
      href="#"
      className="group overflow-hidden rounded-2xl border border-hairline bg-paper transition hover:-translate-y-0.5 hover:border-ink/20 hover:shadow-sm"
    >
      {/* Image stand-in (mock). With real data, replace with <img src={item.image} /> */}
      <div className="relative flex h-32 items-center justify-center bg-mist text-4xl sm:h-36">
        <span aria-hidden="true">{item.emoji}</span>
        {item.tag && (
          <span className="absolute left-2.5 top-2.5 rounded-full bg-brand-green px-2.5 py-0.5 text-[11px] font-medium text-white">
            {item.tag}
          </span>
        )}
      </div>
      <div className="p-3.5">
        <h3 className="line-clamp-1 text-[14px] font-medium text-ink">{item.title}</h3>
        <div className="mt-1 tabular text-[15px] font-semibold text-brand-green">
          {isConverted && <span className="text-muted">≈ </span>}
          {format(item.priceNGN)}
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="flex items-center gap-1 text-[12px] text-muted">
            <MapPin size={13} strokeWidth={1.75} />
            {item.location}
          </span>
          {item.verified && (
            <BadgeCheck size={15} strokeWidth={1.75} className="text-brand-green" />
          )}
        </div>
      </div>
    </a>
  );
}
