import React from "react";
import { View, Text, StyleSheet, useColorScheme } from "react-native";
import Svg, { Polyline, Circle, Line, Text as SvgText } from "react-native-svg";
import { Colors, Spacing, Typography } from "@/constants/theme";
import { TrendPoint } from "@/utils/amasha-trendMetrics";

interface Props {
  data: TrendPoint[];
  color: string;
  height?: number;
}

export default function TrendLineChart({ data, color, height = 120 }: Props) {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];

  const width = 300;
  const paddingX = 24;
  const paddingY = 16;
  const maxCount = Math.max(1, ...data.map((d) => d.count));

  const points = data.map((d, i) => {
    const x = paddingX + (i / (data.length - 1 || 1)) * (width - paddingX * 2);
    const y = height - paddingY - (d.count / maxCount) * (height - paddingY * 2);
    return { x, y, ...d };
  });

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <View>
      <Svg width={width} height={height}>
        <Line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke={colors.border} strokeWidth={1} />
        <Polyline points={polylinePoints} fill="none" stroke={color} strokeWidth={2} />
        {points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={3} fill={color} />
        ))}
        {points.map((p, i) => (
          <SvgText key={`label-${i}`} x={p.x} y={height - 2} fontSize={9} fill={colors.textMuted} textAnchor="middle">
            {p.label}
          </SvgText>
        ))}
      </Svg>
      <Text style={[Typography.caption, { color: colors.textMuted, marginTop: Spacing.half }]}>
        Peak: {maxCount} in a day
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({});