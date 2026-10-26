import { WORLD_AIRPORTS } from "./worldAirports";

export type Airport = { code: string; city: string; country: string; region: string; name?: string };

export const AIRPORT_NAMES: Record<string, string> = {
  // Nigeria (domestic) — the five big ones are listed further down
  QOW: "Sam Mbakwe International",
  BNI: "Benin Airport",
  CBQ: "Margaret Ekpo International",
  QUO: "Victor Attah International",
  ABB: "Asaba International",
  QRW: "Warri Airport (Osubi)",
  KAD: "Kaduna International",
  JOS: "Yakubu Gowon Airport",
  YOL: "Yola Airport",
  MIU: "Maiduguri International",
  SKO: "Sadiq Abubakar III International",
  ILR: "Ilorin International",
  IBA: "Ibadan Airport",
  AKR: "Akure Airport",
  BCU: "Sir Abubakar Tafawa Balewa International",
  GMO: "Gombe Lawanti International",
  DKA: "Umaru Musa Yar'Adua Airport",
  MXJ: "Minna Airport",
  MDI: "Makurdi Airport",
  LOS: "Murtala Muhammed International", ABV: "Nnamdi Azikiwe International", PHC: "Port Harcourt International",
  KAN: "Mallam Aminu Kano International", ENU: "Akanu Ibiam International", ACC: "Kotoka International",
  NBO: "Jomo Kenyatta International", JNB: "O.R. Tambo International", CPT: "Cape Town International",
  CAI: "Cairo International", ADD: "Addis Ababa Bole International", CMN: "Mohammed V International",
  DKR: "Blaise Diagne International", ABJ: "Félix-Houphouët-Boigny International", KGL: "Kigali International",
  DAR: "Julius Nyerere International", LHR: "London Heathrow", LGW: "London Gatwick", MAN: "Manchester Airport",
  CDG: "Paris Charles de Gaulle", FRA: "Frankfurt am Main", MUC: "Munich Airport", AMS: "Amsterdam Schiphol",
  MAD: "Madrid Barajas", BCN: "Barcelona El Prat", FCO: "Rome Fiumicino", MXP: "Milan Malpensa",
  LIS: "Lisbon Humberto Delgado", ZRH: "Zurich Airport", VIE: "Vienna International", IST: "Istanbul Airport",
  ATH: "Athens International", DUB: "Dublin Airport", CPH: "Copenhagen Kastrup", DXB: "Dubai International",
  AUH: "Zayed International", DOH: "Hamad International", JED: "King Abdulaziz International",
  RUH: "King Khalid International", TLV: "Ben Gurion International", AMM: "Queen Alia International",
  JFK: "John F. Kennedy International", EWR: "Newark Liberty International", ATL: "Hartsfield-Jackson Atlanta",
  IAD: "Washington Dulles International", ORD: "Chicago O'Hare International", LAX: "Los Angeles International",
  MIA: "Miami International", IAH: "George Bush Intercontinental", YYZ: "Toronto Pearson International",
  YUL: "Montréal-Trudeau International", YVR: "Vancouver International", MEX: "Mexico City International",
  SIN: "Singapore Changi", HKG: "Hong Kong International", BKK: "Suvarnabhumi Airport", KUL: "Kuala Lumpur International",
  NRT: "Tokyo Narita International", HND: "Tokyo Haneda", ICN: "Incheon International", PEK: "Beijing Capital International",
  PVG: "Shanghai Pudong International", CAN: "Guangzhou Baiyun International", DEL: "Indira Gandhi International",
  BOM: "Chhatrapati Shivaji Maharaj", CGK: "Soekarno-Hatta International", MNL: "Ninoy Aquino International",
  DPS: "Ngurah Rai International", SYD: "Sydney Kingsford Smith", MEL: "Melbourne Airport", AKL: "Auckland Airport",
  GRU: "São Paulo Guarulhos", EZE: "Buenos Aires Ezeiza", BOG: "El Dorado International", LIM: "Jorge Chávez International",
};

export const AIRPORTS: Airport[] = [
  // Nigeria — every airport with scheduled domestic flights
  { code: "LOS", city: "Lagos", country: "Nigeria", region: "Nigeria" },
  { code: "ABV", city: "Abuja", country: "Nigeria", region: "Nigeria" },
  { code: "PHC", city: "Port Harcourt", country: "Nigeria", region: "Nigeria" },
  { code: "KAN", city: "Kano", country: "Nigeria", region: "Nigeria" },
  { code: "ENU", city: "Enugu", country: "Nigeria", region: "Nigeria" },
  { code: "QOW", city: "Owerri", country: "Nigeria", region: "Nigeria" },
  { code: "BNI", city: "Benin City", country: "Nigeria", region: "Nigeria" },
  { code: "CBQ", city: "Calabar", country: "Nigeria", region: "Nigeria" },
  { code: "QUO", city: "Uyo", country: "Nigeria", region: "Nigeria" },
  { code: "ABB", city: "Asaba", country: "Nigeria", region: "Nigeria" },
  { code: "QRW", city: "Warri", country: "Nigeria", region: "Nigeria" },
  { code: "KAD", city: "Kaduna", country: "Nigeria", region: "Nigeria" },
  { code: "JOS", city: "Jos", country: "Nigeria", region: "Nigeria" },
  { code: "YOL", city: "Yola", country: "Nigeria", region: "Nigeria" },
  { code: "MIU", city: "Maiduguri", country: "Nigeria", region: "Nigeria" },
  { code: "SKO", city: "Sokoto", country: "Nigeria", region: "Nigeria" },
  { code: "ILR", city: "Ilorin", country: "Nigeria", region: "Nigeria" },
  { code: "IBA", city: "Ibadan", country: "Nigeria", region: "Nigeria" },
  { code: "AKR", city: "Akure", country: "Nigeria", region: "Nigeria" },
  { code: "BCU", city: "Bauchi", country: "Nigeria", region: "Nigeria" },
  { code: "GMO", city: "Gombe", country: "Nigeria", region: "Nigeria" },
  { code: "DKA", city: "Katsina", country: "Nigeria", region: "Nigeria" },
  { code: "MXJ", city: "Minna", country: "Nigeria", region: "Nigeria" },
  { code: "MDI", city: "Makurdi", country: "Nigeria", region: "Nigeria" },
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
  { code: "DXB", city: "Dubai", country: "UAE", region: "Middle East" },
  { code: "AUH", city: "Abu Dhabi", country: "UAE", region: "Middle East" },
  { code: "DOH", city: "Doha", country: "Qatar", region: "Middle East" },
  { code: "JED", city: "Jeddah", country: "Saudi Arabia", region: "Middle East" },
  { code: "RUH", city: "Riyadh", country: "Saudi Arabia", region: "Middle East" },
  { code: "TLV", city: "Tel Aviv", country: "Israel", region: "Middle East" },
  { code: "AMM", city: "Amman", country: "Jordan", region: "Middle East" },
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
  { code: "SYD", city: "Sydney", country: "Australia", region: "Oceania" },
  { code: "MEL", city: "Melbourne", country: "Australia", region: "Oceania" },
  { code: "AKL", city: "Auckland", country: "New Zealand", region: "Oceania" },
  { code: "GRU", city: "São Paulo", country: "Brazil", region: "South America" },
  { code: "EZE", city: "Buenos Aires", country: "Argentina", region: "South America" },
  { code: "BOG", city: "Bogotá", country: "Colombia", region: "South America" },
  { code: "LIM", city: "Lima", country: "Peru", region: "South America" },
];

export function airportName(code: string, city: string) {
  return AIRPORT_NAMES[code] ?? BY_CODE.get(code)?.name ?? city;
}
export function airportByCode(code: string) {
  return BY_CODE.get(code);
}

/** Every airport with scheduled flights: our curated list first, then the rest of the world. */
export const ALL_AIRPORTS: Airport[] = [
  ...AIRPORTS,
  ...WORLD_AIRPORTS.filter((w) => !AIRPORTS.some((a) => a.code === w.code)),
];
const BY_CODE = new Map(ALL_AIRPORTS.map((a) => [a.code, a]));

const fold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
/** Other names people type for a country. */
const COUNTRY_ALIASES: Record<string, string[]> = {
  USA: ["united states", "america", "us"], UAE: ["united arab emirates", "emirates"], "Türkiye": ["turkey"],
  "United Kingdom": ["uk", "britain", "great britain", "england", "scotland", "wales", "northern ireland"],
  "Democratic Republic of the Congo": ["drc", "congo"], "Republic of the Congo": ["congo"],
  "Côte d'Ivoire": ["ivory coast"], "Czech Republic": ["czechia"], "South Korea": ["korea"],
  Netherlands: ["holland"], Eswatini: ["swaziland"], "Cape Verde": ["cabo verde"], Myanmar: ["burma"],
};
const SEARCH_INDEX = ALL_AIRPORTS.map((a) => ({
  a, code: a.code.toLowerCase(), city: fold(a.city), name: fold(airportName(a.code, a.city)),
  countries: [a.country, ...(COUNTRY_ALIASES[a.country] ?? [])].map(fold),
}));

/** Best matches first: exact code, then city, airport name and country. Accents don't matter. */
export function searchAirports(query: string, limit = 120): Airport[] {
  const q = fold(query.trim());
  if (!q) return [];
  const buckets: Airport[][] = [[], [], [], [], [], []];
  for (const r of SEARCH_INDEX) {
    if (r.code === q) buckets[0].push(r.a);
    else if (r.city === q || r.countries.includes(q)) buckets[1].push(r.a);
    else if (r.city.startsWith(q)) buckets[2].push(r.a);
    else if (r.name.startsWith(q) || r.countries.some((c) => c.startsWith(q))) buckets[3].push(r.a);
    else if (r.city.includes(q) || r.name.includes(q)) buckets[4].push(r.a);
    else if (r.countries.some((c) => c.includes(q))) buckets[5].push(r.a);
  }
  return buckets.flat().slice(0, limit);
}

export function airportLabel(code: string) {
  const a = airportByCode(code);
  return a ? `${a.city} (${a.code})` : code;
}

export const ROUTE_INFO: Record<string, { hours: string; note: string }> = {
  "LOS-LHR": { hours: "~6h 30m", note: "Non-stop with British Airways, Virgin Atlantic and Air Peace" },
  "LOS-DXB": { hours: "~7h 30m", note: "Emirates non-stop; Qatar and Ethiopian connect" },
  "LOS-JFK": { hours: "~11h", note: "Delta and United fly non-stop" },
  "LOS-IST": { hours: "~6h", note: "Turkish Airlines non-stop — a common connecting hub" },
  "LOS-ACC": { hours: "~1h", note: "Short hop, several carriers daily" },
  "LOS-JNB": { hours: "~6h", note: "South African Airways and Air Peace" },
  "LOS-CDG": { hours: "~6h 30m", note: "Air France non-stop" },
  "LOS-ABV": { hours: "~1h 10m", note: "Busiest domestic route in Nigeria" },
  "LOS-PHC": { hours: "~1h 10m", note: "Several daily domestic flights" },
  "LOS-ENU": { hours: "~1h", note: "Several daily domestic flights" },
  "LOS-QOW": { hours: "~1h", note: "Several daily domestic flights" },
  "LOS-KAN": { hours: "~1h 30m", note: "Several daily domestic flights" },
  "LOS-CBQ": { hours: "~1h 15m", note: "Daily domestic flights" },
  "LOS-QUO": { hours: "~1h 10m", note: "Daily domestic flights" },
  "LOS-BNI": { hours: "~45m", note: "Daily domestic flights" },
  "LOS-ABB": { hours: "~55m", note: "Daily domestic flights" },
  "ABV-LOS": { hours: "~1h 10m", note: "Busiest domestic route in Nigeria" },
  "ABV-PHC": { hours: "~1h 10m", note: "Several daily domestic flights" },
  "ABV-KAN": { hours: "~55m", note: "Daily domestic flights" },
  "ABV-ENU": { hours: "~55m", note: "Daily domestic flights" },
  "LHR-JFK": { hours: "~8h", note: "One of the busiest long-haul routes in the world" },
  "LHR-DXB": { hours: "~7h", note: "Emirates and British Airways, multiple daily" },
  "DXB-SIN": { hours: "~7h 30m", note: "Emirates and Singapore Airlines" },
  "SIN-SYD": { hours: "~8h", note: "Singapore Airlines and Qantas" },
  "JFK-LAX": { hours: "~6h", note: "Transcontinental, very frequent" },
  "CDG-JFK": { hours: "~8h", note: "Air France and Delta" },
  "IST-DXB": { hours: "~4h 30m", note: "Turkish and Emirates" },
  "NBO-LHR": { hours: "~8h 30m", note: "Kenya Airways and British Airways" },
  "JNB-LHR": { hours: "~11h", note: "British Airways and Virgin Atlantic" },
};

export const POPULAR_ROUTES: { from: string; to: string; label: string }[] = [
  { from: "LOS", to: "ABV", label: "Lagos → Abuja" },
  { from: "LOS", to: "PHC", label: "Lagos → Port Harcourt" },
  { from: "ABV", to: "LOS", label: "Abuja → Lagos" },
  { from: "LOS", to: "QOW", label: "Lagos → Owerri" },
  { from: "LOS", to: "LHR", label: "Lagos → London" },
  { from: "ABV", to: "DXB", label: "Abuja → Dubai" },
  { from: "LOS", to: "JFK", label: "Lagos → New York" },
  { from: "PHC", to: "YYZ", label: "Port Harcourt → Toronto" },
  { from: "LOS", to: "ACC", label: "Lagos → Accra" },
  { from: "LHR", to: "JFK", label: "London → New York" },
  { from: "DXB", to: "SIN", label: "Dubai → Singapore" },
];

export const CAR_CITIES = [
  "Lagos", "Abuja", "Port Harcourt", "Ibadan", "Kano", "Enugu", "Benin City",
  "Calabar", "Uyo", "Accra", "London", "Dubai", "Johannesburg", "Nairobi",
];

export const HOTEL_DESTINATIONS: Record<string, { city: string; country: string; blurb: string }[]> = {
  Asia: [
    { city: "Tokyo", country: "Japan", blurb: "Business hotels near stations; ryokan for a traditional stay." },
    { city: "Singapore", country: "Singapore", blurb: "Marina Bay for views, Orchard for shopping, Kampong Glam for character." },
    { city: "Bangkok", country: "Thailand", blurb: "Sukhumvit and Silom are best connected by BTS Skytrain." },
    { city: "Bali", country: "Indonesia", blurb: "Seminyak for nightlife, Ubud for rice terraces, Nusa Dua for resorts." },
    { city: "Dubai", country: "UAE", blurb: "Downtown for landmarks, Marina for beach and dining." },
    { city: "Seoul", country: "South Korea", blurb: "Myeongdong for shopping, Hongdae for a younger scene." },
  ],
  Europe: [
    { city: "London", country: "United Kingdom", blurb: "Zones 1–2 keep you close to almost everything." },
    { city: "Paris", country: "France", blurb: "Le Marais and Saint-Germain balance charm with walkability." },
    { city: "Rome", country: "Italy", blurb: "Centro Storico puts the major sites within walking distance." },
    { city: "Barcelona", country: "Spain", blurb: "Eixample is central and calmer than the Gothic Quarter." },
    { city: "Amsterdam", country: "Netherlands", blurb: "Canal Ring for classic views; Jordaan for quieter streets." },
    { city: "Istanbul", country: "Türkiye", blurb: "Sultanahmet for history, Beyoğlu for restaurants and nightlife." },
  ],
  Africa: [
    { city: "Cape Town", country: "South Africa", blurb: "V&A Waterfront for convenience; Camps Bay for the coast." },
    { city: "Nairobi", country: "Kenya", blurb: "Westlands and Kilimani are central for business travellers." },
    { city: "Marrakesh", country: "Morocco", blurb: "Riads in the Medina, resorts in Hivernage." },
    { city: "Lagos", country: "Nigeria", blurb: "Victoria Island and Ikoyi for business; Lekki for newer builds." },
    { city: "Zanzibar", country: "Tanzania", blurb: "Stone Town for culture, Nungwi for beaches." },
    { city: "Cairo", country: "Egypt", blurb: "Giza for pyramid views, Zamalek for a quieter base." },
  ],
  Americas: [
    { city: "New York", country: "USA", blurb: "Midtown for first visits; Brooklyn for value and character." },
    { city: "Toronto", country: "Canada", blurb: "Downtown Core keeps you near transit and the waterfront." },
    { city: "Mexico City", country: "Mexico", blurb: "Roma Norte and Condesa are leafy, walkable and full of cafés." },
    { city: "Miami", country: "USA", blurb: "South Beach for the ocean, Brickell for business." },
    { city: "Rio de Janeiro", country: "Brazil", blurb: "Copacabana and Ipanema for beachfront." },
    { city: "Buenos Aires", country: "Argentina", blurb: "Palermo for restaurants; Recoleta for classic architecture." },
  ],
};

export const KLOOK_LINK = "https://klook.tpk.ro/5WurYtDG";

export function today() {
  return new Date().toISOString().slice(0, 10);
}
