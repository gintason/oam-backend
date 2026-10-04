import { Route } from "react-router-dom";
import { RequireAuth } from "./guards";
import SendPackage from "../pages/deliveries/SendPackage";
import MyDeliveries from "../pages/deliveries/MyDeliveries";
import TrackDelivery from "../pages/deliveries/TrackDelivery";
import DeliveryPaymentReturn from "../pages/deliveries/DeliveryPaymentReturn";
import DispatchAdmin from "../pages/admin/DispatchAdmin";

const auth = (el: React.ReactNode) => <RequireAuth>{el}</RequireAuth>;

/**
 * Delivery & Dispatch routes. Rendered inside <Routes> in App.tsx as {deliveriesRoutes}.
 * Static paths are listed before /deliveries/:id so they win.
 */
export const deliveriesRoutes = (
  <>
    <Route path="/deliveries" element={auth(<MyDeliveries />)} />
    <Route path="/deliveries/new" element={auth(<SendPackage />)} />
    <Route path="/deliveries/payment-return" element={auth(<DeliveryPaymentReturn />)} />
    <Route path="/deliveries/:id" element={auth(<TrackDelivery />)} />
    <Route path="/admin/dispatch" element={auth(<DispatchAdmin />)} />
  </>
);
