/** BookLink palette — shared across screens. */

/** Pre-auth landing hero (aligned with `themePrimary` in courseTheme). */
export const landingPurple = '#716EFF';
/** Soft blob overlay on `landingPurple` */
export const landingPurpleBlob = 'rgba(45, 32, 120, 0.28)';

export const cascadingWhite = '#fdfcf9';
export const chineseSilver = '#e6e6ea';
export const crunch = '#e8d9b5';
export const dreamland = '#e0ddd4';
export const lead = '#1c1b1a';
export const textSecondary = '#5c5a57';
export const warmHaze = '#8a857c';
/** Inactive tab icons on the dark (lead) pill — must contrast with `lead` */
export const iconOnLead = '#a8a39c';

/** Chat thread (WhatsApp-inspired, still readable with `lead`) */
export const chatWallpaper = '#e8e4df';
export const chatOutgoing = '#d8f1c8';
export const chatIncoming = '#ffffff';
export const chatSendActive = '#2d9f5e';
export const chatComposerBar = '#f3f1ed';

/** Course UI kit — re-exported here for screens that import tokens from `theme/colors`. */
export {
  themeCard,
  themeGreen,
  themeInk,
  themeMuted,
  themeOrange,
  themePageBg,
  themePrimary,
} from './courseTheme';

/** Solid red for destructive actions (e.g. Delete). Use with white/cascadingWhite labels. */
export const themeDanger = '#b3261e';

/** Soft lavender fill for segmented controls, chips, and muted rows. */
export const themeSurfaceMuted = 'rgba(113, 110, 255, 0.09)';

/** Pastel action buttons (owner cards, e.g. wanted post Edit / fulfilled). */
export const pastelLavenderFill = '#F0F2FF';
export const pastelLavenderBorder = '#e4e7f5';
/** Destructive-adjacent but soft (Delete on light rose). */
export const pastelRoseFill = '#FFF0F0';
export const pastelRoseBorder = '#f0e0e0';
export const pastelDangerText = '#802020';
