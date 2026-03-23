// Dark mode color overrides — matches the HTML mockup's dark mode CSS variables
export const darkColors = {
  // Brand (unchanged)
  primary: '#FF6B35',
  saffron: '#FF6B35',
  navy: '#F1F5F9',
  navyLight: '#CBD5E1',

  // Status (unchanged)
  success: '#059669',
  error: '#DC2626',
  info: '#2563EB',
  warning: '#D97706',

  // Backgrounds
  background: '#0F1419',
  backgroundGray: '#1A2332',
  white: '#1A2332',

  // Text
  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textInverse: '#0F1419',

  // Borders
  border: '#2D3B4E',
  borderLight: '#1E2D3D',

  // Misc
  overlay: 'rgba(0, 0, 0, 0.7)',
  transparent: 'transparent',
  star: '#F59E0B',

  // Issue category colors (unchanged)
  issueCategories: {
    pothole: '#DC2626',
    garbage: '#EA580C',
    streetlight: '#EAB308',
    water_supply: '#2563EB',
    road_damage: '#D97706',
    construction: '#7C3AED',
    drainage: '#0D9488',
    traffic: '#DC2626',
    healthcare: '#16A34A',
    education: '#2563EB',
    public_safety: '#1E293B',
    other: '#6B7280',
  },
} as const;
