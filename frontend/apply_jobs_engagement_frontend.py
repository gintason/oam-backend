#!/usr/bin/env python3
"""
Likes · views · comments · share on job posts (web), mirroring the marketplace.

Run from the frontend folder (the one with package.json), after unzipping
oam-jobs-engagement-frontend.zip there:

    python3 apply_jobs_engagement_frontend.py --check
    python3 apply_jobs_engagement_frontend.py        # backs up as *.bak-engage

Safe to run more than once. Needs the backend update (migration 0003) deployed.
"""
from __future__ import annotations

import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CHECK = "--check" in sys.argv
changed, skipped, problems = [], [], []


def edit(rel: str, pairs: list[tuple[str, str]], done_marker: str) -> None:
    p = ROOT / rel
    if not p.exists():
        problems.append(f"{rel}: not found")
        return
    s = p.read_text(encoding="utf-8")
    if done_marker in s:
        skipped.append(rel)
        return
    new = s
    for old, rep in pairs:
        if old not in new:
            problems.append(f"{rel}: couldn't find: {old.strip().splitlines()[0][:80]}")
            return
        new = new.replace(old, rep, 1)
    changed.append(rel)
    if not CHECK:
        bak = p.with_name(p.name + ".bak-engage")
        if not bak.exists():
            shutil.copy2(p, bak)
        p.write_text(new, encoding="utf-8")


SERVICES = "src/services/jobs.ts"
SERVICES_PAIRS = [
    ('''  is_saved: boolean | null;
  has_applied: boolean | null;
  match?: MatchDetail;
};''', '''  is_saved: boolean | null;
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
};'''),
    ('''  report: async (id: string, reason: string) =>
    (await api.post(`${J}/listings/${id}/report/`, { reason })).data,
''', '''  report: async (id: string, reason: string) =>
    (await api.post(`${J}/listings/${id}/report/`, { reason })).data,
  like: async (id: string) =>
    (await api.post(`${J}/listings/${id}/like/`)).data as { liked: boolean; likes_count: number },
  comments: async (id: string): Promise<JobComment[]> =>
    (await api.get(`${J}/listings/${id}/comments/`)).data,
  addComment: async (id: string, body: string): Promise<JobComment> =>
    (await api.post(`${J}/listings/${id}/comments/`, { body })).data,
'''),
]

CARD = "src/components/jobs/JobCard.tsx"
CARD_PAIRS = [
    ('import { CompanyLogo, MatchBadge } from "./ui";',
     'import { CompanyLogo, MatchBadge } from "./ui";\nimport { CardEngagement } from "./Engagement";'),
    ('''      {job.is_saved !== null && (''',
     '''      <CardEngagement job={job} />

      {job.is_saved !== null && ('''),
]

DETAIL = "src/pages/jobs/JobDetail.tsx"
DETAIL_PAIRS = [
    ('import { useState } from "react";', 'import { useRef, useState } from "react";'),
    ('import { useUserScope } from "../../auth/useUserScope";',
     'import { useUserScope } from "../../auth/useUserScope";\n'
     'import { EngagementBar, JobComments } from "../../components/jobs/Engagement";'),
    ('  const [reportOpen, setReportOpen] = useState(false);\n',
     '  const [reportOpen, setReportOpen] = useState(false);\n'
     '  const commentsRef = useRef<HTMLElement>(null);\n'),
    ('            <div className="mt-3"><ErrorNote>{error}</ErrorNote></div>\n          </header>',
     '            <EngagementBar job={j} showShare={false} onComments={() => commentsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })} />\n'
     '            <div className="mt-3"><ErrorNote>{error}</ErrorNote></div>\n          </header>'),
    ('''          <button onClick={() => setReportOpen(true)} className="inline-flex items-center gap-1.5 text-[12.5px] text-muted hover:text-danger">''',
     '''          <JobComments jobId={j.id} anchorRef={commentsRef} />

          <button onClick={() => setReportOpen(true)} className="inline-flex items-center gap-1.5 text-[12.5px] text-muted hover:text-danger">'''),
]


def main() -> None:
    if not (ROOT / "package.json").exists():
        sys.exit("Run this from the frontend folder (the one with package.json).")
    if not (ROOT / "src/components/jobs/Engagement.tsx").exists():
        sys.exit("Unzip oam-jobs-engagement-frontend.zip here first.")
    edit(SERVICES, SERVICES_PAIRS, "addComment: async")
    edit(CARD, CARD_PAIRS, "<CardEngagement")
    edit(DETAIL, DETAIL_PAIRS, "<JobComments")
    print(("Would change: " if CHECK else "Changed: ") + (", ".join(changed) or "nothing"))
    if skipped:
        print("Already done: " + ", ".join(skipped))
    if problems:
        print("\nNEEDS ATTENTION:")
        for x in problems:
            print("  - " + x)
        sys.exit(2)
    print("\nNext: npm run build")


if __name__ == "__main__":
    main()
