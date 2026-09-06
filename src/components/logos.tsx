export function EncuentrosLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 96" role="img" aria-label="Encuentros Conyugales San Juan Bautista" className={className}>
      <circle cx="48" cy="48" r="45" fill="#f8f4ea" stroke="#1e3a6e" strokeWidth="3" />
      <path d="M32 42c0-7 5.5-12 12-12 3.2 0 5.8 1.2 8 3.4 2.2-2.2 4.8-3.4 8-3.4 6.5 0 12 5 12 12 0 14-20 26-20 26S32 56 32 42z" fill="#c4a35a" stroke="#1e3a6e" strokeWidth="1.6" />
      <path d="M48 30v34" stroke="#1e3a6e" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M40 40h16" stroke="#1e3a6e" strokeWidth="3.2" strokeLinecap="round" />
    </svg>
  );
}

export function LiturgiaLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 96" role="img" aria-label="Unidad de Liturgia y Oración MEC-SJB" className={className}>
      <circle cx="48" cy="48" r="45" fill="#12233f" stroke="#c4a35a" strokeWidth="3" />
      {Array.from({ length: 12 }).map((_, index) => {
        const angle = (index * Math.PI) / 6;
        const x1 = 48 + Math.cos(angle) * 22;
        const y1 = 42 + Math.sin(angle) * 22;
        const x2 = 48 + Math.cos(angle) * 30;
        const y2 = 42 + Math.sin(angle) * 30;
        return <line key={index} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#c4a35a" strokeWidth="1.4" />;
      })}
      <circle cx="48" cy="42" r="10" fill="#f8f4ea" stroke="#c4a35a" strokeWidth="2" />
      <path d="M48 24v10" stroke="#c4a35a" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M43 28h10" stroke="#c4a35a" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M22 78c6-16 14-22 26-22s20 6 26 22" fill="none" stroke="#f8f4ea" strokeWidth="2" />
      <circle cx="30" cy="70" r="5" fill="#1e3a6e" stroke="#f8f4ea" strokeWidth="1.4" />
      <circle cx="66" cy="70" r="5" fill="#1e3a6e" stroke="#f8f4ea" strokeWidth="1.4" />
    </svg>
  );
}
