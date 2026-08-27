import { GameIntro } from '@/components/ui/GameIntro';

export default function MatizPage() {
  return (
    <GameIntro
      slug="matiz"
      title="Matiz"
      kind="Percepción de color"
      players="1 solo · 2–7 en grupo"
      duration="5–15 min"
      summary="Completa el color que falta en una ilustración. Ajusta color e intensidad y descubre quién se acerca más al original."
      primaryAction={{
        href: '/crear/matiz',
        label: 'Jugar en grupo',
        description: 'Crea una sala, comparte el código y comparad colores.',
      }}
      secondaryAction={{
        href: '/juegos/matiz/solo',
        label: 'Jugar individual',
        description: 'Más de 200 dibujos, personajes y logos para mejorar tu ojo.',
      }}
      toolAction={{
        href: '/juegos/matiz/catalogo',
        label: 'Elegir imágenes',
        description: 'Activa o desactiva retos y revisa su origen.',
      }}
      note="223 retos aislados: 100 Pokémon, personajes de series y videojuegos, prendas y 64 logos reales. Cada reto sustituye píxeles concretos de la ilustración, no una caja dibujada por encima, y se resuelve con dos barras: color e intensidad."
    />
  );
}
