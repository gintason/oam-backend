import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { CurrencyProvider } from "./currency/CurrencyContext";
import { AuthProvider } from "./auth/AuthContext";
import { RequireAuth, RedirectIfAuthed } from "./routes/guards";

import LandingPage from "./LandingPage";
import SignIn from "./pages/auth/SignIn";
import SignUp from "./pages/auth/SignUp";
import Referral from "./pages/Referral";
import { ReferralCapture } from "./routes/ReferralCapture";
import VerifyOtp from "./pages/auth/VerifyOtp";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Wallet from "./pages/Wallet";
import Earnings from "./pages/Earnings";
import Orders from "./pages/Orders";
import Inbox from "./pages/messages/Inbox";
import Chat from "./pages/messages/Chat";
import ArtisansHub from "./pages/artisans/ArtisansHub";
import FindArtisans from "./pages/artisans/FindArtisans";
import ArtisanProfile from "./pages/artisans/ArtisanProfile";
import ArtisanDashboard from "./pages/artisans/ArtisanDashboard";
import ArtisanVerify from "./pages/artisans/ArtisanVerify";
import MarketplaceHub from "./pages/marketplace/MarketplaceHub";
import BrowseListings from "./pages/marketplace/BrowseListings";
import ListingDetail from "./pages/marketplace/ListingDetail";
import SellDashboard from "./pages/marketplace/SellDashboard";
import PostListing from "./pages/marketplace/PostListing";
import MotorsAdmin from "./pages/admin/MotorsAdmin";
import About from "./pages/company/About";
import Contact from "./pages/company/Contact";
import Help from "./pages/company/Help";
import Terms from "./pages/company/Terms";
import Privacy from "./pages/company/Privacy";
import Travel from "./pages/travel/Travel";
import Flights from "./pages/travel/Flights";
import CarHire from "./pages/travel/CarHire";
import Pickup from "./pages/travel/Pickup";
import Hotels from "./pages/travel/Hotels";
import GiftCards from "./pages/services/GiftCards";
import Ecommerce from "./pages/services/Ecommerce";
import EcommerceCompany from "./pages/services/EcommerceCompany";
import BuyAirtime from "./pages/services/BuyAirtime";
import BuyElectricity from "./pages/services/BuyElectricity";
import BuyBetting from "./pages/services/BuyBetting";
import BuyData from "./pages/services/BuyData";
import BuyCable from "./pages/services/BuyCable"
import FundWallet from "./pages/services/FundWallet";
import Withdraw from "./pages/services/Withdraw";
import Transfer from "./pages/services/Transfer";
import BusTickets from "./pages/services/BusTickets";
import FundCallback from "./pages/services/FundCallback";
import ServiceCallback from "./pages/services/ServiceCallback";
import PaymentCallback from "./pages/services/PaymentCallback";
import FlutterwaveCallback from "./pages/services/FlutterwaveCallback";
import Profile from "./pages/Profile";

/**
 * App root: global providers + routes.
 *  Public:    /              (landing)
 *  Auth-only: /sign-in /sign-up  (redirect to /dashboard if already authed)
 *  /verify:   OTP screen (reached from sign-up / unverified sign-in)
 *  Protected: /dashboard     (requires a logged-in user)
 */
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CurrencyProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/:refToken" element={<ReferralCapture />} />

              <Route
                path="/sign-in"
                element={
                  <RedirectIfAuthed>
                    <SignIn />
                  </RedirectIfAuthed>
                }
              />
              <Route
                path="/sign-up"
                element={
                  <RedirectIfAuthed>
                    <SignUp />
                  </RedirectIfAuthed>
                }
              />
              <Route path="/verify" element={<VerifyOtp />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              <Route
                path="/dashboard"
                element={
                  <RequireAuth>
                    <Dashboard />
                  </RequireAuth>
                }
              />

              {/* Public company pages — deliberately outside RequireAuth */}

              <Route path="/about" element={<About />} />

              <Route path="/contact" element={<Contact />} />

              <Route path="/help" element={<Help />} />

              <Route path="/terms" element={<Terms />} />

              <Route path="/privacy" element={<Privacy />} />
              <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />

              <Route path="/marketplace" element={<RequireAuth><MarketplaceHub /></RequireAuth>} />
              <Route path="/marketplace/browse" element={<RequireAuth><BrowseListings /></RequireAuth>} />
              <Route path="/marketplace/sell" element={<RequireAuth><SellDashboard /></RequireAuth>} />
              <Route path="/marketplace/post" element={<RequireAuth><PostListing /></RequireAuth>} />
              <Route path="/admin/motors" element={<RequireAuth><MotorsAdmin /></RequireAuth>} />
              <Route path="/marketplace/:id" element={<RequireAuth><ListingDetail /></RequireAuth>} />
              {/* Services — airtime is live; the rest are placeholders for now */}
              <Route path="/services/airtime" element={<RequireAuth><BuyAirtime /></RequireAuth>} />
              <Route path="/payment/callback" element={<RequireAuth><PaymentCallback /></RequireAuth>} />
              <Route path="/payment/flutterwave-callback" element={<RequireAuth><FlutterwaveCallback /></RequireAuth>} />
              <Route path="/services/callback" element={<RequireAuth><ServiceCallback /></RequireAuth>} />
              <Route path="/services/data" element={<RequireAuth><BuyData /></RequireAuth>} />
              <Route path="/services/electricity" element={<RequireAuth><BuyElectricity /></RequireAuth>} />
              <Route path="/services/betting" element={<RequireAuth><BuyBetting /></RequireAuth>} />
              <Route path="/referral" element={<RequireAuth><Referral /></RequireAuth>} />
              <Route path="/services/cable" element={<RequireAuth><BuyCable /></RequireAuth>} />
              <Route path="/services/giftcards" element={<RequireAuth><GiftCards /></RequireAuth>} />
              <Route path="/ecommerce" element={<RequireAuth><Ecommerce /></RequireAuth>} />
              <Route path="/ecommerce/:slug" element={<RequireAuth><EcommerceCompany /></RequireAuth>} />

              {/* Money */}
              <Route path="/wallet/fund" element={<RequireAuth><FundWallet /></RequireAuth>} />
              <Route path="/wallet/fund/callback" element={<RequireAuth><FundCallback /></RequireAuth>} />
              <Route path="/wallet/withdraw" element={<RequireAuth><Withdraw /></RequireAuth>} />
              <Route path="/wallet/send" element={<RequireAuth><Transfer /></RequireAuth>} />
              <Route path="/travel/bus" element={<RequireAuth><BusTickets /></RequireAuth>} />
              <Route path="/wallet" element={<RequireAuth><Wallet /></RequireAuth>} />
              <Route path="/earnings" element={<RequireAuth><Earnings /></RequireAuth>} />
              <Route path="/orders" element={<RequireAuth><Orders /></RequireAuth>} />
              <Route path="/messages" element={<RequireAuth><Inbox /></RequireAuth>} />
              <Route path="/messages/:id" element={<RequireAuth><Chat /></RequireAuth>} />
              <Route path="/wallet/transactions" element={<RequireAuth><Wallet /></RequireAuth>} />

              {/* Travel & more */}
              <Route path="/travel" element={<RequireAuth><Travel /></RequireAuth>} />
              <Route path="/travel/flights" element={<RequireAuth><Flights /></RequireAuth>} />
              <Route path="/travel/hotels" element={<RequireAuth><Hotels /></RequireAuth>} />
              <Route path="/travel/carhire" element={<RequireAuth><CarHire /></RequireAuth>} />
              <Route path="/travel/pickup" element={<RequireAuth><Pickup /></RequireAuth>} />

              {/* Artisans */}
              <Route path="/artisans" element={<RequireAuth><ArtisansHub /></RequireAuth>} />
              <Route path="/artisans/find" element={<RequireAuth><FindArtisans /></RequireAuth>} />
              <Route path="/artisans/me" element={<RequireAuth><ArtisanDashboard /></RequireAuth>} />
              <Route path="/artisans/verify" element={<RequireAuth><ArtisanVerify /></RequireAuth>} />
              <Route path="/artisans/:id" element={<RequireAuth><ArtisanProfile /></RequireAuth>} />

              {/* Fallback: anything unknown goes to the landing page */}
              <Route path="*" element={<LandingPage />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </CurrencyProvider>
    </QueryClientProvider>
  );
}

