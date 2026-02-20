const DEPTH_COLORS = [
  '#6366f1', // 0 - root (indigo)
  '#8b5cf6', // 1 - violet
  '#a78bfa', // 2 - lighter violet
  '#c084fc', // 3 - purple
  '#d946ef', // 4 - fuchsia
  '#f472b6', // 5 - pink
  '#fb923c', // 6 - orange
  '#fbbf24', // 7 - amber
  '#34d399', // 8 - emerald
  '#22d3ee', // 9+ - cyan
];

export function depthToColor(depth: number): string {
  return DEPTH_COLORS[Math.min(depth, DEPTH_COLORS.length - 1)];
}
