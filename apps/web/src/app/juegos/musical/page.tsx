import { GameIntro } from '@/components/ui/GameIntro';

export default function MusicalPage() {
  return (
    <GameIntro
      slug="musical"
      title="Musical"
      kind="Música y oído"
      players="1 solo · 2–8 en grupo"
      duration="10–25 min"
      summary="Escucha fragmentos de 1 a 30 segundos, reconoce artista y canción, y compite solo o con tus amigos."
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
