/* The doorway is Rabbit Trails' main motif: every trail starts at one
   (the question) and ends at the next one (the next clue). */

// Logo mark. The door swings open a little on hover (see .door-leaf in app.css).
export function DoorMark({ className = '' }) {
  return (
    <svg className={`door-mark ${className}`} viewBox="0 0 28 32" aria-hidden="true" focusable="false">
      <path d="M3 31V13a11 11 0 0 1 22 0v18z" className="door-mark__frame" />
      <path d="M6 31V13.5a8 8 0 0 1 16 0V31z" className="door-mark__light" />
      <g className="door-leaf">
        <path d="M6 31V13.5a8 8 0 0 1 16 0V31z" className="door-mark__leaf" />
        <circle cx="14" cy="19" r="1.5" className="door-mark__keyhole" />
        <path d="M13.3 20h1.4l.5 3h-2.4z" className="door-mark__keyhole" />
      </g>
    </svg>
  );
}

// Larger scene for empty, loading, and error screens: a door left ajar, a dotted path leading in.
export function DoorScene({ variant = 'open', className = '' }) {
  return (
    <svg className={`door-scene door-scene--${variant} ${className}`} viewBox="0 0 240 170" aria-hidden="true" focusable="false">
      <ellipse cx="132" cy="152" rx="92" ry="11" className="ds-ground" />
      <path d="M118 151 L150 151 L196 166 L82 166 Z" className="ds-light" />
      <path d="M12 164 C40 150 60 132 82 142 S110 156 120 150" className="ds-path" />
      <path d="M100 150V70a34 34 0 0 1 68 0v80" className="ds-frame" />
      <path d="M106 150V72a28 28 0 0 1 56 0v78z" className="ds-opening" />
      {variant === 'closed' ? (
        <g>
          <path d="M106 150V72a28 28 0 0 1 56 0v78z" className="ds-leaf" />
          <circle cx="134" cy="112" r="3" className="ds-knob" />
          <path d="M132.6 114h2.8l1 7h-4.8z" className="ds-knob" />
        </g>
      ) : (
        <g>
          <path d="M106 150V62 Q96 52 84 58 V160 Z" className="ds-leaf" />
          <circle cx="90" cy="110" r="2.6" className="ds-knob" />
        </g>
      )}
      <path d="M190 40l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" className="ds-spark" />
      <path d="M62 52l1.4 4 4 1.4-4 1.4-1.4 4-1.4-4-4-1.4 4-1.4z" className="ds-spark ds-spark--small" />
    </svg>
  );
}
