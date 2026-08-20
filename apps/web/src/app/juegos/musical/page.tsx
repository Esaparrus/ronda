import { GameIntro } from '@/components/ui/GameIntro';

export default function MusicalPage() {
  return (
    <GameIntro
      slug="musical"
      title="Musical"
      kind="Música y oído"
      players="1–8 jugadores"
      duration="10–25 min"
      summary="Escucha un fragmento, reconoce artista y canción, y gana más puntos si lo sabes antes de que suenen los 20 segundos."
      mark="♪"
      note="Las previews se reproducen desde iTunes y llevan su enlace de tienda y atribución."
      primaryAction={{
        href: '/crear/musical',
        label: 'Jugar en grupo',
        description: 'Crea una sala, comparte el QR y juega con tus amigos.',
      }}
      secondaryAction={{
        href: '/juegos/musical/solo',
        label: 'Jugar individual',
        description: 'Configura canciones y juega a tu ritmo.',
      }}
    />
  );
}
