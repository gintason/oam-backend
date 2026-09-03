import { api } from "../lib/api";

export type Trip = {
  provider_name: string; provider_short_name: string; provider_logo: string;
  trip_id: string; order_id: string; trip_date: string; departure_time: string;
  origin_id: string; destination_id: string; narration: string;
  fare: number; total_seats: number; available_seats: number[];
  departure_terminal: string; destination_terminal: string; vehicle: string; boarding_at: string;
  service_fee_per_seat: number; total_fare_per_seat: number;
};

export type PassengerInput = {
  title?: string; name: string; age?: string; sex?: string; phone?: string;
  email?: string; is_primary?: boolean;
};

export type BusBooking = {
  reference: string; status: string;
  departure_state: string; destination_state: string; trip_date: string;
  narration: string; departure_terminal: string; destination_terminal: string;
  vehicle_no: string; provider: string; seat_numbers: string; total_seats: number;
  amount_per_seat: string; fare_total: string; fee_total: string; total_amount: string;
  currency: string; travu_order_id: string; travu_order_number: string; failure_reason: string;
  passengers: { title: string; name: string; seat_number: string; phone: string }[];
  created_at: string;
};

export const busApi = {
  async states(): Promise<string[]> {
    const { data } = await api.get<{ states: string[] }>("/travu/states/");
    return data.states;
  },
  async trips(input: { departure_state: string; destination_state: string; trip_date: string }) {
    const { data } = await api.post<{ trips: Trip[]; service_fee_per_seat: number }>("/travu/trips/", input);
    return data;
  },
  async book(payload: Record<string, unknown>) {
    const { data } = await api.post<{ booking: BusBooking; authorization_url?: string; reference?: string }>("/travu/book/", payload);
    return data;
  },
  async cardVerify(reference: string) {
    const { data } = await api.post<{ booking: BusBooking }>("/travu/card/verify/", { reference });
    return data.booking;
  },
  async booking(reference: string) {
    const { data } = await api.get<BusBooking>(`/travu/bookings/${reference}/`);
    return data;
  },
};

const KEY = "oam_bus_pay";
export const busPayStore = {
  set: (v: { ref: string; bookingRef: string }) => localStorage.setItem(KEY, JSON.stringify(v)),
  take: (): { ref: string; bookingRef: string } | null => {
    try { const raw = localStorage.getItem(KEY); localStorage.removeItem(KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
  },
};
