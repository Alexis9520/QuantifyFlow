"use client";

import React, { useMemo } from "react";

type Props = {
  size?: number;      // tamaño total en px
  label?: string;     // texto accesible
  className?: string; // clases extra (ej. text-white)
  teeth?: number;     // dientes por engranaje (default 8)
  speedMs?: number;   // duración base de 1 vuelta (ms)
};

function buildGearPath(teeth: number, outerR: number, innerR: number): string {
  const cmds: string[] = [];
  const total = teeth * 2;
  const start = -Math.PI / 2; // comenzar “arriba”
  for (let i = 0; i < total; i++) {
    const ang = start + (i * Math.PI) / teeth;
    const r = i % 2 === 0 ? outerR : innerR;
    const x = r * Math.cos(ang);
    const y = r * Math.sin(ang);
    cmds.push(`${i === 0 ? "M" : "L"} ${x.toFixed(3)} ${y.toFixed(3)}`);
  }
  return cmds.join(" ") + " Z";
}

export default function Spinner({
  size = 68,
  label = "Cargando…",
  className = "",
  teeth = 8,
  speedMs = 2000, // más lento por defecto
}: Props) {
  const half = size / 2;
  const pad = Math.max(2, size * 0.05); // padding para que no toque el borde

  // Medidas base y colocación del engranaje pequeño
  const cfg = useMemo(() => {
    // Algo más contenido para que el “fit” no tenga que escalar tanto
    const R = half * 0.42;    // radio exterior grande
    const r = R * 0.72;       // radio interior dientes grande
    const hole = R * 0.35;    // agujero central grande

    const Rs = R * 0.55;      // radio exterior pequeño
    const rs = Rs * 0.72;     // radio interior dientes pequeño
    const holeS = Rs * 0.32;  // agujero central pequeño

    // Distancia ideal entre centros para que “engranen” (ligero solape visual)
    const dIdeal = (R + Rs) * 0.92;

    // Posición en diagonal abajo-derecha
    const diag = Math.SQRT1_2; // ~0.7071
    const dx = dIdeal * diag;
    const dy = dIdeal * diag;

    // Extremos máximos en X/Y que ocuparán ambas piezas
    const maxX = Math.max(R, dx + Rs);
    const maxY = Math.max(R, dy + Rs);
    const bound = Math.max(maxX, maxY);

    // Escala para que todo quepa dentro del viewBox con padding
    const scale = Math.min(1, (half - pad) / bound);

    return { R, r, hole, Rs, rs, holeS, dx, dy, scale };
  }, [half, pad]);

  const gearPathBig = useMemo(() => buildGearPath(teeth, cfg.R, cfg.r), [teeth, cfg.R, cfg.r]);
  const gearPathSmall = useMemo(() => buildGearPath(teeth, cfg.Rs, cfg.rs), [teeth, cfg.Rs, cfg.rs]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className={["inline-flex items-center", className].join(" ")}
      style={{
        color: "currentColor",
        ["--spd" as any]: `${speedMs}ms`,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`${-half} ${-half} ${size} ${size}`}
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Escalado global para asegurar que ambos quepan */}
        <g transform={`scale(${cfg.scale})`}>
          {/* Engranaje grande (centro) */}
          <g className="gear gear--cw">
            <path d={gearPathBig} fill="currentColor" />
            <circle r={cfg.hole} fill="hsl(var(--background))" />
          </g>

          {/* Engranaje pequeño fijo abajo-derecha, rotando en sentido contrario */}
          <g transform={`translate(${cfg.dx} ${cfg.dy})`}>
            <g className="gear gear--ccw">
              <path d={gearPathSmall} fill="currentColor" opacity={0.98} />
              <circle r={cfg.holeS} fill="hsl(var(--background))" />
            </g>
          </g>
        </g>
      </svg>

      {label && <span className="ml-3 text-sm text-muted-foreground">{label}</span>}

      <style jsx>{`
        @keyframes spin-cw   { to { transform: rotate(360deg); } }
        @keyframes spin-ccw  { to { transform: rotate(-360deg); } }

        .gear {
          transform-origin: center;
          transform-box: fill-box; /* centra la rotación en su propio bbox dentro del SVG */
        }
        .gear--cw  { animation: spin-cw  var(--spd) linear infinite; }
        .gear--ccw { animation: spin-ccw calc(var(--spd) * 1.15) linear infinite; }

        @media (prefers-reduced-motion: reduce) {
          .gear--cw, .gear--ccw { animation: none; }
        }
      `}</style>
    </div>
  );
}