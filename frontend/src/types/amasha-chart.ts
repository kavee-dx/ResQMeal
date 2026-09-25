export interface TrendPoint {
  label: string; // e.g. "Mon", "09/20"
  count: number;
}

export interface TrendSeries {
  name: string;
  color: string;
  data: TrendPoint[];
}