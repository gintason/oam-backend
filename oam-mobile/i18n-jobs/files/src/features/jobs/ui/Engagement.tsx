/**
 * Views · likes · comments · share for job posts — mirrors the marketplace.
 *  - <CardEngagement job>              compact row on job cards
 *  - <EngagementBar job onComments>    pill buttons on the job screen
 *  - <JobComments jobId focusKey>      comments list + composer
 * Plain style objects only (NativeWind drops function styles on devices).
 */
import { useEffect, useRef, useState } from "react";
import { View, Pressable, TextInput, ActivityIndicator, Share } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Heart, MessageCircle, Send, Share2, BadgeCheck } from "lucide-react-native";
import { Text } from "@/shared/ui";
import { colors, fonts } from "@/shared/theme";
import { apiErrorMessage } from "@/shared/api";
import { jobsApi, timeAgo, type JobCardData, type JobComment } from "../api";
import { useTranslation } from "react-i18next";
import i18n from "i18next";

type Engageable = Pick<JobCardData, "id" | "title" | "views_count" | "likes_count" | "comments_count" | "liked">
  & { employer?: { company_name?: string } };

const SITE = "https://oam-app.com";

function shareJob(job: Engageable) {
  const text = job.employer?.company_name
    ? i18n.t("jobs.engagement.shareAt", { title: job.title, company: job.employer.company_name })
    : i18n.t("jobs.engagement.share", { title: job.title });
  Share.share({ message: `${text}\n${SITE}/jobs/${job.id}` }).catch(() => {});
}

/** Optimistic like toggle with its own count, so lists don't need refetching. */
function useLike(job: Engageable) {
  const [liked, setLiked] = useState(Boolean(job.liked));
  const [count, setCount] = useState(job.likes_count ?? 0);
  const m = useMutation({
    mutationFn: () => jobsApi.like(job.id),
    onMutate: () => { setLiked((v) => !v); setCount((c) => Math.max(0, c + (liked ? -1 : 1))); },
    onSuccess: (r) => { setLiked(r.liked); setCount(r.likes_count); },
    onError: () => { setLiked(Boolean(job.liked)); setCount(job.likes_count ?? 0); },
  });
  return { liked, count, toggle: () => { if (!m.isPending) m.mutate(); } };
}

export function CardEngagement({ job }: { job: Engageable }) {
  const { t } = useTranslation();
  const like = useLike(job);
  const item = { flexDirection: "row", alignItems: "center", gap: 4 } as const;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginTop: 10, paddingTop: 9, borderTopWidth: 1, borderTopColor: colors.hairline }}>
      <View style={item} accessibilityLabel={t("jobs.engagement.viewCount", { count: job.views_count ?? 0 })}>
        <Eye size={14} color={colors.muted} strokeWidth={1.75} />
        <Text variant="caption" color="muted">{job.views_count ?? 0}</Text>
      </View>
      <Pressable onPress={like.toggle} hitSlop={8} style={item} accessibilityRole="button"
                 accessibilityLabel={like.liked ? t("jobs.engagement.unlike") : t("jobs.engagement.like")} accessibilityState={{ selected: like.liked }}>
        <Heart size={14} color={like.liked ? colors.brand.red : colors.muted} fill={like.liked ? colors.brand.red : "none"} strokeWidth={1.75} />
        <Text variant="caption" color={like.liked ? "red" : "muted"}>{like.count}</Text>
      </Pressable>
      <View style={item} accessibilityLabel={t("jobs.engagement.commentCount", { count: job.comments_count ?? 0 })}>
        <MessageCircle size={14} color={colors.muted} strokeWidth={1.75} />
        <Text variant="caption" color="muted">{job.comments_count ?? 0}</Text>
      </View>
      <Pressable onPress={() => shareJob(job)} hitSlop={8} style={{ marginLeft: "auto", padding: 2 }}
                 accessibilityRole="button" accessibilityLabel={t("jobs.engagement.shareJob")}>
        <Share2 size={15} color={colors.muted} strokeWidth={1.75} />
      </Pressable>
    </View>
  );
}

function Pill({ onPress, active, children, label }: { onPress?: () => void; active?: boolean; children: React.ReactNode; label: string }) {
  return (
    <Pressable onPress={onPress} accessibilityRole={onPress ? "button" : undefined} accessibilityLabel={label}
      style={{
        flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999,
        borderWidth: 1, borderColor: active ? "rgba(227,16,18,0.35)" : colors.hairline,
        backgroundColor: active ? "rgba(227,16,18,0.05)" : onPress ? colors.paper : colors.mist,
      }}>
      {children}
    </Pressable>
  );
}

/** `showShare={false}` where the screen already has its own Share button. */
export function EngagementBar({ job, onComments, showShare = true }: { job: Engageable; onComments: () => void; showShare?: boolean }) {
  const { t } = useTranslation();
  const like = useLike(job);
  const views = job.views_count ?? 0;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
      <Pill label={t("jobs.engagement.viewCount", { count: views })}>
        <Eye size={15} color={colors.muted} />
        <Text variant="caption" color="muted">{t("jobs.engagement.viewCount", { count: views })}</Text>
      </Pill>
      <Pill onPress={like.toggle} active={like.liked} label={like.liked ? t("jobs.engagement.unlike") : t("jobs.engagement.like")}>
        <Heart size={16} color={like.liked ? colors.brand.red : colors.ink} fill={like.liked ? colors.brand.red : "none"} />
        <Text variant="label" color={like.liked ? "red" : "ink"}>{like.count}</Text>
      </Pill>
      <Pill onPress={onComments} label={t("jobs.engagement.comments")}>
        <MessageCircle size={16} color={colors.ink} />
        <Text variant="label">{job.comments_count ?? 0}</Text>
      </Pill>
      {showShare ? (
        <Pill onPress={() => shareJob(job)} label={t("jobs.engagement.shareJob")}>
          <Share2 size={16} color={colors.ink} />
          <Text variant="label">{t("jobs.engagement.share")}</Text>
        </Pill>
      ) : null}
    </View>
  );
}

/** `focusKey` — bump it (e.g. from the comments pill) to focus the composer. */
export function JobComments({ jobId, focusKey = 0 }: { jobId: string; focusKey?: number }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const key = ["jobs", "comments", jobId];
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);
  useEffect(() => { if (focusKey) inputRef.current?.focus(); }, [focusKey]);

  const q = useQuery({ queryKey: key, queryFn: () => jobsApi.comments(jobId) });
  const add = useMutation({
    mutationFn: (body: string) => jobsApi.addComment(jobId, body),
    onSuccess: (c) => {
      setDraft(""); setError(null);
      qc.setQueryData<JobComment[]>(key, (old) => [c, ...(old ?? [])]);
      qc.invalidateQueries({ queryKey: ["jobs"], predicate: (x) => x.queryKey.includes("job") });
    },
    onError: (e) => setError(apiErrorMessage(e, t("jobs.engagement.couldnTPostYourComment"))),
  });
  const submit = () => { const b = draft.trim(); if (b && !add.isPending) add.mutate(b); };
  const rows = q.data ?? [];

  return (
    <View style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, padding: 16 }}>
      <Text variant="title">{t("jobs.engagement.commentsLength", { length: rows.length })}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 }}>
        <TextInput
          ref={inputRef} value={draft} onChangeText={setDraft} maxLength={1000}
          placeholder={t("jobs.engagement.writeAComment")} placeholderTextColor={colors.muted}
          returnKeyType="send" onSubmitEditing={submit} blurOnSubmit={false}
          style={{ flex: 1, height: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.mist,
                   paddingHorizontal: 12, fontFamily: fonts.regular, fontSize: 15, color: colors.ink }}
        />
        <Pressable onPress={submit} disabled={add.isPending || !draft.trim()} accessibilityRole="button" accessibilityLabel={t("jobs.engagement.postComment")}
          style={{ height: 44, width: 44, borderRadius: 12, alignItems: "center", justifyContent: "center",
                   backgroundColor: colors.brand.green, opacity: add.isPending || !draft.trim() ? 0.5 : 1 }}>
          {add.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Send size={18} color="#fff" />}
        </Pressable>
      </View>
      {error ? <Text variant="caption" color="danger" style={{ marginTop: 6 }}>{error}</Text> : null}

      <View style={{ marginTop: 12, gap: 10 }}>
        {rows.map((c) => (
          <View key={c.id} style={{ borderRadius: 12, backgroundColor: colors.mist, paddingHorizontal: 12, paddingVertical: 9 }}>
            <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
              <Text variant="label" style={{ fontSize: 13 }}>{c.user_name}</Text>
              {c.is_employer ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 999, backgroundColor: "rgba(11,115,39,0.10)" }}>
                  <BadgeCheck size={11} color={colors.brand.green} />
                  <Text variant="caption" color="green" style={{ fontSize: 10.5, fontFamily: fonts.bold }}>{t("jobs.engagement.employer")}</Text>
                </View>
              ) : null}
              <Text variant="caption" color="muted">· {timeAgo(c.created_at)}</Text>
            </View>
            <Text variant="body" style={{ marginTop: 3, lineHeight: 20 }}>{c.body}</Text>
          </View>
        ))}
        {q.isLoading ? <ActivityIndicator color={colors.brand.green} /> : null}
        {q.isSuccess && rows.length === 0 ? (
          <Text variant="caption" color="muted">{t("jobs.engagement.noCommentsYetBeThe")}</Text>
        ) : null}
      </View>
    </View>
  );
}
