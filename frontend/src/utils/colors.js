/**
 * OwlEye – Design System Color Tokens
 * Single source of truth. Import these into every page / component.
 *
 * Usage:
 *   import { C } from '../utils/colors';
 *   style={{ background: C.primary, color: C.surface }}
 */

export const C = {
    // ── Brand ────────────────────────────────────────────────────────────────
    primary: '#4F46E5',   // Indigo  – buttons, links, active states
    secondary: '#06B6D4',   // Cyan    – highlights, badges

    // ── Semantic ─────────────────────────────────────────────────────────────
    success: '#22C55E',   // Green   – success messages, confirmations
    warning: '#F59E0B',   // Amber   – alerts, cautions
    danger: '#EF4444',   // Red     – errors, destructive actions

    // ── Surfaces ─────────────────────────────────────────────────────────────
    background: '#F9FAFB',  // Page background (light grey)
    surface: '#FFFFFF',  // Cards, modals, panels

    // ── Sidebar / Nav ────────────────────────────────────────────────────────────────────
    navy: '#1E293B',   // Sidebar background (dark indigo)
    sidebarText: '#E5E7EB',   // Sidebar text (light gray)
    sidebarHover: '#334155',   // Sidebar hover state

    // ── Text ─────────────────────────────────────────────────────────────────
    textPrimary: '#111827',   // Main headings & body text
    textSecondary: '#6B7280',   // Sub-text, labels, placeholders

    // ── Border ───────────────────────────────────────────────────────────────
    border: '#E5E7EB',   // Default border / dividers

    // ── Tints (10 % opacity fills for icon backgrounds etc.) ─────────────────
    primaryTint: '#EEF2FF',
    secondaryTint: '#ECFEFF',
    successTint: '#DCFCE7',
    warningTint: '#FEF3C7',
    dangerTint: '#FEE2E2',
};

// Named shorthand re-exports for backward-compatible aliasing
export const {
    primary, secondary,
    success, warning, danger,
    background, surface,
    navy, sidebarText, sidebarHover,
    textPrimary, textSecondary,
    border,
    primaryTint, secondaryTint, successTint, warningTint, dangerTint,
} = C;

export default C;
