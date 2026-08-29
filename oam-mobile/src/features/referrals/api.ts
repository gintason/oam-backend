import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "@/shared/api";

export type ReferralCommission = {
  id: number;
  referee_name: string;
  source_transaction_id: string;
  oam_profit_amount: string;
  commission_amount: string;
  created_at: string;
};

export type ReferralDashboard = {
  referral_code: string;
  custom_slug: string;
  link: string;
  total_earnings: string;
  total_referrals_count: number;
  stats: { total_referrals: number; active_referrals: number; total_earned: string };
  wallet_balance: string;
  commission_rate: string;
  profit_threshold: string;
  recent_commissions: ReferralCommission[];
  notifications: string[];
};

export type ReferralProfile = {
  referral_code: string;
  custom_slug: string;
  link: string;
  total_earnings: string;
  total_referrals_count: number;
};

export const referralApi = {
  dashboard: () => api.get<ReferralDashboard>("/referrals/dashboard/").then((r) => r.data),
  /** Create the user's referral profile, or rename its slug. */
  generateLink: (custom_slug?: string) =>
    api.post<ReferralProfile>("/referrals/generate-link/", custom_slug ? { custom_slug } : {}).then((r) => r.data),
};

const REF_KEY = "oam_ref";

/** Stash / retrieve a referral token (e.g. "refer-jane-ab12cd34") for the sign-up flow. */
export const referralStore = {
  set: (token: string) => AsyncStorage.setItem(REF_KEY, token).catch(() => {}),
  take: async (): Promise<string | undefined> => {
    try {
      const v = await AsyncStorage.getItem(REF_KEY);
      if (v) await AsyncStorage.removeItem(REF_KEY);
      return v || undefined;
    } catch {
      return undefined;
    }
  },
};

/** Pull a "refer-<slug>-<code>" token out of an inbound deep link URL. */
export function extractReferralToken(url?: string | null): string | null {
  if (!url) return null;
  const m = url.match(/refer-[A-Za-z0-9-]+/);
  return m ? m[0] : null;
}
