// Central icon config — "Mission Control Enterprise" aesthetic
// All icons: 20px, 1.75px stroke, #D1D5DB default, rounded caps
// Visual language: Vercel · Linear · Datadog · Grafana · GitHub

export const ICON_PROPS = {
  size: 20,
  strokeWidth: 1.75,
  color: '#D1D5DB',
} as const;

export const ICON_PROPS_SM = {
  size: 16,
  strokeWidth: 1.75,
  color: '#D1D5DB',
} as const;

export const ICON_PROPS_LG = {
  size: 24,
  strokeWidth: 1.75,
  color: '#D1D5DB',
} as const;

// Accent-coloured icon props
export const ICON_ACCENT   = { ...ICON_PROPS, color: '#0078FF' } as const;
export const ICON_SUCCESS  = { ...ICON_PROPS, color: '#10B981' } as const;
export const ICON_DANGER   = { ...ICON_PROPS, color: '#EF4444' } as const;
export const ICON_WARNING  = { ...ICON_PROPS, color: '#F59E0B' } as const;
export const ICON_MUTED    = { ...ICON_PROPS, color: '#4A5A7A' } as const;
