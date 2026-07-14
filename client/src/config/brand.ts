/**
 * Social Flow — product branding.
 *
 * This is the *product's* identity (the agency-facing shell). Per-client
 * identity — name and logo — comes from Metricool's brand list at runtime and
 * is rendered by the client switcher; it is never hardcoded here.
 */
export const socialFlowBrand = {
  name: 'Social Flow',
  tagline: 'Social analytics, client by client',
  poweredBy: 'Studio 1947',

  logo: {
    text: 'SOCIAL FLOW',
    subtitle: 'Analytics',
  },

  colors: {
    primary: '#000000',
    secondary: '#FFFFFF',
    accent: '#3B82F6',

    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
  },

  /** Per-network accents, used for tabs and chart series. */
  networks: {
    facebook: { label: 'Facebook', color: '#1877F2' },
    instagram: { label: 'Instagram', color: '#E1306C' },
    youtube: { label: 'YouTube', color: '#FF0000' },
  },

  typography: {
    fontFamily: {
      primary: 'Inter, system-ui, sans-serif',
      heading: 'Inter, system-ui, sans-serif',
      mono: 'monospace',
    },
  },
} as const;

export type NetworkKey = keyof typeof socialFlowBrand.networks;
