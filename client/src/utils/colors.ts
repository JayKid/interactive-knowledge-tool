const NODE_COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a78bfa', // lighter violet
  '#c084fc', // purple
  '#d946ef', // fuchsia
  '#f472b6', // pink
  '#fb923c', // orange
  '#fbbf24', // amber
  '#34d399', // emerald
  '#22d3ee', // cyan
];

/** Deterministic color from node ID — stable across renders */
export function nodeColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  }
  return NODE_COLORS[Math.abs(hash) % NODE_COLORS.length];
}
