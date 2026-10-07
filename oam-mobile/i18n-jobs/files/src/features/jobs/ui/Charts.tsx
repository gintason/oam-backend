import { useState } from "react";
import { View, Pressable, type LayoutChangeEvent } from "react-native";
import Svg, { Rect, Line, Text as SvgText } from "react-native-svg";
import { Text } from "@/shared/ui";
import { colors, fonts } from "@/shared/theme";
import { STATUS_LABEL, type ApplicationStatus } from "../api";
import { useTranslation } from "react-i18next";

/**
 * Recruitment charts for mobile, in react-native-svg (already in the app).
 * Single series, one brand hue, hairline grid, tap a bar for its value —
 * matching the web charts.
 */
const HUE = colors.brand.green;

function niceMax(v: number): number {
  if (v <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(v));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => v / s <= 4) ?? pow * 10;
  return Math.ceil(v / step) * step;
}
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const day = (iso: string) => { const d = new Date(iso); return `${d.getDate()} ${MONTHS[d.getMonth()]}`; };

export function ApplicationsChart({ series }: { series: { date: string; applications: number }[] }) {
  const { t: tr } = useTranslation();
  const [w, setW] = useState(300);
  const [sel, setSel] = useState<number | null>(null);
  const h = 150, padL = 26, padB = 20, padT = 8;
  const max = niceMax(Math.max(1, ...series.map((s) => s.applications)));
  const iw = w - padL, ih = h - padB - padT;
  const slot = iw / Math.max(1, series.length);
  const bw = Math.max(2, Math.min(10, slot - 2));
  const y = (v: number) => padT + ih - (v / max) * ih;
  const total = series.reduce((a, b) => a + b.applications, 0);
  const pick = sel != null ? series[sel] : null;

  return (
    <View style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, padding: 14 }}>
      <Text variant="title">{tr("jobs.charts.applications")}</Text>
      <Text variant="caption" color="muted">
        {pick ? tr("jobs.charts.dayApplications", { day: day(pick.date), count: pick.applications }) : tr("jobs.charts.totalInLastDaysTap", { total, days: series.length - 1 })}
      </Text>
      <View style={{ marginTop: 10 }} onLayout={(e: LayoutChangeEvent) => setW(Math.max(200, e.nativeEvent.layout.width))}>
        <Svg width={w} height={h} accessibilityLabel={tr("jobs.charts.applicationsPerDayTotalTotal", { total })}>
          {[0, max / 2, max].map((t) => (
            <Line key={t} x1={padL} x2={w} y1={y(t)} y2={y(t)} stroke={colors.hairline} strokeWidth={1} />
          ))}
          {[0, max / 2, max].map((t) => (
            <SvgText key={`l${t}`} x={padL - 6} y={y(t) + 4} fontSize={10} fill={colors.muted} textAnchor="end" fontFamily={fonts.regular}>{t}</SvgText>
          ))}
          {series.map((s, i) => {
            const x = padL + i * slot + (slot - bw) / 2;
            const top = y(s.applications);
            return (
              <Rect key={s.date} x={x} y={top} width={bw} height={Math.max(0, y(0) - top)} rx={2}
                    fill={HUE} opacity={sel == null || sel === i ? 1 : 0.45} onPress={() => setSel(sel === i ? null : i)} />
            );
          })}
          <SvgText x={padL} y={h - 4} fontSize={10} fill={colors.muted} fontFamily={fonts.regular}>{series[0] ? day(series[0].date) : ""}</SvgText>
          <SvgText x={w} y={h - 4} fontSize={10} fill={colors.muted} textAnchor="end" fontFamily={fonts.regular}>{series.length ? day(series[series.length - 1].date) : ""}</SvgText>
        </Svg>
      </View>
    </View>
  );
}

export function FunnelChart({ funnel }: { funnel: { status: ApplicationStatus; count: number }[] }) {
  const { t: tr } = useTranslation();
  const max = Math.max(1, ...funnel.map((f) => f.count));
  const top = funnel[0]?.count || 0;
  const [sel, setSel] = useState<number | null>(null);
  return (
    <View style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, padding: 14, gap: 10 }}>
      <View>
        <Text variant="title">{tr("jobs.charts.hiringFunnel")}</Text>
        <Text variant="caption" color="muted">
          {sel != null && sel > 0 && funnel[sel - 1].count
            ? tr("jobs.charts.movedOnFrom", { pct: Math.round((100 * funnel[sel].count) / funnel[sel - 1].count), stage: STATUS_LABEL[funnel[sel - 1].status] })
            : tr("jobs.charts.applicationsThatReachedEachStage")}
        </Text>
      </View>
      {funnel.map((f, i) => (
        <Pressable key={f.status} onPress={() => setSel(sel === i ? null : i)} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
                   accessibilityLabel={tr("jobs.charts.stageShare", { stage: STATUS_LABEL[f.status], n: f.count, pct: top ? Math.round((100 * f.count) / top) : 0 })}>
          <Text variant="caption" color="muted" style={{ width: 86 }}>{STATUS_LABEL[f.status]}</Text>
          <View style={{ flex: 1, height: 16 }}>
            <View style={{ height: 16, width: `${Math.max((f.count / max) * 100, f.count ? 3 : 0)}%`, backgroundColor: HUE, borderTopRightRadius: 4, borderBottomRightRadius: 4, opacity: sel == null || sel === i ? 1 : 0.5 }} />
          </View>
          <Text variant="label" style={{ width: 30, textAlign: "right" }}>{f.count}</Text>
        </Pressable>
      ))}
    </View>
  );
}
