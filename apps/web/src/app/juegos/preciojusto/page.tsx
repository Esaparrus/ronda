import { GameIntro } from '@/components/ui/GameIntro';

export default function PrecioJustoPage() {
  return (
    <GameIntro
      slug="preciojusto"
      title="Precio justo"
      kind="Estimación y precisión"
      players="2–7 jugadores"
      duration="10–25 min"
      summary="Mira un producto, calcula cuánto cuesta y comprueba quién se acerca más al precio real."
      primaryAction={{
        href: '/crear/preciojusto',
        label: 'Jugar en grupo',
        description: 'Crea una sala, comparte el código y comparad vuestras estimaciones.',
      }}
      note="Catálogo curado con imágenes propias y precios de referencia congelados en euros. Todos jugáis con la misma variante y las mismas condiciones; la rapidez no da puntos extra."
    />
  );
}
