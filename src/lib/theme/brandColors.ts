// Basic hex validation before using a club's stored color as a CSS value.
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function getContrastColor(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.55 ? "#111827" : "#ffffff";
}

// Overrides the shadcn/Tailwind `--primary`/`--ring` CSS variables a club's brand color drives
// (buttons, links, focus rings), so per-club theming keeps working without a full palette.
//
// Enfoque híbrido: la UI general usa un acento fijo (violeta). Los colores del club se exponen
// como variables propias (`--club-primary`, `--club-secondary`) para usarlos en detalles de
// identidad del club (logo, badges, pizarra) sin romper el acento global.
export function getBrandColorVars(
  primary?: string | null,
  secondary?: string | null,
): React.CSSProperties {
  const vars: Record<string, string> = {};

  if (primary && HEX_RE.test(primary)) {
    vars["--club-primary"] = primary;
    vars["--club-primary-foreground"] = getContrastColor(primary);
  }
  if (secondary && HEX_RE.test(secondary)) {
    vars["--club-secondary"] = secondary;
    vars["--club-secondary-foreground"] = getContrastColor(secondary);
  }

  return vars as React.CSSProperties;
}
