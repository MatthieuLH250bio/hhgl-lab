import { useUiStore } from "../../stores/ui";

interface Props {
  size?: number;
  /** Force un mode. Si omis, suit le thème courant. */
  dark?: boolean;
}

export default function Logo({ size = 32, dark }: Props) {
  const theme = useUiStore((s) => s.theme);
  const isDark = dark ?? theme === "dark";

  const gradStart = isDark ? "#7eb1de" : "#1e497a";
  const gradEnd   = isDark ? "#4cc4b1" : "#0d8a7a";

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      role="img"
      aria-label="HHGL"
      style={{ display: "block", flexShrink: 0 }}
    >
      <defs>
        <linearGradient id="hhgl-logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={gradStart} />
          <stop offset="100%" stopColor={gradEnd} />
        </linearGradient>
      </defs>

      {/* Background circle */}
      <circle cx="100" cy="100" r="84" fill="url(#hhgl-logo-g)" />

      {/* Decorative ring */}
      <circle cx="100" cy="100" r="78" fill="none" stroke="#fffdf8" strokeWidth="1.5" opacity=".35" />
      <circle cx="100" cy="100" r="78" fill="none" stroke="#fffdf8" strokeWidth="1.5"
        strokeDasharray="20 470" strokeDashoffset="-50" strokeLinecap="round" opacity=".7" />

      {/* Left strand */}
      <path d="M75 56 L78.7 70.7 L80.9 85.4 L80.9 100 L78.7 114.6 L75 129.3 L71.3 144"
        stroke="#fffdf8" strokeWidth="6" strokeLinecap="round" fill="none" />
      <path d="M75 56 L71.3 70.7 L69.1 85.4 L69.1 100 L71.3 114.6 L75 129.3 L78.7 144"
        stroke="#fffdf8" strokeWidth="6" strokeLinecap="round" fill="none" opacity=".55" />

      {/* Right strand */}
      <path d="M125 56 L128.7 70.7 L130.9 85.4 L130.9 100 L128.7 114.6 L125 129.3 L121.3 144"
        stroke="#fffdf8" strokeWidth="6" strokeLinecap="round" fill="none" />
      <path d="M125 56 L121.3 70.7 L119.1 85.4 L119.1 100 L121.3 114.6 L125 129.3 L128.7 144"
        stroke="#fffdf8" strokeWidth="6" strokeLinecap="round" fill="none" opacity=".55" />

      {/* Horizontal rungs */}
      <g opacity=".4" stroke="#fffdf8" strokeWidth="1.4">
        <line x1="68" y1="64.8"  x2="82"  y2="64.8" />
        <line x1="118" y1="64.8" x2="132" y2="64.8" />
        <line x1="68" y1="82.4"  x2="82"  y2="82.4" />
        <line x1="118" y1="82.4" x2="132" y2="82.4" />
        <line x1="68" y1="117.6" x2="82"  y2="117.6" />
        <line x1="118" y1="117.6" x2="132" y2="117.6" />
        <line x1="68" y1="135.2" x2="82"  y2="135.2" />
        <line x1="118" y1="135.2" x2="132" y2="135.2" />
      </g>

      {/* Center crossbar */}
      <line x1="75" y1="100" x2="125" y2="100" stroke="#fffdf8" strokeWidth="6.5" strokeLinecap="round" />
    </svg>
  );
}
