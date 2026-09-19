type Variant = 'color' | 'mono' | 'white';

const INK = '#111827';

/**
 * Marca «gancho como columna» (LEEME del handoff). Seis rectángulos en una caja
 * de 100×100, trazo único de 18. Sin caja. Mínimo en color: 32px — por debajo
 * los dos pasos se funden, así que se cae a monocromo automáticamente.
 * El ámbar y el naranja son los de Entrevista y Oferta; no sustituirlos.
 */
export function Logo({
  size = 32,
  variant = 'color',
  className,
}: {
  size?: number;
  variant?: Variant;
  className?: string;
}) {
  const v: Variant = size < 32 && variant === 'color' ? 'mono' : variant;
  const main = v === 'white' ? '#FFFFFF' : INK;
  const step1 = v === 'mono' ? INK : '#CA8A04';
  const step2 = v === 'mono' ? INK : '#EA580C';

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label="JobTrackr"
      className={className}
    >
      <rect x="12" y="6" width="76" height="18" fill={main} />
      <rect x="41" y="6" width="18" height="52" fill={main} />
      <rect x="23" y="58" width="36" height="18" fill={main} />
      <rect x="23" y="58" width="18" height="36" fill={main} />
      <rect x="66" y="58" width="18" height="18" fill={step1} />
      <rect x="66" y="82" width="18" height="12" fill={step2} />
    </svg>
  );
}
