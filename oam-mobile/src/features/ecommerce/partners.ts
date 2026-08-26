/**
 * E-commerce affiliate partners for the mobile app.
 *
 * Logos load from oam-mobile/assets/images/ via the static require map below.
 * These 7 PNGs must exist (React Native needs static require() + a real image
 * extension). Rename any "*_logo.ng" file to "*_logo.png" — Metro can't bundle
 * a ".ng" file:
 *   amazon_logo.png  temu_logo.png  alibaba_logo.png  banggood_logo.png
 *   cjaffiliate_logo.png  shein_logo.png  dhgate_logo.png
 *
 * Alibaba's affiliate link is pending approval — leave it "" and the UI shows
 * "coming soon" until you paste the link.
 */
import type { ImageSourcePropType } from "react-native";

export type EcommercePartner = {
  slug: string; name: string; link: string;
  tagline: string; blurb: string; accent: string; categories: string[];
};

export const PARTNER_LOGOS: Record<string, ImageSourcePropType> = {
  amazon: require("../../../assets/images/amazon_logo.png"),
  temu: require("../../../assets/images/temu_logo.png"),
  alibaba: require("../../../assets/images/alibaba_logo.png"),
  banggood: require("../../../assets/images/banggood_logo.png"),
  cj: require("../../../assets/images/cjaffiliate_logo.png"),
  shein: require("../../../assets/images/shein_logo.png"),
  dhgate: require("../../../assets/images/dhgate_logo.png"),
};

export const ECOMMERCE_PARTNERS: EcommercePartner[] = [
  { slug: "amazon", name: "Amazon", link: "https://amzn.to/45E2QSz",
    tagline: "The everything store", accent: "#FF9900",
    blurb: "Electronics, home, fashion and books with fast, reliable global shipping.",
    categories: ["Electronics", "Home & Kitchen", "Fashion", "Books", "Beauty", "Toys"] },
  { slug: "temu", name: "Temu", link: "https://temu.to/k/e25zao9jqnd",
    tagline: "Shop like a billionaire", accent: "#FB7701",
    blurb: "Budget-friendly everything — gadgets, fashion, home and more at low prices.",
    categories: ["Fashion", "Home", "Gadgets", "Beauty", "Jewelry", "Outdoor"] },
  { slug: "alibaba", name: "Alibaba", link: "",
    tagline: "Global wholesale", accent: "#FF6A00",
    blurb: "Source products at wholesale prices directly from verified suppliers.",
    categories: ["Wholesale", "Electronics", "Machinery", "Apparel", "Packaging", "Beauty"] },
  { slug: "banggood", name: "Banggood", link: "https://www.banggood.com/Affiliate-products.html?p=LO171678966137202608&custlinkid=5252905",
    tagline: "Gadgets & more", accent: "#E63700",
    blurb: "RC hobbies, electronics, tools and lifestyle products at keen prices.",
    categories: ["Electronics", "RC & Hobbies", "Tools", "Home", "Outdoor", "Automotive"] },
  { slug: "cj", name: "CJ Dropshipping", link: "https://www.cjdropshipping.com/ouroffers?token=16ef5e98-c05d-49a7-80e3-63d084908bce",
    tagline: "Dropshipping made easy", accent: "#1F6FEB",
    blurb: "Source and dropship trending products worldwide with fulfilment built in.",
    categories: ["Trending", "Electronics", "Fashion", "Home", "Beauty", "Pets"] },
  { slug: "shein", name: "SHEIN", link: "https://onelink.shein.com/48/5z72gvs4ewkn",
    tagline: "Fashion for less", accent: "#111111",
    blurb: "On-trend clothing, accessories and beauty at prices that are hard to beat.",
    categories: ["Women", "Men", "Kids", "Beauty", "Home", "Accessories"] },
  { slug: "dhgate", name: "DHgate", link: "https://aff.dhgate.com/#/?invitationCode=GxzhVPRu4z",
    tagline: "Wholesale deals", accent: "#FF4400",
    blurb: "Wholesale and retail across every category, shipped worldwide.",
    categories: ["Electronics", "Fashion", "Phones", "Home", "Sports", "Toys"] },
];

export const partnerBySlug = (slug: string) => ECOMMERCE_PARTNERS.find((p) => p.slug === slug);
