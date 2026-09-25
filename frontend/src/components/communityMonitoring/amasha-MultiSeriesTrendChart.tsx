import React from "react";
import { View, StyleSheet, useColorScheme } from "react-native";
import Svg, { Polyline, Circle, Line, Text as SvgText } from "react-native-svg";
import { Colors } from "@/constants/theme";
import { TrendSeries } from "@/types/amasha-chart";
import ChartLegend from "./amasha-ChartLegend";

interface Props {
  series: TrendSeries[];
  height?: number;
}

export default function MultiSeriesTrendChart({ series, height = 140 }: Props) {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];

  const width = 300;
  const paddingX = 24;
  const paddingY = 16;

  // Shared y-axis across all series so they're visually comparable —
  // if each line had its own scale, overlaying them would be misleading.
  const maxCount = Math.max(1, ...series.flatMap((s) => s.data.map((d) => d.count)));
  const pointCount = series[0]?.data.length ?? 0;

  function toCoords(data: TrendSeries["data"]) {
    return data.map((d, i) => {
      const x = paddingX + (i / (pointCount - 1 || 1)) * (width - paddingX * 2);
      const y = height - paddingY - (d.count / maxCount) * (height - paddingY * 2);
      return { x, y, ...d };
    });
  }

  return (
    <View>
      <Svg width={width} height={height}>
        <Line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke={colors.border} strokeWidth={1} />

        {series.map((s) => {
          const points = toCoords(s.data);
          const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(" ");
          return (
            <React.Fragment key={s.name}>
              <Polyline points={polylinePoints} fill="none" stroke={s.color} strokeWidth={2} />
              {points.map((p, i) => (
                <Circle key={i} cx={p.x} cy={p.y} r={3} fill={s.color} />
              ))}
            </React.Fragment>
          );
        })}

        {/* X-axis labels taken from the first series — all series share the same date buckets */}
        {series[0] &&
          toCoords(series[0].data).map((p, i) => (
            <SvgText key={`label-${i}`} x={p.x} y={height - 2} fontSize={9} fill={colors.textMuted} textAnchor="middle">
              {p.label}
            </SvgText>
          ))}
      </Svg>
      <ChartLegend series={series} />
    </View>
  );
}

const styles = StyleSheet.create({});