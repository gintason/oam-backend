export type Wallet = { id: string; currency: string; balance: string; updated_at: string };
export type WalletsResponse = { default_currency: string; default_currency_source: string; wallets: Wallet[] };
export type Transaction = {
  id: string; direction: "credit" | "debit" | string; amount: string; currency: string;
  description: string; reference: string; created_at: string;
};

export type WalletTransfer = {
  id: string;
  amount: string;
  currency: string;
  note: string;
  reference: string;
  direction: "in" | "out" | string;
  counterparty: string;
  created_at: string;
};
