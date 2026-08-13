import { GameIntro } from '@/components/ui/GameIntro';

export default function ColoresPage() {
  return (
    <GameIntro
      slug="colores"
      title="Colores"
      kind="Social"
      players="2–7 jugadores"
      duration="10–20 min"
      summary="Elegid uno o varios colores en secreto, comparad intuiciones y descubrid quién ve la respuesta con más claridad."
      mark="●"
    />
  );
}
