/**
 * E-commerce affiliate partners. Each opens the partner's storefront through
 * our affiliate link. Logos live in /public/partners/<slug>.png (served at
 * /partners/<slug>.png). Alibaba's link is pending approval — leave it blank
 * and the UI shows "coming soon" until you paste the link below.
 */
export type EcommercePartner = {
  slug: string;
  name: string;
  logo: string;
  link: string;
  tagline: string;
  blurb: string;
  accent: string;
  categories: string[];
};

export const ECOMMERCE_PARTNERS: EcommercePartner[] = [
  {
    slug: "amazon", name: "Amazon", logo: "/partners/amazon.png",
    link: "https://amzn.to/45E2QSz",
    tagline: "The everything store", accent: "#FF9900",
    blurb: "Electronics, home, fashion and books with fast, reliable global shipping.",
    categories: ["Electronics", "Home & Kitchen", "Fashion", "Books", "Beauty", "Toys"],
  },
  {
    slug: "temu", name: "Temu", logo: "/partners/temu.png",
    link: "https://temu.to/k/e25zao9jqnd",
    tagline: "Shop like a billionaire", accent: "#FB7701",
    blurb: "Budget-friendly everything — gadgets, fashion, home and more at low prices.",
    categories: ["Fashion", "Home", "Gadgets", "Beauty", "Jewelry", "Outdoor"],
  },
  {
    slug: "alibaba", name: "Alibaba", logo: "/partners/alibaba.png",
    link: "", // TODO: paste the Alibaba affiliate link here once approved
    tagline: "Global wholesale", accent: "#FF6A00",
    blurb: "Source products at wholesale prices directly from verified suppliers.",
    categories: ["Wholesale", "Electronics", "Machinery", "Apparel", "Packaging", "Beauty"],
  },
  {
    slug: "banggood", name: "Banggood", logo: "/partners/banggood.png",
    link: "https://www.banggood.com/Affiliate-products.html?p=LO171678966137202608&custlinkid=5252905",
    tagline: "Gadgets & more", accent: "#E63700",
    blurb: "RC hobbies, electronics, tools and lifestyle products at keen prices.",
    categories: ["Electronics", "RC & Hobbies", "Tools", "Home", "Outdoor", "Automotive"],
  },
  {
    slug: "cj", name: "CJ Dropshipping", logo: "/partners/cj.png",
    link: "https://www.cjdropshipping.com/ouroffers?token=16ef5e98-c05d-49a7-80e3-63d084908bce",
    tagline: "Dropshipping made easy", accent: "#1F6FEB",
    blurb: "Source and dropship trending products worldwide with fulfilment built in.",
    categories: ["Trending", "Electronics", "Fashion", "Home", "Beauty", "Pets"],
  },
  {
    slug: "shein", name: "SHEIN", logo: "/partners/shein.png",
    link: "https://onelink.shein.com/48/5z72gvs4ewkn",
    tagline: "Fashion for less", accent: "#111111",
    blurb: "On-trend clothing, accessories and beauty at prices that are hard to beat.",
    categories: ["Women", "Men", "Kids", "Beauty", "Home", "Accessories"],
  },
  {
    slug: "dhgate", name: "DHgate", logo: "/partners/dhgate.png",
    link: "https://aff.dhgate.com/#/?invitationCode=GxzhVPRu4z",
    tagline: "Wholesale deals", accent: "#FF4400",
    blurb: "Wholesale and retail across every category, shipped worldwide.",
    categories: ["Electronics", "Fashion", "Phones", "Home", "Sports", "Toys"],
  },
];

export const partnerBySlug = (slug: string) => ECOMMERCE_PARTNERS.find((p) => p.slug === slug);
