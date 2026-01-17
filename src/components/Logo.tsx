/**
 * Ladder Logic Editor Logo
 *
 * Industrial-inspired geometric mark representing a ladder rung with contact symbol.
 * Uses accent-warm color from theme for technical, high-visibility aesthetic.
 */

interface LogoProps {
  size?: number;
  className?: string;
  variant?: 'full' | 'icon';
}

export function Logo({ size = 32, className = '', variant = 'icon' }: LogoProps) {
  // Use CSS variable for theming - defaults to accent-warm
  const fillColor = 'var(--color-accent-warm)';

  if (variant === 'icon') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`text-accent-warm ${className}`}
        style={{ flexShrink: 0 }}
      >
        {/* Vertical rails */}
        <rect x="4" y="4" width="2.5" height="24" fill={fillColor} rx="1" />
        <rect x="25.5" y="4" width="2.5" height="24" fill={fillColor} rx="1" />

        {/* Top horizontal rung */}
        <rect x="6.5" y="9" width="19" height="2" fill={fillColor} rx="1" />

        {/* Middle rung with contact symbol */}
        <rect x="6.5" y="15" width="6" height="2" fill={fillColor} rx="1" />

        {/* Contact symbol (normally open) */}
        <rect x="14" y="14" width="1.5" height="4" fill={fillColor} rx="0.5" />
        <rect x="16.5" y="14" width="1.5" height="4" fill={fillColor} rx="0.5" />

        {/* Continuation of middle rung */}
        <rect x="19.5" y="15" width="6" height="2" fill={fillColor} rx="1" />

        {/* Bottom rung */}
        <rect x="6.5" y="21" width="19" height="2" fill={fillColor} rx="1" />

        {/* Energy indicator dots (adds industrial flair) */}
        <circle cx="11" cy="16" r="1" fill={fillColor} opacity="0.6" />
        <circle cx="21" cy="16" r="1" fill={fillColor} opacity="0.6" />
      </svg>
    );
  }

  // Full logo with text
  return (
    <div className={`logo-full flex items-center gap-3 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <rect x="4" y="4" width="2.5" height="24" fill={fillColor} rx="1" />
        <rect x="25.5" y="4" width="2.5" height="24" fill={fillColor} rx="1" />
        <rect x="6.5" y="9" width="19" height="2" fill={fillColor} rx="1" />
        <rect x="6.5" y="15" width="6" height="2" fill={fillColor} rx="1" />
        <rect x="14" y="14" width="1.5" height="4" fill={fillColor} rx="0.5" />
        <rect x="16.5" y="14" width="1.5" height="4" fill={fillColor} rx="0.5" />
        <rect x="19.5" y="15" width="6" height="2" fill={fillColor} rx="1" />
        <rect x="6.5" y="21" width="19" height="2" fill={fillColor} rx="1" />
        <circle cx="11" cy="16" r="1" fill={fillColor} opacity="0.6" />
        <circle cx="21" cy="16" r="1" fill={fillColor} opacity="0.6" />
      </svg>
      <span
        className="font-mono font-semibold text-accent-warm uppercase tracking-tight"
        style={{ fontSize: `${size * 0.5}px` }}
      >
        LLE
      </span>
    </div>
  );
}
