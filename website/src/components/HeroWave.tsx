/** Signature flowing gradient ribbon — the hero's memorable accent (handhold-style). */
export function HeroWave({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 1200 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id="hw1" x1="0" y1="0" x2="1200" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5B8DEF" />
          <stop offset="0.42" stopColor="#A9C2FF" />
          <stop offset="0.66" stopColor="#F3CB7C" />
          <stop offset="1" stopColor="#E79B3C" />
        </linearGradient>
        <linearGradient id="hw2" x1="0" y1="0" x2="1200" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#86A8F4" />
          <stop offset="1" stopColor="#EBA94A" />
        </linearGradient>
        <filter id="hwb" x="-10%" y="-60%" width="120%" height="220%">
          <feGaussianBlur stdDeviation="11" />
        </filter>
      </defs>
      <g filter="url(#hwb)" fill="none" strokeLinecap="round">
        <path d="M-30 150 C 220 56, 420 206, 640 120 S 1000 56, 1230 132" stroke="url(#hw1)" strokeWidth="18" opacity="0.9" />
        <path d="M-30 176 C 244 92, 446 220, 668 142 S 1014 96, 1230 152" stroke="url(#hw2)" strokeWidth="11" opacity="0.55" />
      </g>
    </svg>
  )
}
