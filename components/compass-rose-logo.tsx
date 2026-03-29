export function CompassRoseLogo({ className }: { className?: string }) {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Central Star - Sharp and Solid */}
      <path d="M16 10L17.8 14.2L22 16L17.8 17.8L16 22L14.2 17.8L10 16L14.2 14.2L16 10Z" fill="currentColor" />
      
      {/* Cardinal Ticks - Exactly 3px long */}
      <rect x="15.5" y="4" width="1" height="3" fill="currentColor" /> {/* N */}
      <rect x="15.5" y="25" width="1" height="3" fill="currentColor" /> {/* S */}
      <rect x="25" y="15.5" width="3" height="1" fill="currentColor" /> {/* E */}
      <rect x="4" y="15.5" width="3" height="1" fill="currentColor" /> {/* W */}

      {/* 45 Degree Flares - Perfectly angled to hit the circle circumference */}
      <line x1="21.5" y1="10.5" x2="23.5" y2="8.5" stroke="currentColor" strokeWidth="1" strokeLinecap="square" />
      <line x1="21.5" y1="21.5" x2="23.5" y2="23.5" stroke="currentColor" strokeWidth="1" strokeLinecap="square" />
      <line x1="10.5" y1="21.5" x2="8.5" y2="23.5" stroke="currentColor" strokeWidth="1" strokeLinecap="square" />
      <line x1="10.5" y1="10.5" x2="8.5" y2="8.5" stroke="currentColor" strokeWidth="1" strokeLinecap="square" />
    </svg>
  );
}