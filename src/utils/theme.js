// Système de design — refonte iOS-like, indigo en couleur d'accent.
// Les anciens tokens (bg, bgPrimary, border, text, etc.) sont préservés pour les
// composants pas encore migrés. Les nouveaux tokens (pageBg, surface, accent…)
// sont la cible.

export const theme = {
  light: {
    // ── Tokens legacy (compat) ──
    bg: 'from-gray-50 to-gray-100',
    bgPrimary: 'bg-white',
    border: 'border-gray-200',
    text: 'text-gray-900',
    textSecondary: 'text-gray-500',
    headerBg: 'bg-white',
    headerBorder: 'border-gray-200',
    input: 'bg-white border-gray-300 text-gray-900',

    // ── Nouveau design system ──
    // Surfaces
    pageBg: 'bg-gray-50',
    surface: 'bg-white',
    surfaceModal: 'bg-gray-50',
    surfaceElevated: 'bg-white',
    surfaceMuted: 'bg-gray-100',
    surfaceInset: 'bg-white',
    surfaceBlur: 'bg-white/75 backdrop-blur-xl',
    overlay: 'bg-black/30 backdrop-blur-sm',

    // Texte
    textTertiary: 'text-gray-400',
    textOnAccent: 'text-white',

    // Divisions
    divider: 'border-gray-200/80',
    hairline: 'border-gray-200',

    // Accent (indigo)
    accent: 'text-indigo-500',
    accentBg: 'bg-indigo-500',
    accentBgHover: 'hover:bg-indigo-600',
    accentSoftBg: 'bg-indigo-50',
    accentSoftText: 'text-indigo-600',
    accentRing: 'ring-indigo-500/30',

    // États sémantiques
    danger: 'text-red-500',
    dangerBg: 'bg-red-500',
    dangerSoftBg: 'bg-red-50',
    dangerSoftText: 'text-red-600',

    success: 'text-emerald-500',
    successBg: 'bg-emerald-500',
    successSoftBg: 'bg-emerald-50',
    successSoftText: 'text-emerald-600',

    warning: 'text-amber-500',
    warningBg: 'bg-amber-500',
    warningSoftBg: 'bg-amber-50',
    warningSoftText: 'text-amber-700',

    // Inputs nouveaux (style "filled" iOS)
    inputSoft: 'bg-gray-100 border-transparent text-gray-900 placeholder-gray-400',
    clearBg: 'bg-gray-400 text-gray-100',
    clearBgOnWhite: 'bg-gray-400 text-white',
    clearIcon: 'text-gray-400',
    clearIconOnWhite: 'text-gray-300',

    // Pictos colorés (pour les "stat tiles" — fond pastel + texte coloré)
    iconTileBlue: 'bg-blue-50 text-blue-500',
    iconTileIndigo: 'bg-indigo-50 text-indigo-500',
    iconTileEmerald: 'bg-emerald-50 text-emerald-600',
    iconTileAmber: 'bg-amber-50 text-amber-600',
    iconTileRed: 'bg-red-50 text-red-500',
    iconTilePurple: 'bg-purple-50 text-purple-500',
  },
  dark: {
    // ── Tokens legacy (compat) ──
    bg: 'from-zinc-900 to-zinc-950',
    bgPrimary: 'bg-zinc-900',
    border: 'border-zinc-800',
    text: 'text-white',
    textSecondary: 'text-zinc-400',
    headerBg: 'bg-zinc-900',
    headerBorder: 'border-zinc-800',
    input: 'bg-zinc-800 border-zinc-700 text-white',

    // ── Nouveau design system ──
    pageBg: 'bg-black',
    surface: 'bg-zinc-900',
    surfaceModal: 'bg-zinc-900',
    surfaceElevated: 'bg-zinc-800',
    surfaceMuted: 'bg-zinc-800/60',
    surfaceInset: 'bg-zinc-850',
    surfaceBlur: 'bg-black/70 backdrop-blur-xl',
    overlay: 'bg-black/60 backdrop-blur-sm',

    textTertiary: 'text-zinc-500',
    textOnAccent: 'text-white',

    divider: 'border-zinc-800/80',
    hairline: 'border-zinc-800',

    accent: 'text-indigo-400',
    accentBg: 'bg-indigo-500',
    accentBgHover: 'hover:bg-indigo-400',
    accentSoftBg: 'bg-indigo-500/15',
    accentSoftText: 'text-indigo-300',
    accentRing: 'ring-indigo-400/40',

    danger: 'text-red-400',
    dangerBg: 'bg-red-500',
    dangerSoftBg: 'bg-red-500/15',
    dangerSoftText: 'text-red-300',

    success: 'text-emerald-400',
    successBg: 'bg-emerald-500',
    successSoftBg: 'bg-emerald-500/15',
    successSoftText: 'text-emerald-300',

    warning: 'text-amber-400',
    warningBg: 'bg-amber-500',
    warningSoftBg: 'bg-amber-500/15',
    warningSoftText: 'text-amber-300',

    inputSoft: 'bg-zinc-800 border-transparent text-white placeholder-zinc-500',
    clearBg: 'bg-zinc-600 text-zinc-900',
    clearBgOnWhite: 'bg-zinc-600 text-zinc-900',
    clearIcon: 'text-zinc-600',
    clearIconOnWhite: 'text-zinc-500',

    iconTileBlue: 'bg-blue-500/15 text-blue-400',
    iconTileIndigo: 'bg-indigo-500/15 text-indigo-400',
    iconTileEmerald: 'bg-emerald-500/15 text-emerald-400',
    iconTileAmber: 'bg-amber-500/15 text-amber-400',
    iconTileRed: 'bg-red-500/15 text-red-400',
    iconTilePurple: 'bg-purple-500/15 text-purple-400',
  },
};
