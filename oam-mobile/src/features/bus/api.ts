import { api } from "@/shared/api";

export type Trip = {
  provider_name: string; provider_short_name: string; provider_logo: string;
  trip_id: string; trip_no: string; trip_date: string; departure_time: string;
  origin_id: string; destination_id: string; narration: string;
  fare: number; total_seats: number; available_seats: number[];
  order_id: string; departure_terminal: string; destination_terminal: string;
  vehicle: string; boarding_at: string;
  service_fee_per_seat: number; total_fare_per_seat: number;
};

export type PassengerInput = {
  title?: string; name: string; age?: string; sex?: string; phone?: string;
  email?: string; blood?: string; next_of_kin?: string; next_of_kin_phone?: string;
  is_primary?: boolean;
};

export type BusBooking = {
  reference: string; status: string;
  departure_state: string; destination_state: string; trip_date: string;
  narration: string; departure_terminal: string; destination_terminal: string;
  vehicle_no: string; provider: string; seat_numbers: string; total_seats: number;
  amount_per_seat: string; fare_total: string; fee_total: string; total_amount: string;
  currency: string; travu_order_id: string; travu_order_number: string;
  failure_reason: string;
  passengers: { title: string; name: string; seat_number: string; phone: string }[];
  created_at: string;
};

export const busApi = {
  states: () => api.get<{ states: string[] }>("/travu/states/").then((r) => r.data.states),
  trips: (input: { departure_state: string; destination_state: string; trip_date: string }) =>
    api.post<{ trips: Trip[]; service_fee_per_seat: number }>("/travu/trips/", input).then((r) => r.data),
  book: (payload: Record<string, unknown>) =>
    api.post<{ booking: BusBooking; authorization_url?: string; reference?: string }>("/travu/book/", payload).then((r) => r.data),
  cardVerify: (reference: string) =>
    api.post<{ booking: BusBooking }>("/travu/card/verify/", { reference }).then((r) => r.data.booking),
  booking: (reference: string) =>
    api.get<BusBooking>(`/travu/bookings/${reference}/`).then((r) => r.data),
};
