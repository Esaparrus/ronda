import Image from 'next/image';

export interface GranRondaTrapEncounterProps {
  coinsDelta: number;
}

/** Encuentro puramente visual; el mensaje accesible vive en el panel de resolución. */
export function GranRondaTrapEncounter({ coinsDelta }: GranRondaTrapEncounterProps) {
  const lostCoins = Math.abs(Math.min(0, coinsDelta));

  return (
    <div className="gran-ronda-trap-encounter" aria-hidden="true">
      <span className="gran-ronda-trap-encounter__veil" />
      <span className="gran-ronda-trap-encounter__monster">
        <Image
          src="/games/granronda/monstruo-roba-oros-v1.png"
          alt=""
          width={1240}
          height={1240}
          sizes="(max-width: 640px) 72vw, 30rem"
        />
      </span>
      <span className="gran-ronda-trap-encounter__copy">
        <small>¡Emboscada!</small>
        <strong>{lostCoins > 0 ? `Te roba ${lostCoins} Oros` : 'No encontró Oros'}</strong>
      </span>
    </div>
  );
}
