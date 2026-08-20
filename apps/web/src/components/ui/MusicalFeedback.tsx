'use client';

import type { MusicalFeedbackKind } from '@/lib/musical-feedback';

export interface MusicalFeedbackProps {
  kind: MusicalFeedbackKind;
  points?: number;
}

export function MusicalFeedback({ kind, points }: MusicalFeedbackProps) {
  const correct = kind === 'correct';
  return (
    <section
      className={`musical-feedback musical-feedback--${kind}`}
      role="status"
      aria-live="assertive"
    >
      <span className="musical-feedback__icon" aria-hidden="true">
        {correct ? '✓' : '×'}
      </span>
      <div className="min-w-0">
        <p className="text-20 font-semibold text-crema">{correct ? '¡Correcto!' : 'Incorrecto'}</p>
        <p className="mt-0.5 text-14 text-humo">
          {correct
            ? points
              ? `Has ganado ${points} puntos.`
              : 'Respuesta acertada.'
            : 'Prueba otra vez o escucha más segundos.'}
        </p>
      </div>
    </section>
  );
}
