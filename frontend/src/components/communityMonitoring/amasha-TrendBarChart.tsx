import React from "react";
import { View, Text, StyleSheet, useColorScheme } from "react-native";
import Svg, { Rect, Text as SvgText, Line } from "react-native-svg";
import { Colors, Spacing, Typography } from "@/constants/theme";
import { TrendPoint } from "@/types/amasha-chart";

interface Props {
  data: TrendPoint[];
  color: string;
  height?: number;
}

export default function TrendBarChart({ data, color, height = 120 }: Props) {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];

  const width = 300;
  const paddingX = 24;
  const paddingY = 16;
  const maxCount = Math.max(1, ...data.map((d) => d.count));
  const barAreaWidth = width - paddingX * 2;
  const barWidth = (barAreaWidth / data.length) * 0.6;
  const gap = (barAreaWidth / data.length) * 0.4;

  return (
    <View>
      <Svg width={width} height={height}>
        <Line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke={colors.border} strokeWidth={1} />

        {data.map((d, i) => {
          const barHeight = (d.count / maxCount) * (height - paddingY * 2);
          const x = paddingX + i * (barWidth + gap) + gap / 2;
          const y = height - paddingY - barHeight;
          return (
            <React.Fragment key={i}>
              <Rect x={x} y={y} width={barWidth} height={barHeight} rx={3} fill={color} />
              <SvgText x={x + barWidth / 2} y={height - 2} fontSize={9} fill={colors.textMuted} textAnchor="middle">
                {d.label}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
      <Text style={[Typography.caption, { color: colors.textMuted, marginTop: Spacing.half }]}>
        Total: {data.reduce((sum, d) => sum + d.count, 0)} this period
      </Text>
    </View>
  );
}