/**
 * Shared inline-style tokens for the demo's custom pickers.
 *
 * The demo styles inline (no Tailwind — see features/demo/CLAUDE.md). This object keeps
 * the palette + key dimensions DRY across Dropdown, Calendar, DateField, TimeWheel, and
 * TimeField. Values match the demo's existing screen styling and the phone app's glass
 * aesthetic (deep navy + primary cyan).
 */
export const T = {
  // surfaces
  bg: '#0d1b2a',
  raised: '#0f2035',
  border: '#1e3a5f',
  borderSoft: 'rgba(30,58,95,0.5)',
  // text
  text: '#f0f4f8',
  textDim: '#cdd9e6',
  textMute: '#99badd',
  textFaint: '#7a9fc4',
  // accents
  primary: '#2B8CC1',
  accentFrom: '#35A0D6',
  accentTo: '#2580AD',
  primarySoft: 'rgba(43,140,193,0.08)',
  primaryEdge: 'rgba(43,140,193,0.25)',
  // glass
  topHighlight: 'rgba(184,212,240,0.25)',
  scrim: 'rgba(4,8,14,0.55)',
  // status
  error: '#ff4757',
  // dimensions
  radius: 12,
  rowH: 44,
} as const
