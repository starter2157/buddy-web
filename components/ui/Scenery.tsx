const FENCE_POSTS = [10, 44, 78, 112, 146, 180, 214, 248, 282, 316, 350];

/**
 * The grass-and-fence strip that closes the login and waiting screens.
 * `height` matches the two sizes used in the designs (120 and 110).
 */
export function GrassFooter({ height = 120 }: { height?: 110 | 120 }) {
  const top = height - 50;
  const rail = height - 28;
  const postTop = height - 36;
  return (
    <svg
      aria-hidden="true"
      width="390"
      height={height}
      viewBox={`0 0 390 ${height}`}
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-x-0 bottom-0 w-full"
    >
      <path
        d={`M0 ${height} L0 ${top} Q90 ${top - 30} 190 ${top - 4} Q290 ${top + 22} 390 ${top - 12} L390 ${height} Z`}
        fill="#A9CF6A"
      />
      <g fill="#9A6A3E" stroke="#6E4523" strokeWidth="2">
        <rect x="0" y={rail} width="390" height="8" />
        <rect x="0" y={rail + 14} width="390" height="8" />
        {FENCE_POSTS.map((x) => (
          <path key={x} d={`M${x} ${height} V${postTop} l8 -8 l8 8 V${height}Z`} />
        ))}
      </g>
    </svg>
  );
}

/** Two drifting cloud clusters, pinned to the top of the sky panel. */
export function Clouds() {
  return (
    <svg
      aria-hidden="true"
      width="390"
      height="140"
      viewBox="0 0 390 140"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-x-0 top-[18px] w-full"
    >
      <g fill="#FFFFFF">
        <ellipse cx="40" cy="40" rx="34" ry="16" />
        <ellipse cx="70" cy="30" rx="26" ry="18" />
        <ellipse cx="96" cy="42" rx="24" ry="13" />
        <ellipse cx="318" cy="96" rx="30" ry="14" />
        <ellipse cx="345" cy="86" rx="24" ry="17" />
        <ellipse cx="372" cy="98" rx="24" ry="12" />
      </g>
    </svg>
  );
}

/** The soft wave that hands the sky panel over to the ground colour. */
export function SkyWave() {
  return (
    <svg
      aria-hidden="true"
      width="390"
      height="60"
      viewBox="0 0 390 60"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-x-0 -bottom-px w-full"
    >
      <path d="M0 60 L0 34 Q60 4 130 30 Q190 52 250 22 Q320 -6 390 30 L390 60 Z" fill="#FBF6E9" />
    </svg>
  );
}
