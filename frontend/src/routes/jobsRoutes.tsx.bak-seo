import { Route } from "react-router-dom";
import { RequireAuth } from "./guards";
import JobsHub from "../pages/jobs/JobsHub";
import JobSearch from "../pages/jobs/JobSearch";
import JobDetail from "../pages/jobs/JobDetail";
import MyApplications from "../pages/jobs/MyApplications";
import SavedAndAlerts from "../pages/jobs/SavedAndAlerts";
import CandidateProfilePage from "../pages/jobs/CandidateProfilePage";
import EmployerDashboard from "../pages/jobs/EmployerDashboard";
import CompanySetup from "../pages/jobs/CompanySetup";
import PostJobWizard from "../pages/jobs/PostJobWizard";
import Pipeline from "../pages/jobs/Pipeline";
import CandidateSearch, { CandidateView } from "../pages/jobs/CandidateSearch";
import Plans from "../pages/jobs/Plans";
import JobsInbox from "../pages/jobs/JobsInbox";
import JobsChat from "../pages/jobs/JobsChat";
import JobsPaymentReturn from "../pages/jobs/JobsPaymentReturn";
import CompanyPage from "../pages/jobs/CompanyPage";

const auth = (el: React.ReactNode) => <RequireAuth>{el}</RequireAuth>;

/**
 * Jobs & Recruitment routes. Rendered inside <Routes> in App.tsx as {jobsRoutes}.
 * Static paths are listed before /jobs/:id so they win.
 */
export const jobsRoutes = (
  <>
    <Route path="/jobs" element={auth(<JobsHub />)} />
    <Route path="/jobs/search" element={auth(<JobSearch />)} />
    <Route path="/jobs/applications" element={auth(<MyApplications />)} />
    <Route path="/jobs/saved" element={auth(<SavedAndAlerts />)} />
    <Route path="/jobs/profile" element={auth(<CandidateProfilePage />)} />
    <Route path="/jobs/messages" element={auth(<JobsInbox />)} />
    <Route path="/jobs/messages/:id" element={auth(<JobsChat />)} />
    <Route path="/jobs/payment-return" element={auth(<JobsPaymentReturn />)} />
    <Route path="/jobs/company/:slug" element={auth(<CompanyPage />)} />
    <Route path="/jobs/employer" element={auth(<EmployerDashboard />)} />
    <Route path="/jobs/employer/company" element={auth(<CompanySetup />)} />
    <Route path="/jobs/employer/post" element={auth(<PostJobWizard />)} />
    <Route path="/jobs/employer/jobs/:id" element={auth(<Pipeline />)} />
    <Route path="/jobs/employer/jobs/:id/edit" element={auth(<PostJobWizard />)} />
    <Route path="/jobs/employer/candidates" element={auth(<CandidateSearch />)} />
    <Route path="/jobs/employer/candidates/:id" element={auth(<CandidateView />)} />
    <Route path="/jobs/employer/plans" element={auth(<Plans />)} />
    <Route path="/jobs/:id" element={auth(<JobDetail />)} />
  </>
);
