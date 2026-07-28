/**
 * Affiliate travel API — /api/v1/affiliates/.
 *
 * These programs don't sell inventory through OAM. We build a tracked,
 * deep-linked URL to the partner (Aviasales, GetRentacar, Welcome Pickups) so
 * the customer completes the booking there and OAM earns commission.
 */
import { api } from "../lib/api";

export type TravelProgram = {
  slug: string;
  name: string;
  category: string;
  description?: string;
  params?: { key: string; label?: string }[];
};

export type TravelLink = {
  program: string;
  category: string;
  url: string;
  sub_id: string;
  applied_params: Record<string, string>;
  ignored_params: Record<string, string>;
};

export const affiliatesApi = {
  async getPrograms(): Promise<TravelProgram[]> {
    const { data } = await api.get("/affiliates/travel/");
    if (Array.isArray(data)) return data as TravelProgram[];
    return (data.programs ?? data.results ?? []) as TravelProgram[];
  },

  /**
   * Build the tracked partner URL.
   * `params` keys must match what the program accepts — anything else comes
   * back in `ignored_params` so we can tell when a filter didn't carry over.
   */
  async getLink(slug: string, params: Record<string, string | number> = {}): Promise<TravelLink> {
    const clean = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && String(v) !== "")
    );
    const { data } = await api.post<TravelLink>(`/affiliates/travel/${slug}/link/`, { params: clean });
    return data;
  },
};

/* ------------------------------------------------------------------ */
/* Reference data — global, used to make the search forms genuinely     */
/* useful. Factual only: codes, cities, typical durations, carriers.    */
/* ------------------------------------------------------------------ */

export type Airport = { code: string; city: string; country: string; region: string; name?: string };

/** Full airport names, shown in the pickers so a traveller picks the right terminal. */
export const AIRPORT_NAMES: Record<string, string> = {
  LOS: "Murtala Muhammed International", ABV: "Nnamdi Azikiwe International",
  PHC: "Port Harcourt International", KAN: "Mallam Aminu Kano International",
  ENU: "Akanu Ibiam International", ACC: "Kotoka International",
  NBO: "Jomo Kenyatta International", JNB: "O.R. Tambo International",
  CPT: "Cape Town International", CAI: "Cairo International",
  ADD: "Addis Ababa Bole International", CMN: "Mohammed V International",
  DKR: "Blaise Diagne International", ABJ: "Félix-Houphouët-Boigny International",
  KGL: "Kigali International", DAR: "Julius Nyerere International",
  LHR: "London Heathrow", LGW: "London Gatwick", MAN: "Manchester Airport",
  CDG: "Paris Charles de Gaulle", FRA: "Frankfurt am Main", MUC: "Munich Airport",
  AMS: "Amsterdam Schiphol", MAD: "Madrid Barajas", BCN: "Barcelona El Prat",
  FCO: "Rome Fiumicino", MXP: "Milan Malpensa", LIS: "Lisbon Humberto Delgado",
  ZRH: "Zurich Airport", VIE: "Vienna International", IST: "Istanbul Airport",
  ATH: "Athens International", DUB: "Dublin Airport", CPH: "Copenhagen Kastrup",
  DXB: "Dubai International", AUH: "Zayed International", DOH: "Hamad International",
  JED: "King Abdulaziz International", RUH: "King Khalid International",
  TLV: "Ben Gurion International", AMM: "Queen Alia International",
  JFK: "John F. Kennedy International", EWR: "Newark Liberty International",
  ATL: "Hartsfield-Jackson Atlanta", IAD: "Washington Dulles International",
  ORD: "Chicago O'Hare International", LAX: "Los Angeles International",
  MIA: "Miami International", IAH: "George Bush Intercontinental",
  YYZ: "Toronto Pearson International", YUL: "Montréal-Trudeau International",
  YVR: "Vancouver International", MEX: "Mexico City International",
  SIN: "Singapore Changi", HKG: "Hong Kong International",
  BKK: "Suvarnabhumi Airport", KUL: "Kuala Lumpur International",
  NRT: "Tokyo Narita International", HND: "Tokyo Haneda",
  ICN: "Incheon International", PEK: "Beijing Capital International",
  PVG: "Shanghai Pudong International", CAN: "Guangzhou Baiyun International",
  DEL: "Indira Gandhi International", BOM: "Chhatrapati Shivaji Maharaj",
  CGK: "Soekarno-Hatta International", MNL: "Ninoy Aquino International",
  DPS: "Ngurah Rai International", SYD: "Sydney Kingsford Smith",
  MEL: "Melbourne Airport", AKL: "Auckland Airport",
  GRU: "São Paulo Guarulhos", EZE: "Buenos Aires Ezeiza",
  BOG: "El Dorado International", LIM: "Jorge Chávez International",
};

/** Full name if we have one, otherwise the city. */
export function airportName(code: string, city: string) {
  return AIRPORT_NAMES[code] ?? city;
}

/** A working set of major airports across every region. */
export const AIRPORTS: Airport[] = [
  // Africa
  { code: "LOS", city: "Lagos", country: "Nigeria", region: "Africa" },
  { code: "ABV", city: "Abuja", country: "Nigeria", region: "Africa" },
  { code: "PHC", city: "Port Harcourt", country: "Nigeria", region: "Africa" },
  { code: "KAN", city: "Kano", country: "Nigeria", region: "Africa" },
  { code: "ENU", city: "Enugu", country: "Nigeria", region: "Africa" },
  { code: "ACC", city: "Accra", country: "Ghana", region: "Africa" },
  { code: "NBO", city: "Nairobi", country: "Kenya", region: "Africa" },
  { code: "JNB", city: "Johannesburg", country: "South Africa", region: "Africa" },
  { code: "CPT", city: "Cape Town", country: "South Africa", region: "Africa" },
  { code: "CAI", city: "Cairo", country: "Egypt", region: "Africa" },
  { code: "ADD", city: "Addis Ababa", country: "Ethiopia", region: "Africa" },
  { code: "CMN", city: "Casablanca", country: "Morocco", region: "Africa" },
  { code: "DKR", city: "Dakar", country: "Senegal", region: "Africa" },
  { code: "ABJ", city: "Abidjan", country: "Côte d'Ivoire", region: "Africa" },
  { code: "KGL", city: "Kigali", country: "Rwanda", region: "Africa" },
  { code: "DAR", city: "Dar es Salaam", country: "Tanzania", region: "Africa" },
  // Europe
  { code: "LHR", city: "London Heathrow", country: "United Kingdom", region: "Europe" },
  { code: "LGW", city: "London Gatwick", country: "United Kingdom", region: "Europe" },
  { code: "MAN", city: "Manchester", country: "United Kingdom", region: "Europe" },
  { code: "CDG", city: "Paris", country: "France", region: "Europe" },
  { code: "FRA", city: "Frankfurt", country: "Germany", region: "Europe" },
  { code: "MUC", city: "Munich", country: "Germany", region: "Europe" },
  { code: "AMS", city: "Amsterdam", country: "Netherlands", region: "Europe" },
  { code: "MAD", city: "Madrid", country: "Spain", region: "Europe" },
  { code: "BCN", city: "Barcelona", country: "Spain", region: "Europe" },
  { code: "FCO", city: "Rome", country: "Italy", region: "Europe" },
  { code: "MXP", city: "Milan", country: "Italy", region: "Europe" },
  { code: "LIS", city: "Lisbon", country: "Portugal", region: "Europe" },
  { code: "ZRH", city: "Zurich", country: "Switzerland", region: "Europe" },
  { code: "VIE", city: "Vienna", country: "Austria", region: "Europe" },
  { code: "IST", city: "Istanbul", country: "Türkiye", region: "Europe" },
  { code: "ATH", city: "Athens", country: "Greece", region: "Europe" },
  { code: "DUB", city: "Dublin", country: "Ireland", region: "Europe" },
  { code: "CPH", city: "Copenhagen", country: "Denmark", region: "Europe" },
  // Middle East
  { code: "DXB", city: "Dubai", country: "UAE", region: "Middle East" },
  { code: "AUH", city: "Abu Dhabi", country: "UAE", region: "Middle East" },
  { code: "DOH", city: "Doha", country: "Qatar", region: "Middle East" },
  { code: "JED", city: "Jeddah", country: "Saudi Arabia", region: "Middle East" },
  { code: "RUH", city: "Riyadh", country: "Saudi Arabia", region: "Middle East" },
  { code: "TLV", city: "Tel Aviv", country: "Israel", region: "Middle East" },
  { code: "AMM", city: "Amman", country: "Jordan", region: "Middle East" },
  // North America
  { code: "JFK", city: "New York JFK", country: "USA", region: "North America" },
  { code: "EWR", city: "Newark", country: "USA", region: "North America" },
  { code: "ATL", city: "Atlanta", country: "USA", region: "North America" },
  { code: "IAD", city: "Washington Dulles", country: "USA", region: "North America" },
  { code: "ORD", city: "Chicago", country: "USA", region: "North America" },
  { code: "LAX", city: "Los Angeles", country: "USA", region: "North America" },
  { code: "MIA", city: "Miami", country: "USA", region: "North America" },
  { code: "IAH", city: "Houston", country: "USA", region: "North America" },
  { code: "YYZ", city: "Toronto", country: "Canada", region: "North America" },
  { code: "YUL", city: "Montréal", country: "Canada", region: "North America" },
  { code: "YVR", city: "Vancouver", country: "Canada", region: "North America" },
  { code: "MEX", city: "Mexico City", country: "Mexico", region: "North America" },
  // Asia
  { code: "SIN", city: "Singapore", country: "Singapore", region: "Asia" },
  { code: "HKG", city: "Hong Kong", country: "Hong Kong", region: "Asia" },
  { code: "BKK", city: "Bangkok", country: "Thailand", region: "Asia" },
  { code: "KUL", city: "Kuala Lumpur", country: "Malaysia", region: "Asia" },
  { code: "NRT", city: "Tokyo Narita", country: "Japan", region: "Asia" },
  { code: "HND", city: "Tokyo Haneda", country: "Japan", region: "Asia" },
  { code: "ICN", city: "Seoul", country: "South Korea", region: "Asia" },
  { code: "PEK", city: "Beijing", country: "China", region: "Asia" },
  { code: "PVG", city: "Shanghai", country: "China", region: "Asia" },
  { code: "CAN", city: "Guangzhou", country: "China", region: "Asia" },
  { code: "DEL", city: "Delhi", country: "India", region: "Asia" },
  { code: "BOM", city: "Mumbai", country: "India", region: "Asia" },
  { code: "CGK", city: "Jakarta", country: "Indonesia", region: "Asia" },
  { code: "MNL", city: "Manila", country: "Philippines", region: "Asia" },
  { code: "DPS", city: "Bali", country: "Indonesia", region: "Asia" },
  // Oceania & South America
  { code: "SYD", city: "Sydney", country: "Australia", region: "Oceania" },
  { code: "MEL", city: "Melbourne", country: "Australia", region: "Oceania" },
  { code: "AKL", city: "Auckland", country: "New Zealand", region: "Oceania" },
  { code: "GRU", city: "São Paulo", country: "Brazil", region: "South America" },
  { code: "EZE", city: "Buenos Aires", country: "Argentina", region: "South America" },
  { code: "BOG", city: "Bogotá", country: "Colombia", region: "South America" },
  { code: "LIM", city: "Lima", country: "Peru", region: "South America" },
];

export const REGIONS = [
  "Africa", "Europe", "Middle East", "North America", "Asia", "Oceania", "South America",
] as const;

/** Kept for older imports. */
export const NG_AIRPORTS = AIRPORTS.filter((a) => a.country === "Nigeria");

/** Approximate non-stop flight times. Indicative for planning, not exact. */
export const ROUTE_INFO: Record<string, { hours: string; note: string }> = {
  "LOS-LHR": { hours: "~6h 30m", note: "Non-stop with British Airways, Virgin Atlantic and Air Peace" },
  "LOS-DXB": { hours: "~7h 30m", note: "Emirates non-stop; Qatar and Ethiopian connect" },
  "LOS-JFK": { hours: "~11h", note: "Delta and United fly non-stop" },
  "LOS-IST": { hours: "~6h", note: "Turkish Airlines non-stop — a common connecting hub" },
  "LOS-ACC": { hours: "~1h", note: "Short hop, several carriers daily" },
  "LOS-JNB": { hours: "~6h", note: "South African Airways and Air Peace" },
  "LOS-CDG": { hours: "~6h 30m", note: "Air France non-stop" },
  "LOS-ABV": { hours: "~1h 10m", note: "Busiest domestic route in Nigeria" },
  "LHR-JFK": { hours: "~8h", note: "One of the busiest long-haul routes in the world" },
  "LHR-DXB": { hours: "~7h", note: "Emirates and British Airways, multiple daily" },
  "DXB-SIN": { hours: "~7h 30m", note: "Emirates and Singapore Airlines" },
  "SIN-SYD": { hours: "~8h", note: "Singapore Airlines and Qantas" },
  "JFK-LAX": { hours: "~6h", note: "Transcontinental, very frequent" },
  "CDG-JFK": { hours: "~8h", note: "Air France and Delta" },
  "DXB-BKK": { hours: "~6h 30m", note: "Emirates and Thai Airways" },
  "IST-DXB": { hours: "~4h 30m", note: "Turkish and Emirates" },
  "NBO-LHR": { hours: "~8h 30m", note: "Kenya Airways and British Airways" },
  "JNB-LHR": { hours: "~11h", note: "British Airways and Virgin Atlantic" },
};

/** Popular origin-destination pairs, shown as one-tap route shortcuts. */
export const POPULAR_ROUTES: { from: string; to: string; label: string }[] = [
  { from: "LOS", to: "LHR", label: "Lagos → London" },
  { from: "ABV", to: "DXB", label: "Abuja → Dubai" },
  { from: "LOS", to: "JFK", label: "Lagos → New York" },
  { from: "PHC", to: "YYZ", label: "Port Harcourt → Toronto" },
  { from: "LOS", to: "ACC", label: "Lagos → Accra" },
  { from: "LHR", to: "JFK", label: "London → New York" },
  { from: "DXB", to: "SIN", label: "Dubai → Singapore" },
  { from: "LOS", to: "JNB", label: "Lagos → Johannesburg" },
];

/** Popular destination sets by region, for the inspiration grid. */
export const POPULAR_BY_REGION: Record<string, string[]> = {
  Africa: ["ACC", "NBO", "JNB", "CPT", "CAI", "KGL"],
  Europe: ["LHR", "CDG", "AMS", "FCO", "BCN", "IST"],
  "Middle East": ["DXB", "DOH", "AUH", "JED", "RUH", "TLV"],
  "North America": ["JFK", "ATL", "LAX", "YYZ", "MIA", "ORD"],
  Asia: ["SIN", "BKK", "DXB", "HND", "ICN", "DPS"],
  Oceania: ["SYD", "MEL", "AKL"],
  "South America": ["GRU", "EZE", "BOG", "LIM"],
};

/** Kept for older imports. */
export const POPULAR_INTL = AIRPORTS.filter((a) =>
  ["LHR", "DXB", "JFK", "IST", "CDG", "FRA", "ACC", "JNB", "NBO", "CAI", "DOH", "YYZ"].includes(a.code)
).map((a) => ({ code: a.code, city: a.city, country: a.country }));

/* ------------------------------------------------------------------ */
/* Direct affiliate partners (links owned by OAM)                      */
/* ------------------------------------------------------------------ */

/**
 * API base, mirrored from lib/api so we can build server-side redirect links.
 * (Kept in sync with the axios baseURL there.)
 */
const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  "http://127.0.0.1:8080/api/v1";

/**
 * Build a tracked affiliate hand-off that routes through our own backend
 * (`/affiliates/go/<slug>/`) instead of a raw partner short-link. The server
 * records the click and 302-redirects to a clean, globally reachable
 * destination — this is what fixes the `klook.tpk.ro` DNS failures, since we
 * never expose the blocked tpk.ro host to the browser. Optional search params
 * (destination, dates…) are forwarded as query string.
 */
export function affiliateRedirect(
  slug: string,
  params: Record<string, string | number> = {}
): string {
  const qs = new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null && String(v) !== "")
      .map(([k, v]) => [k, String(v)])
  ).toString();
  const base = `${API_BASE.replace(/\/$/, "")}/affiliates/go/${slug}/`;
  return qs ? `${base}?${qs}` : base;
}

/** Klook — hotels, stays and experiences worldwide (via backend redirect). */
export const KLOOK_LINK = affiliateRedirect("klook");

/** G2A — clean reflink, no redirect needed. */
export const G2A_LINK = "https://www.g2a.com/n/reflink-c49af69f49";
