// Los tantos, contados con garbanzos (P32, contrato §8.6).
//
// No es decoración: en la mesa de al lado se cuenta así. En Mus los amarrakos
// se apartan literalmente con legumbre, y de ahí sale este componente; Pocha
// y Chinchón lo reutilizan para lo suyo (ver §8.6 para qué cuenta cada uno).
//
// Solo es la fila de legumbre. El número, cuando hace falta, lo pone quien
// llama: un garbanzo se ve de un vistazo pero no se lee "27" en garbanzos, y
// el contrato §8.5 pide que ningún dato dependa solo de una forma.
export interface GarbanzosProps {
  /** Garbanzos ganados. Se recorta a `total` si se pasa. */
  count: number;
  /**
   * Huecos totales. Si se da, los que faltan se pintan como sombra vacía —
   * así se ve cuánto queda, no solo cuánto llevas. Si se omite, solo se
   * pintan los ganados.
   */
  total?: number;
  /** Qué está contando esta fila, para lector de pantalla. */
  label: string;
  className?: string;
}

// Medidas del diseño: el garbanzo es más ancho que alto y se solapa, porque
// un puñado de legumbre no se coloca en fila con separación de milímetro.
const BEAN_WIDTH = 11;
const BEAN_HEIGHT = 8;
const BEAN_OVERLAP = 4;

export function Garbanzos({ count, total, label, className = '' }: GarbanzosProps) {
  const slots = total ?? count;
  const filled = Math.max(0, Math.min(count, slots));

  return (
    <div
      role="img"
      aria-label={`${label}: ${filled}${total !== undefined ? ` de ${total}` : ''}`}
      className={`flex items-center ${className}`}
      style={{ height: BEAN_HEIGHT + 1, paddingLeft: BEAN_OVERLAP }}
    >
      {Array.from({ length: slots }, (_, i) => (
        <span
          key={i}
          className={i < filled ? 'garbanzo' : 'garbanzo-vacio'}
          style={{
            width: BEAN_WIDTH,
            height: BEAN_HEIGHT,
            marginLeft: -BEAN_OVERLAP,
            flexShrink: 0,
          }}
        />
      ))}
    </div>
  );
}
