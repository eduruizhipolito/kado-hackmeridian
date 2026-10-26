// DESIGN.md logo: an open isometric box. Violet outside, coral inside under the
// raised lid, "Ka" on the left face and "Dó" on the right, following each face.
// Source copy for files: public/brand/logo.svg.
export function Logo({ size = 96, title = "Kadó" }: { size?: number; title?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label={title}>
      {/* coral inside, seen through the open top */}
      <polygon points="60,38 100,58 60,78 20,58" fill="#ff6b4a" />
      {/* raised lid, hinged on the back-left edge */}
      <polygon points="20,58 60,38 72,10 32,30" fill="#4b2fa3" stroke="#fff3e2" strokeWidth="2" strokeLinejoin="miter" />
      {/* left and right faces */}
      <polygon points="20,58 60,78 60,116 20,96" fill="#4b2fa3" stroke="#fff3e2" strokeWidth="2" />
      <polygon points="60,78 100,58 100,96 60,116" fill="#4b2fa3" stroke="#fff3e2" strokeWidth="2" />
      <line x1="60" y1="78" x2="60" y2="116" stroke="#fff3e2" strokeWidth="2" />
      <g fill="#fff3e2" fontWeight={800} fontSize="21" style={{ fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif", letterSpacing: "-0.04em" }}>
        <text transform="matrix(1 0.5 0 1 0 0)" x="25" y="80">
          Ka
        </text>
        <text transform="matrix(1 -0.5 0 1 0 0)" x="64" y="133">
          Dó
        </text>
      </g>
    </svg>
  );
}
