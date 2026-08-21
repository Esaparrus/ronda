import Link from 'next/link';
import { Icon } from './Icon';

export function BackToGames() {
  return (
    <Link
      href="/juegos"
      className="glass-button w-fit px-3.5 text-14 font-semibold"
    >
      <Icon name="arrow-left" size={17} />
      Juegos
    </Link>
  );
}
