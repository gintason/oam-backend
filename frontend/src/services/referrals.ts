import { api } from "../lib/api";

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
  async dashboard(): Promise<ReferralDashboard> {
    const { data } = await api.get<ReferralDashboard>("/referrals/dashboard/");
    return data;
  },
  /** Create the user's referral profile, or rename its slug. */
  async generateLink(custom_slug?: string): Promise<ReferralProfile> {
    const { data } = await api.post<ReferralProfile>(
      "/referrals/generate-link/",
      custom_slug ? { custom_slug } : {},
    );
    return data;
  },
};

const REF_KEY = "oam_ref";
/** Stash a referral token from a /refer-… link so SignUp can send it. */
export const referralStore = {
  set: (token: string) => { try { localStorage.setItem(REF_KEY, token); } catch { /* ignore */ } },
  take: (): string | undefined => {
    try {
      const v = localStorage.getItem(REF_KEY);
      if (v) localStorage.removeItem(REF_KEY);
      return v || undefined;
    } catch {
      return undefined;
    }
  },
};
