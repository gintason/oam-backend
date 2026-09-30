import type { AxiosError } from "axios";
import { api } from "@/shared/api";
import { uploadMedia, type PickedMedia } from "@/features/marketplace/api/uploads-api";

/**
 * Jobs & Recruitment API client for the mobile app (backend: /api/v1/jobs/).
 * Mirrors the web client (frontend/src/services/jobs.ts) — same types, same calls.
 *
 * Plan limits come back as HTTP 402 with a machine-readable `code`
 * (job_limit_reached, upgrade_required, candidate_view_limit,
 * featured_limit_reached). `jobsErrorCode()` pulls it out so pages can open
 * the upgrade sheet instead of showing a raw error.
 */

// ---------------------------------------------------------------- enums ---

export type LocationType = "remote" | "hybrid" | "on_site";
export type EmploymentType =
  | "full_time" | "part_time" | "contract" | "temporary" | "internship" | "freelance";
export type ExperienceLevel = "entry" | "mid" | "senior" | "lead" | "executive";
export type SalaryPeriod = "hour" | "day" | "month" | "year";
export type JobStatus =
  | "draft" | "pending_review" | "active" | "paused" | "closed" | "expired" | "rejected";
export type ApplicationStatus =
  | "applied" | "under_review" | "shortlisted" | "interview" | "offer" | "hired"
  | "rejected" | "withdrawn";
export type AlertFrequency = "instant" | "daily" | "weekly";
export type PlanKey = "free" | "premium" | "pro";

export type Choice = { value: string; label: string };

export type JobsMeta = {
  choices: {
    location_types: Choice[];
    employment_types: Choice[];
    experience_levels: Choice[];
    categories: Choice[];
    salary_periods: Choice[];
    application_statuses: Choice[];
    pipeline: ApplicationStatus[];
    alert_frequencies: Choice[];
    orderings: string[];
  };
  pricing: Pricing;
};

// --------------------------------------------------------------- models ---

export type EmployerMini = {
  id: string;
  company_name: string;
  slug: string;
  logo_url: string;
  brand_color: string;
  is_verified: boolean;
};

export type EmployerPublic = EmployerMini & {
  tagline: string;
  description: string;
  industry: string;
  company_size: string;
  website: string;
  headquarters: string;
  country: string;
  cover_url: string;
  active_jobs: number | null;
};

export type Plan = {
  key: PlanKey;
  label: string;
  active_job_limit: number | null;
  job_duration_days: number;
  featured_slots: number;
  candidate_search: boolean;
  candidate_views_per_month: number | null;
  candidate_direct_message: boolean;
  analytics: boolean;
  smart_matching: boolean;
  applications_per_job: number | null;
};

export type Usage = {
  plan: Plan;
  subscription: {
    plan: PlanKey;
    active_plan: PlanKey;
    status: "active" | "cancelled";
    current_period_end: string | null;
  };
  active_jobs: number;
  active_job_limit: number | null;
  job_credits: number;
  featured_in_use: number;
  featured_slots: number;
  candidate_views_used: number;
  candidate_views_per_month: number | null;
};

export type EmployerProfile = {
  id: string;
  company_name: string;
  slug: string;
  tagline: string;
  description: string;
  industry: string;
  company_size: string;
  website: string;
  contact_email: string;
  headquarters: string;
  country: string;
  logo_url: string;
  cover_url: string;
  brand_color: string;
  verification_status: "unverified" | "pending" | "verified" | "rejected";
  is_verified: boolean;
  registration_number: string;
  verification_document_url: string;
  verification_note: string;
  verified_at: string | null;
  subscription_tier: PlanKey;
  created_at: string;
  usage?: Usage;
};

export type Experience = {
  title: string;
  company: string;
  start?: string;
  end?: string;
  current?: boolean;
  description?: string;
};

export type Education = {
  school: string;
  qualification?: string;
  field?: string;
  start?: string;
  end?: string;
};

export type CandidateProfile = {
  id: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  headline: string;
  summary: string;
  cv_url: string;
  cv_filename: string;
  cv_updated_at: string | null;
  photo_url: string;
  skills: string[];
  years_experience: number;
  experience_level: ExperienceLevel | "";
  experience: Experience[];
  education: Education[];
  languages: string[];
  links: Record<string, string>;
  location: string;
  country: string;
  desired_titles: string[];
  desired_categories: string[];
  desired_location_types: LocationType[];
  desired_employment_types: EmploymentType[];
  desired_salary_min: string | null;
  desired_salary_currency: string;
  desired_salary_period: SalaryPeriod;
  willing_to_relocate: boolean;
  open_to_work: boolean;
  is_searchable: boolean;
  completeness: number;
  updated_at: string;
};

export type CandidateCard = {
  id: string;
  display_name: string;
  headline: string;
  photo_url: string;
  skills: string[];
  years_experience: number;
  experience_level: string;
  location: string;
  country: string;
  open_to_work: boolean;
  desired_location_types: string[];
  updated_at: string;
};

export type CandidateFull = CandidateCard & {
  summary: string;
  cv_url: string;
  cv_filename: string;
  experience: Experience[];
  education: Education[];
  languages: string[];
  links: Record<string, string>;
  desired_employment_types: string[];
  email: string | null;
  phone: string | null;
};

export type Salary = {
  min: string | null;
  max: string | null;
  currency: string;
  period: SalaryPeriod;
} | null;

export type MatchDetail = {
  score: number;
  skills: number;
  text: number;
  experience: number;
  preferences: number;
  matched_skills: string[];
  missing_skills: string[];
};

export type JobCardData = {
  id: string;
  slug: string;
  title: string;
  employer: EmployerMini;
  category: string;
  employment_type: EmploymentType;
  experience_level: ExperienceLevel;
  location_type: LocationType;
  location: string;
  country: string;
  salary: Salary;
  skills: string[];
  is_promoted: boolean;
  is_featured: boolean;
  is_boosted: boolean;
  published_at: string | null;
  expires_at: string | null;
  apply_method: "in_app" | "external";
  is_saved: boolean | null;
  has_applied: boolean | null;
  match?: MatchDetail;
  // engagement (optional so older API responses still type-check)
  views_count?: number;
  likes_count?: number;
  comments_count?: number;
  liked?: boolean | null;
};

export type JobComment = {
  id: string;
  body: string;
  user_name: string;
  is_employer: boolean;
  created_at: string;
};

export type ScreeningQuestion = { id: string; question: string; required: boolean };

export type JobDetail = Omit<JobCardData, "employer"> & {
  employer: EmployerPublic;
  description: string;
  responsibilities: string;
  requirements: string;
  benefits: string;
  screening_questions: ScreeningQuestion[];
  min_years_experience: number;
  openings: number;
  external_apply_url: string;
  views_count: number;
  applications_count: number;
  status: JobStatus;
  match: MatchDetail | null;
};

/** What the employer edits and sees about their own listing. */
export type JobOwned = {
  id: string;
  title: string;
  description: string;
  responsibilities: string;
  requirements: string;
  benefits: string;
  skills: string[];
  screening_questions: ScreeningQuestion[];
  category: string;
  employment_type: EmploymentType;
  experience_level: ExperienceLevel;
  min_years_experience: number;
  location_type: LocationType;
  location: string;
  country: string;
  salary_min: string | null;
  salary_max: string | null;
  salary_currency: string;
  salary_period: SalaryPeriod;
  salary_visible: boolean;
  apply_method: "in_app" | "external";
  external_apply_url: string;
  openings: number;
  slug: string;
  status: JobStatus;
  published_at: string | null;
  expires_at: string | null;
  is_featured: boolean;
  featured_until: string | null;
  is_boosted: boolean;
  boosted_until: string | null;
  posted_with_credit: boolean;
  views_count: number;
  applications_count: number;
  is_flagged: boolean;
  moderation_note: string;
  created_at: string;
  updated_at: string;
};

export type JobDraft = Partial<Omit<JobOwned,
  "id" | "slug" | "status" | "published_at" | "expires_at" | "is_featured" | "featured_until"
  | "is_boosted" | "boosted_until" | "posted_with_credit" | "views_count"
  | "applications_count" | "is_flagged" | "moderation_note" | "created_at" | "updated_at">>;

export type StatusEvent = {
  from_status: string;
  to_status: ApplicationStatus;
  note: string;
  created_at: string;
};

export type Answer = { id: string; answer: string };

export type CandidateApplication = {
  id: string;
  job: JobCardData;
  status: ApplicationStatus;
  status_changed_at: string;
  source: string;
  cover_letter: string;
  cv_url: string;
  answers: Answer[];
  expected_salary: string | null;
  match_score: number;
  match_details: MatchDetail | Record<string, never>;
  interview_at: string | null;
  events: StatusEvent[];
  thread_id: string | null;
  created_at: string;
};

export type EmployerApplication = {
  id: string;
  job: { id: string; title: string };
  candidate: CandidateFull | { id: null; display_name: string };
  status: ApplicationStatus;
  status_changed_at: string;
  source: string;
  cover_letter: string | null;
  cv_url: string | null;
  answers: Answer[] | null;
  expected_salary: string | null;
  match_score: number;
  match_details: MatchDetail | null;
  employer_rating: number | null;
  employer_notes: string;
  interview_at: string | null;
  rejection_reason: string;
  viewed_by_employer_at: string | null;
  locked: boolean;
  thread_id: string | null;
  created_at: string;
};

export type PipelineColumn = {
  status: ApplicationStatus;
  label: string;
  count: number;
  results: EmployerApplication[];
};

export type Pipeline = {
  job: { id: string; title: string };
  columns: PipelineColumn[];
  locked_count: number;
};

export type SearchFilters = {
  location_type?: string[];
  employment_type?: string[];
  experience_level?: string[];
  category?: string[];
  country?: string;
  location?: string;
  currency?: string;
  salary_min?: string;
  salary_max?: string;
  max_years?: string;
  skills?: string;
  employer?: string;
  posted_within?: string;
};

export type SavedSearch = {
  id: string;
  name: string;
  query: string;
  filters: SearchFilters;
  alert_enabled: boolean;
  frequency: AlertFrequency;
  notify_push: boolean;
  notify_email: boolean;
  last_alerted_at: string | null;
  created_at: string;
};

export type Attachment = { url: string; name: string; type: string; size: number };

export type JobChatMessage = {
  id: string;
  thread_id: string;
  thread?: string;
  sender_id: string | null;
  sender_name: string;
  kind: "text" | "attachment" | "system";
  body: string;
  attachment_url: string;
  attachment_name: string;
  attachment_type: string;
  attachment_size: number | null;
  client_id: string;
  created_at: string;
  /** client-only: optimistic message not yet confirmed */
  pending?: boolean;
  failed?: boolean;
};

export type ChatThread = {
  id: string;
  employer: EmployerMini;
  candidate: { id: string; display_name: string; headline: string; photo_url: string };
  job: { id: string; title: string } | null;
  application_id: string | null;
  application_status: ApplicationStatus | null;
  my_side: "employer" | "candidate";
  unread: number;
  last_message_at: string;
  last_message_preview: string;
  employer_last_read_at: string | null;
  candidate_last_read_at: string | null;
  is_closed: boolean;
  created_at: string;
};

export type Pricing = {
  supported_currencies: string[];
  period_days: number;
  plans: (Plan & { prices: Record<string, string> })[];
  job_credit: { days: number; prices: Record<string, string> };
  boost: Record<string, Record<string, string>>;
};

export type JobPayment = {
  id: string;
  purpose: "plan" | "job_credit" | "boost";
  plan: string;
  job: string | null;
  job_title: string | null;
  quantity: number;
  days: number;
  amount: string;
  currency: string;
  reference: string;
  provider: string;
  status: "pending" | "paid" | "failed";
  authorization_url: string;
  paid_at: string | null;
  created_at: string;
};

export type EmployerDashboard = {
  jobs: { total: number; active: number; draft: number; expired: number };
  applications: { total: number; last_period?: number; by_status?: Record<ApplicationStatus, number> };
  views?: number;
  series?: { date: string; applications: number }[];
  funnel?: { status: ApplicationStatus; count: number }[];
  avg_days_to_hire?: number | null;
  avg_match_score?: number | null;
  top_jobs?: { id: string; title: string; status: JobStatus; views_count: number;
               applications_count: number; conversion: number }[];
  period_days?: number;
  locked?: boolean;
  usage: Usage;
};

export type JobAnalytics = {
  views: number;
  applications: number;
  conversion: number;
  by_status: Record<ApplicationStatus, number>;
  match_distribution: Record<string, number>;
  saves: number;
};

export type CandidateDashboard = {
  applications: { total: number; by_status: Record<ApplicationStatus, number> };
  saved_jobs: number;
  saved_searches: number;
  profile_completeness: number;
  profile_views_this_month: number;
};

export type Page<T> = { count: number; next: string | null; previous: string | null; results: T[] };

// --------------------------------------------------------------- errors ---

export type JobsErrorCode =
  | "job_limit_reached" | "upgrade_required" | "candidate_view_limit"
  | "featured_limit_reached" | "no_employer_profile" | "cv_required" | "already_applied"
  | "incomplete_listing" | "invalid_transition" | "answers_required" | "unverified"
  | string;

export function jobsErrorCode(err: unknown): JobsErrorCode | undefined {
  const e = err as AxiosError<{ code?: string }>;
  return e?.response?.data?.code;
}

/** Field errors from a JobsError with a dict detail: {detail, errors: {field: msg}}. */
export function jobsFieldErrors(err: unknown): Record<string, string> {
  const e = err as AxiosError<{ errors?: Record<string, string | string[]> } & Record<string, unknown>>;
  const data = e?.response?.data;
  if (!data || typeof data !== "object") return {};
  const src = (data.errors ?? data) as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(src)) {
    if (k === "detail" || k === "code") continue;
    if (typeof v === "string") out[k] = v;
    else if (Array.isArray(v) && typeof v[0] === "string") out[k] = v[0];
  }
  return out;
}

export const UPGRADE_CODES = new Set([
  "job_limit_reached", "upgrade_required", "candidate_view_limit", "featured_limit_reached",
]);

// ------------------------------------------------------------ utilities ---

/** Turn filters into query params (arrays become comma lists, blanks dropped). */
export function toParams(q: string, filters: SearchFilters, extra: Record<string, string | number> = {}) {
  const out: Record<string, string> = {};
  if (q.trim()) out.q = q.trim();
  for (const [k, v] of Object.entries(filters)) {
    if (Array.isArray(v)) { if (v.length) out[k] = v.join(","); }
    else if (v != null && String(v).trim() !== "") out[k] = String(v);
  }
  for (const [k, v] of Object.entries(extra)) out[k] = String(v);
  return out;
}

export type JobsUploadPurpose =
  | "candidate_cv" | "company_logo" | "company_cover" | "company_document" | "job_chat_attachment";

/** Signed direct-to-Cloudinary upload (same pipeline as marketplace photos). Returns the URL. */
export function uploadJobsFile(purpose: JobsUploadPurpose, file: PickedMedia): Promise<string> {
  return uploadMedia(purpose, file);
}

// ------------------------------------------------------------------ API ---

const J = "/jobs";

export const jobsApi = {
  meta: async (): Promise<JobsMeta> => (await api.get(`${J}/meta/`)).data,

  // listings (public)
  search: async (params: Record<string, string>): Promise<Page<JobCardData>> =>
    (await api.get(`${J}/listings/`, { params })).data,
  job: async (id: string): Promise<JobDetail> => (await api.get(`${J}/listings/${id}/`)).data,
  /** Public landing-page feed: Premium/Pro employers' jobs first, then the latest. */
  homeFeed: async (limit = 6): Promise<{ featured: JobCardData[]; latest: JobCardData[]; total_live: number }> =>
    (await api.get(`${J}/listings/home-feed/`, { params: { limit } })).data,
  recommended: async (limit = 12): Promise<{ results: JobCardData[] }> =>
    (await api.get(`${J}/listings/recommended/`, { params: { limit } })).data,
  savedJobs: async (page = 1): Promise<Page<JobCardData>> =>
    (await api.get(`${J}/listings/saved/`, { params: { page } })).data,
  save: async (id: string) => (await api.post(`${J}/listings/${id}/save/`)).data as { saved: boolean },
  unsave: async (id: string) => (await api.delete(`${J}/listings/${id}/save/`)).data as { saved: boolean },
  report: async (id: string, reason: string) =>
    (await api.post(`${J}/listings/${id}/report/`, { reason })).data,
  like: async (id: string) =>
    (await api.post(`${J}/listings/${id}/like/`)).data as { liked: boolean; likes_count: number },
  comments: async (id: string): Promise<JobComment[]> =>
    (await api.get(`${J}/listings/${id}/comments/`)).data,
  addComment: async (id: string, body: string): Promise<JobComment> =>
    (await api.post(`${J}/listings/${id}/comments/`, { body })).data,

  // candidate
  me: async (): Promise<CandidateProfile> => (await api.get(`${J}/candidates/me/`)).data,
  updateMe: async (patch: Partial<CandidateProfile>): Promise<CandidateProfile> =>
    (await api.patch(`${J}/candidates/me/`, patch)).data,
  candidateDashboard: async (): Promise<CandidateDashboard> =>
    (await api.get(`${J}/candidates/me/dashboard/`)).data,

  apply: async (input: { job: string; cover_letter?: string; answers?: Answer[];
                         expected_salary?: string | null }): Promise<CandidateApplication> =>
    (await api.post(`${J}/applications/`, input)).data,
  myApplications: async (status?: string): Promise<Page<CandidateApplication>> =>
    (await api.get(`${J}/applications/`, { params: status ? { status } : {} })).data,
  withdraw: async (id: string): Promise<CandidateApplication> =>
    (await api.post(`${J}/applications/${id}/withdraw/`)).data,

  // saved searches
  savedSearches: async (): Promise<Page<SavedSearch>> => (await api.get(`${J}/saved-searches/`)).data,
  createSavedSearch: async (s: Partial<SavedSearch>): Promise<SavedSearch> =>
    (await api.post(`${J}/saved-searches/`, s)).data,
  updateSavedSearch: async (id: string, s: Partial<SavedSearch>): Promise<SavedSearch> =>
    (await api.patch(`${J}/saved-searches/${id}/`, s)).data,
  deleteSavedSearch: async (id: string) => api.delete(`${J}/saved-searches/${id}/`),

  // employer
  myCompany: async (): Promise<EmployerProfile> => (await api.get(`${J}/employers/me/`)).data,
  createCompany: async (c: Partial<EmployerProfile>): Promise<EmployerProfile> =>
    (await api.post(`${J}/employers/me/`, c)).data,
  updateCompany: async (c: Partial<EmployerProfile>): Promise<EmployerProfile> =>
    (await api.patch(`${J}/employers/me/`, c)).data,
  submitVerification: async (v: { verification_document_url: string; registration_number?: string }) =>
    (await api.post(`${J}/employers/me/verification/`, v)).data as EmployerProfile,
  company: async (slug: string): Promise<EmployerPublic> =>
    (await api.get(`${J}/employers/${slug}/`)).data,

  myJobs: async (status?: string): Promise<Page<JobOwned>> =>
    (await api.get(`${J}/listings/mine/`, { params: status ? { status } : {} })).data,
  ownedJob: async (id: string): Promise<JobOwned> =>
    (await api.get(`${J}/listings/${id}/manage/`)).data,
  createJob: async (d: JobDraft & { publish?: boolean }): Promise<JobOwned> =>
    (await api.post(`${J}/listings/`, d)).data,
  updateJob: async (id: string, d: JobDraft): Promise<JobOwned> =>
    (await api.patch(`${J}/listings/${id}/`, d)).data,
  deleteJob: async (id: string) => api.delete(`${J}/listings/${id}/`),
  jobAction: async (id: string, action: "publish" | "pause" | "resume" | "close" | "renew"):
    Promise<JobOwned> => (await api.post(`${J}/listings/${id}/${action}/`)).data,
  feature: async (id: string, on: boolean): Promise<JobOwned> =>
    (await api.post(`${J}/listings/${id}/feature/`, { on })).data,
  jobAnalytics: async (id: string): Promise<JobAnalytics> =>
    (await api.get(`${J}/listings/${id}/analytics/`)).data,
  matches: async (id: string): Promise<{ results: (CandidateCard & { match: MatchDetail })[] }> =>
    (await api.get(`${J}/listings/${id}/matches/`)).data,

  pipeline: async (jobId: string): Promise<Pipeline> =>
    (await api.get(`${J}/applications/pipeline/`, { params: { job: jobId } })).data,
  application: async (id: string): Promise<EmployerApplication> =>
    (await api.get(`${J}/applications/${id}/`)).data,
  moveApplication: async (id: string, body: { status: ApplicationStatus; note?: string;
                                               interview_at?: string | null;
                                               rejection_reason?: string }) =>
    (await api.post(`${J}/applications/${id}/status/`, body)).data as EmployerApplication,
  bulkMove: async (ids: string[], status: ApplicationStatus) =>
    (await api.post(`${J}/applications/bulk-status/`, { ids, status })).data as
      { updated: string[]; failed: { id: string; detail: string }[] },
  saveNotes: async (id: string, body: { employer_rating?: number | null; employer_notes?: string }) =>
    (await api.patch(`${J}/applications/${id}/notes/`, body)).data as EmployerApplication,

  searchCandidates: async (params: Record<string, string>): Promise<Page<CandidateCard>> =>
    (await api.get(`${J}/candidates/`, { params })).data,
  candidate: async (id: string): Promise<CandidateFull> =>
    (await api.get(`${J}/candidates/${id}/`)).data,

  employerDashboard: async (days = 30): Promise<EmployerDashboard> =>
    (await api.get(`${J}/dashboard/employer/`, { params: { days } })).data,

  // chat
  threads: async (): Promise<Page<ChatThread>> => (await api.get(`${J}/threads/`)).data,
  thread: async (id: string): Promise<ChatThread> => (await api.get(`${J}/threads/${id}/`)).data,
  threadForApplication: async (applicationId: string): Promise<ChatThread> =>
    (await api.post(`${J}/applications/${applicationId}/thread/`)).data,
  directThread: async (candidate: string, body?: string, job?: string): Promise<ChatThread> =>
    (await api.post(`${J}/threads/direct/`, { candidate, body, job })).data,
  messages: async (id: string, before?: string):
    Promise<{ results: JobChatMessage[]; has_more: boolean }> =>
    (await api.get(`${J}/threads/${id}/messages/`, { params: before ? { before } : {} })).data,
  sendMessage: async (id: string, body: { body?: string; attachment?: Attachment; client_id?: string }):
    Promise<JobChatMessage> => (await api.post(`${J}/threads/${id}/messages/`, body)).data,
  markRead: async (id: string) => api.post(`${J}/threads/${id}/read/`),

  // billing
  plans: async (): Promise<Pricing> => (await api.get(`${J}/billing/plans/`)).data,
  subscription: async (): Promise<Usage> => (await api.get(`${J}/billing/subscription/`)).data,
  checkout: async (body: { purpose: "plan" | "job_credit" | "boost"; plan?: string;
                           quantity?: number; days?: number; job?: string; currency?: string }):
    Promise<JobPayment> => (await api.post(`${J}/billing/checkout/`, body)).data,
  verifyPayment: async (reference: string): Promise<JobPayment & { usage: Usage }> =>
    (await api.post(`${J}/billing/verify/`, { reference })).data,
  payments: async (): Promise<JobPayment[]> => (await api.get(`${J}/billing/payments/`)).data,
};

// ------------------------------------------------------------- display ---

export const STATUS_LABEL: Record<ApplicationStatus, string> = {
  applied: "Applied",
  under_review: "Under review",
  shortlisted: "Shortlisted",
  interview: "Interview",
  offer: "Offer",
  hired: "Hired",
  rejected: "Not selected",
  withdrawn: "Withdrawn",
};

export const JOB_STATUS_LABEL: Record<JobStatus, string> = {
  draft: "Draft",
  pending_review: "In review",
  active: "Live",
  paused: "Paused",
  closed: "Closed",
  expired: "Expired",
  rejected: "Rejected",
};

export const LOCATION_LABEL: Record<LocationType, string> = {
  remote: "Remote", hybrid: "Hybrid", on_site: "On-site",
};

export const EMPLOYMENT_LABEL: Record<EmploymentType, string> = {
  full_time: "Full-time", part_time: "Part-time", contract: "Contract",
  temporary: "Temporary", internship: "Internship", freelance: "Freelance",
};

export const LEVEL_LABEL: Record<ExperienceLevel, string> = {
  entry: "Entry level", mid: "Mid level", senior: "Senior", lead: "Lead / Manager",
  executive: "Executive",
};

const PERIOD_SHORT: Record<SalaryPeriod, string> = { hour: "/hr", day: "/day", month: "/mo", year: "/yr" };
const SYMBOL: Record<string, string> = { NGN: "₦", USD: "$", GBP: "£", EUR: "€" };

function compact(n: number): string {
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}k`;
  return n.toLocaleString();
}

export function formatSalary(s: Salary): string | null {
  if (!s) return null;
  const sym = SYMBOL[s.currency] ?? `${s.currency} `;
  const lo = s.min != null ? Number(s.min) : null;
  const hi = s.max != null ? Number(s.max) : null;
  const range = lo != null && hi != null && lo !== hi
    ? `${sym}${compact(lo)} – ${sym}${compact(hi)}`
    : `${sym}${compact((hi ?? lo) as number)}`;
  return `${range}${PERIOD_SHORT[s.period] ?? ""}`;
}

export function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
