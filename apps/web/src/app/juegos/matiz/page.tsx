import { GameIntro } from '@/components/ui/GameIntro';

export default function MatizPage() {
  return (
    <GameIntro
      slug="matiz"
      title="Matiz"
      kind="Percepción de color"
      players="1–7 jugadores"
      duration="5–15 min"
      summary="Completa el color que falta en una ilustración. Ajusta tono, intensidad y luz, y descubre quién se acerca más al original."
      primaryAction={{
        href: '/crear/matiz',
        label: 'Jugar en grupo',
        description: 'Crea una sala, comparte el código y comparad colores.',
      }}
      secondaryAction={{
        href: '/juegos/matiz/solo',
        label: 'Jugar individual',
        description: 'Diez dibujos para mejorar tu ojo.',
      }}
      toolAction={{
        href: '/juegos/matiz/preparar',
        label: 'Preparar tus imágenes',
        description: 'Sube una imagen y genera su máscara automáticamente.',
      }}
      note="Más de 100 retos aislados: personajes cartoon, prendas, herramientas, objetos y logos. Cada reto sustituye píxeles concretos de la ilustración, no una caja dibujada por encima, y ahora se resuelve con dos barras: color e intensidad."
    />
  );
}
