/* A small hand-drawn map of a trail: the question (dark dot), each
   discovery along a winding line, the latest one in gold, and faint
   dashes leading on to a door — the part not explored yet.

   Dots have a fixed spacing, so a short trail looks short and the
   path visibly grows as discoveries are added. */

export function TrailMap({ count, max = 8, width = 300, height = 44, dot = 4.5, className = '' }) {
  const shown = Math.min(count, max);
  const left = dot + 4;
  const doorX = width - 12;
  const right = doorX - 26;
  const mid = height / 2;
  const amp = height * 0.2;
  const spacing = (right - left) / Math.max(max, shown);

  const points = Array.from({ length: shown + 1 }, (_, i) => ({
    x: left + i * spacing,
    y: mid + amp * Math.sin(i * 1.3),
  }));

  // Smooth curve through the points (horizontal tangents at each dot)
  const curve = (from, to) => {
    const dx = (to.x - from.x) / 2;
    return `C ${from.x + dx} ${from.y}, ${to.x - dx} ${to.y}, ${to.x} ${to.y}`;
  };
  const walked = points.slice(1).map((p, i) => curve(points[i], p)).join(' ');
  const last = points[points.length - 1];
  const ahead = curve(last, { x: doorX - 7, y: mid + 4 });

  return (
    <svg className={`trail-map ${className}`} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" focusable="false">
      <path d={`M ${last.x} ${last.y} ${ahead}`} className="trail-map__ahead" />
      {shown > 0 && <path d={`M ${points[0].x} ${points[0].y} ${walked}`} className="trail-map__walked" />}
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={i === 0 ? dot + 0.8 : dot}
          className={i === 0 ? 'trail-map__start' : i === shown ? 'trail-map__latest' : 'trail-map__step'}
        />
      ))}
      <g className="trail-map__door" transform={`translate(${doorX - 7} ${mid - 9})`}>
        <path d="M0 18V7a7 7 0 0 1 14 0v11z" />
        <circle cx="7" cy="11" r="1.4" className="trail-map__keyhole" />
      </g>
    </svg>
  );
}
