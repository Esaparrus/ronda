import type {
  CifrasCategory,
  CifrasMode,
  FlagDifficulty,
  FlagRegion,
  SentencePack,
  WhoPack,
} from '@ronda/protocol';

/** SVGs propios y deliberadamente sencillos: no incluyen escudos ni marcas. */
function flagSvg(kind: string): string {
  const bodies: Record<string, string> = {
    portugal:
      '<rect width="128" height="200" fill="#046a38"/><rect x="128" width="192" height="200" fill="#da291c"/><circle cx="128" cy="100" r="48" fill="#f8c300" stroke="#fff" stroke-width="5"/>',
    noruega:
      '<rect width="320" height="200" fill="#ba0c2f"/><path d="M92 0v200M0 78h320" stroke="#fff" stroke-width="42"/><path d="M92 0v200M0 78h320" stroke="#00205b" stroke-width="22"/>',
    dinamarca:
      '<rect width="320" height="200" fill="#c8102e"/><path d="M96 0v200M0 82h320" stroke="#fff" stroke-width="28"/>',
    islandia:
      '<rect width="320" height="200" fill="#02529c"/><path d="M96 0v200M0 82h320" stroke="#fff" stroke-width="38"/><path d="M96 0v200M0 82h320" stroke="#dc1e35" stroke-width="20"/>',
    finlandia:
      '<rect width="320" height="200" fill="#fff"/><path d="M92 0v200M0 82h320" stroke="#003580" stroke-width="32"/>',
    suecia:
      '<rect width="320" height="200" fill="#006aa7"/><path d="M96 0v200M0 78h320" stroke="#fecc00" stroke-width="34"/>',
    'paises-bajos':
      '<rect width="320" height="67" fill="#ae1c28"/><rect y="67" width="320" height="66" fill="#fff"/><rect y="133" width="320" height="67" fill="#21468b"/>',
    luxemburgo:
      '<rect width="320" height="67" fill="#ef3340"/><rect y="67" width="320" height="66" fill="#fff"/><rect y="133" width="320" height="67" fill="#6ec4e8"/>',
    rusia:
      '<rect width="320" height="67" fill="#fff"/><rect y="67" width="320" height="66" fill="#0039a6"/><rect y="133" width="320" height="67" fill="#d52b1e"/>',
    croacia:
      '<rect width="320" height="67" fill="#ff0000"/><rect y="67" width="320" height="66" fill="#fff"/><rect y="133" width="320" height="67" fill="#171796"/><path d="M145 72h30v55h-30z" fill="#c8102e" opacity=".8"/>',
    eslovenia:
      '<rect width="320" height="67" fill="#fff"/><rect y="67" width="320" height="66" fill="#005ce6"/><rect y="133" width="320" height="67" fill="#d50000"/><path d="M30 38 55 86 80 38v60H30z" fill="#d50000" opacity=".75"/>',
    eslovaquia:
      '<rect width="320" height="67" fill="#fff"/><rect y="67" width="320" height="66" fill="#0b4ea2"/><rect y="133" width="320" height="67" fill="#ee1c25"/><path d="M40 62v88l30-18 30 18V62z" fill="#fff" stroke="#ee1c25" stroke-width="6"/>',
    serbia:
      '<rect width="320" height="67" fill="#c6363c"/><rect y="67" width="320" height="66" fill="#0c4076"/><rect y="133" width="320" height="67" fill="#fff"/><circle cx="72" cy="90" r="25" fill="#f5c542" stroke="#c6363c" stroke-width="5"/>',
    rumania:
      '<rect width="107" height="200" fill="#002b7f"/><rect x="107" width="106" height="200" fill="#fcd116"/><rect x="213" width="107" height="200" fill="#ce1126"/>',
    moldavia:
      '<rect width="107" height="200" fill="#003da5"/><rect x="107" width="106" height="200" fill="#ffd200"/><rect x="213" width="107" height="200" fill="#cc092f"/><circle cx="160" cy="100" r="25" fill="#8b1e3f" stroke="#f5c542" stroke-width="5"/>',
    andorra:
      '<rect width="107" height="200" fill="#001f8b"/><rect x="107" width="106" height="200" fill="#f9d616"/><rect x="213" width="107" height="200" fill="#d0103a"/><path d="M137 75h45v50h-45zM160 75v50M137 100h45" stroke="#8b1e3f" stroke-width="5"/>',
    belgica:
      '<rect width="107" height="200" fill="#111"/><rect x="107" width="106" height="200" fill="#f9d616"/><rect x="213" width="107" height="200" fill="#ef3340"/>',
    austria:
      '<rect width="320" height="67" fill="#ed2939"/><rect y="67" width="320" height="66" fill="#fff"/><rect y="133" width="320" height="67" fill="#ed2939"/>',
    hungria:
      '<rect width="320" height="67" fill="#ce2939"/><rect y="67" width="320" height="66" fill="#fff"/><rect y="133" width="320" height="67" fill="#477050"/>',
    bulgaria:
      '<rect width="320" height="67" fill="#fff"/><rect y="67" width="320" height="66" fill="#00966e"/><rect y="133" width="320" height="67" fill="#d62612"/>',
    galicia:
      '<rect width="320" height="200" fill="#fff"/><path d="M-20 40 320 170" stroke="#75aadb" stroke-width="36"/>',
    asturias:
      '<rect width="320" height="200" fill="#0066a6"/><path d="M160 34v132M95 74h130M112 55l96 90M208 55l-96 90" stroke="#f5c400" stroke-width="13"/>',
    cataluna:
      '<rect width="320" height="200" fill="#f9d616"/><path d="M0 28h320M0 68h320M0 108h320M0 148h320" stroke="#c60b1e" stroke-width="17"/>',
    guinea:
      '<rect width="107" height="200" fill="#ce1126"/><rect x="107" width="106" height="200" fill="#fcd116"/><rect x="213" width="107" height="200" fill="#009460"/>',
    mali:
      '<rect width="107" height="200" fill="#14b53a"/><rect x="107" width="106" height="200" fill="#fcd116"/><rect x="213" width="107" height="200" fill="#ce1126"/>',
    senegal:
      '<rect width="107" height="200" fill="#00853f"/><rect x="107" width="106" height="200" fill="#fdef42"/><rect x="213" width="107" height="200" fill="#e31b23"/><path d="m160 77 7 17 18 1-14 12 5 18-16-10-16 10 5-18-14-12 18-1z" fill="#00853f"/>',
    camerun:
      '<rect width="107" height="200" fill="#007a5e"/><rect x="107" width="106" height="200" fill="#ce1126"/><rect x="213" width="107" height="200" fill="#fcd116"/><path d="m160 76 7 17 18 1-14 12 5 18-16-10-16 10 5-18-14-12 18-1z" fill="#fcd116"/>',
    'costa-marfil':
      '<rect width="107" height="200" fill="#ff8200"/><rect x="107" width="106" height="200" fill="#fff"/><rect x="213" width="107" height="200" fill="#009e60"/>',
    ghana:
      '<rect width="320" height="67" fill="#ce1126"/><rect y="67" width="320" height="66" fill="#fcd116"/><rect y="133" width="320" height="67" fill="#006b3f"/><path d="m160 77 7 17 18 1-14 12 5 18-16-10-16 10 5-18-14-12 18-1z" fill="#111"/>',
    'burkina-faso':
      '<rect width="320" height="100" fill="#ef2b2d"/><rect y="100" width="320" height="100" fill="#009e49"/><path d="m160 76 8 18 19 2-15 12 5 19-17-10-17 10 5-19-15-12 19-2z" fill="#fcd116"/>',
    benin:
      '<rect width="105" height="200" fill="#008751"/><rect x="105" width="215" height="100" fill="#fcd116"/><rect x="105" y="100" width="215" height="100" fill="#e8112d"/>',
    nigeria:
      '<rect width="107" height="200" fill="#008751"/><rect x="107" width="106" height="200" fill="#fff"/><rect x="213" width="107" height="200" fill="#008751"/>',
    togo:
      '<rect width="320" height="40" fill="#006a4e"/><rect y="40" width="320" height="40" fill="#ffce00"/><rect y="80" width="320" height="40" fill="#006a4e"/><rect y="120" width="320" height="40" fill="#ffce00"/><rect y="160" width="320" height="40" fill="#006a4e"/><rect width="125" height="120" fill="#d21034"/><path d="m62 38 7 17 18 1-14 12 5 18-16-10-16 10 5-18-14-12 18-1z" fill="#fff"/>',
    gabon:
      '<rect width="320" height="67" fill="#009e60"/><rect y="67" width="320" height="66" fill="#fcd116"/><rect y="133" width="320" height="67" fill="#3a75c4"/>',
    'guinea-ecuatorial':
      '<rect width="320" height="67" fill="#3e9b45"/><rect y="67" width="320" height="66" fill="#fff"/><rect y="133" width="320" height="67" fill="#e32119"/><path d="M0 0v200L95 100Z" fill="#0073ce"/>',
    ruanda:
      '<rect width="320" height="100" fill="#2060a8"/><rect y="100" width="320" height="50" fill="#f5d10d"/><rect y="150" width="320" height="50" fill="#2d8c4b"/><circle cx="238" cy="47" r="20" fill="#f5d10d"/><path d="M238 17v60M208 47h60M217 26l42 42M259 26l-42 42" stroke="#2060a8" stroke-width="4"/>',
    etiopia:
      '<rect width="320" height="67" fill="#078930"/><rect y="67" width="320" height="66" fill="#fcd116"/><rect y="133" width="320" height="67" fill="#da121a"/><circle cx="160" cy="100" r="38" fill="#0f47af" opacity=".9"/><path d="m160 69 9 21 23 2-18 15 6 23-20-12-20 12 6-23-18-15 23-2z" fill="#fcd116"/>',
    kenia:
      '<rect width="320" height="67" fill="#111"/><rect y="67" width="320" height="66" fill="#b42026"/><rect y="133" width="320" height="67" fill="#006b3f"/><path d="M108 0h18v200h-18zM194 0h18v200h-18z" fill="#fff"/><path d="M160 42 205 100 160 158 115 100Z" fill="#b42026" stroke="#fff" stroke-width="5"/>',
    tanzania:
      '<path d="M0 0h320L0 200Z" fill="#1eb53a"/><path d="M320 0v200H0Z" fill="#00a3dd"/><path d="M0 0 320 200M320 0 0 200" stroke="#fcd116" stroke-width="34"/><path d="M0 0 320 200M320 0 0 200" stroke="#111" stroke-width="20"/>',
    uganda:
      '<rect width="320" height="33" fill="#111"/><rect y="33" width="320" height="33" fill="#fcdc04"/><rect y="66" width="320" height="34" fill="#d90000"/><rect y="100" width="320" height="33" fill="#111"/><rect y="133" width="320" height="33" fill="#fcdc04"/><rect y="166" width="320" height="34" fill="#d90000"/><circle cx="160" cy="100" r="30" fill="#fff"/><path d="M160 79v42M145 94h30" stroke="#111" stroke-width="5"/>',
    zambia:
      '<rect width="320" height="200" fill="#198a00"/><rect x="230" y="116" width="90" height="84" fill="#de2010"/><rect x="245" y="116" width="18" height="84" fill="#000"/><rect x="263" y="116" width="18" height="84" fill="#ef7d00"/><path d="m275 35 32 67h-64z" fill="#111"/>',
    zimbabwe:
      '<rect width="320" height="29" fill="#006400"/><rect y="29" width="320" height="29" fill="#ffd200"/><rect y="58" width="320" height="29" fill="#d40000"/><rect y="87" width="320" height="26" fill="#111"/><rect y="113" width="320" height="29" fill="#d40000"/><rect y="142" width="320" height="29" fill="#ffd200"/><rect y="171" width="320" height="29" fill="#006400"/><path d="M0 0v200L110 100Z" fill="#fff"/><path d="m47 72 8 18 20 2-15 13 5 20-18-11-18 11 5-20-15-13 20-2z" fill="#d40000"/>',
    malaui:
      '<rect width="320" height="67" fill="#111"/><rect y="67" width="320" height="66" fill="#ce1126"/><rect y="133" width="320" height="67" fill="#339e35"/><path d="M105 67a55 55 0 0 1 110 0Z" fill="#ce1126"/><path d="M105 67a55 55 0 0 1 110 0" fill="none" stroke="#fcd116" stroke-width="8"/>',
    mozambique:
      '<rect width="320" height="67" fill="#009e49"/><rect y="67" width="320" height="10" fill="#fff"/><rect y="77" width="320" height="56" fill="#111"/><rect y="133" width="320" height="10" fill="#fff"/><rect y="143" width="320" height="57" fill="#fce100"/><path d="M0 0v200L105 100Z" fill="#d21034"/><path d="m43 76 7 17 18 1-14 12 5 18-16-10-16 10 5-18-14-12 18-1z" fill="#fce100"/>',
    namibia:
      '<path d="M0 0h320L0 200Z" fill="#003580"/><path d="M320 0v200H0Z" fill="#009543"/><path d="M0 0 320 200" stroke="#fff" stroke-width="34"/><path d="M0 0 320 200" stroke="#d21034" stroke-width="20"/><circle cx="62" cy="48" r="22" fill="#fcd116"/><path d="M62 17v62M31 48h62M40 26l44 44M84 26 40 70" stroke="#fcd116" stroke-width="4"/>',
    botsuana:
      '<rect width="320" height="200" fill="#75aadb"/><rect y="75" width="320" height="50" fill="#fff"/><rect y="88" width="320" height="24" fill="#111"/>',
    lesoto:
      '<rect width="320" height="67" fill="#005eb8"/><rect y="67" width="320" height="66" fill="#fff"/><rect y="133" width="320" height="67" fill="#009543"/><path d="M160 74 185 108 160 126 135 108Z" fill="#111"/>',
    colombia:
      '<rect width="320" height="100" fill="#fcd116"/><rect y="100" width="320" height="50" fill="#003893"/><rect y="150" width="320" height="50" fill="#ce1126"/>',
    ecuador:
      '<rect width="320" height="100" fill="#fcd116"/><rect y="100" width="320" height="50" fill="#034ea2"/><rect y="150" width="320" height="50" fill="#ed1c24"/><circle cx="160" cy="105" r="28" fill="#8c5a2b" stroke="#fff" stroke-width="4"/>',
    venezuela:
      '<rect width="320" height="67" fill="#fcd116"/><rect y="67" width="320" height="66" fill="#003893"/><rect y="133" width="320" height="67" fill="#ce1126"/><path d="m113 80 6 13 14 1-11 9 3 14-12-7-12 7 3-14-11-9 14-1zM151 75l6 13 14 1-11 9 3 14-12-7-12 7 3-14-11-9 14-1zM189 80l6 13 14 1-11 9 3 14-12-7-12 7 3-14-11-9 14-1z" fill="#fff"/>',
    bolivia:
      '<rect width="320" height="67" fill="#d52b1e"/><rect y="67" width="320" height="66" fill="#f9e300"/><rect y="133" width="320" height="67" fill="#007934"/>',
    'costa-rica':
      '<rect width="320" height="30" fill="#002b7f"/><rect y="30" width="320" height="35" fill="#fff"/><rect y="65" width="320" height="70" fill="#ce1126"/><rect y="135" width="320" height="35" fill="#fff"/><rect y="170" width="320" height="30" fill="#002b7f"/>',
    nicaragua:
      '<rect width="320" height="67" fill="#0067c6"/><rect y="67" width="320" height="66" fill="#fff"/><rect y="133" width="320" height="67" fill="#0067c6"/><path d="M160 75 197 112H123Z" fill="#6cace4" stroke="#0067c6" stroke-width="4"/>',
    'el-salvador':
      '<rect width="320" height="67" fill="#0f47af"/><rect y="67" width="320" height="66" fill="#fff"/><rect y="133" width="320" height="67" fill="#0f47af"/><path d="M160 75 197 112H123Z" fill="#fcd116" stroke="#0f47af" stroke-width="4"/>',
    honduras:
      '<rect width="320" height="67" fill="#0073cf"/><rect y="67" width="320" height="66" fill="#fff"/><rect y="133" width="320" height="67" fill="#0073cf"/><circle cx="145" cy="92" r="6" fill="#0073cf"/><circle cx="175" cy="92" r="6" fill="#0073cf"/><circle cx="145" cy="116" r="6" fill="#0073cf"/><circle cx="175" cy="116" r="6" fill="#0073cf"/><circle cx="160" cy="104" r="6" fill="#0073cf"/>',
    guatemala:
      '<rect width="107" height="200" fill="#4997d0"/><rect x="107" width="106" height="200" fill="#fff"/><rect x="213" width="107" height="200" fill="#4997d0"/><path d="M145 74h30v54h-30z" fill="#75aadb" stroke="#6b3f24" stroke-width="5"/>',
    uruguay:
      '<rect width="320" height="200" fill="#fff"/><path d="M0 25h320M0 75h320M0 125h320M0 175h320" stroke="#68a8d8" stroke-width="25"/><circle cx="58" cy="45" r="27" fill="#fcd116" stroke="#fff" stroke-width="3"/>',
    indonesia:
      '<rect width="320" height="100" fill="#ce1126"/><rect y="100" width="320" height="100" fill="#fff"/>',
    singapur:
      '<rect width="320" height="100" fill="#ed2939"/><rect y="100" width="320" height="100" fill="#fff"/><circle cx="67" cy="55" r="28" fill="#fff"/><circle cx="77" cy="55" r="23" fill="#ed2939"/><path d="m105 26 4 9 10 1-8 6 3 10-9-6-9 6 3-10-8-6 10-1z" fill="#fff"/>',
    bangladesh:
      '<rect width="320" height="200" fill="#006a4e"/><circle cx="145" cy="100" r="51" fill="#f42a41"/>',
    palau:
      '<rect width="320" height="200" fill="#4aadd6"/><circle cx="145" cy="100" r="54" fill="#ffde00"/>',
    micronesia:
      '<rect width="320" height="200" fill="#75bde8"/><path d="m160 45 9 18 20 2-15 13 5 20-19-11-19 11 5-20-15-13 20-2zM88 91l7 14 16 2-12 10 4 16-15-9-15 9 4-16-12-10 16-2zM232 91l7 14 16 2-12 10 4 16-15-9-15 9 4-16-12-10 16-2zM160 137l7 14 16 2-12 10 4 16-15-9-15 9 4-16-12-10 16-2z" fill="#fff"/>',
    kazajistan:
      '<rect width="320" height="200" fill="#00afca"/><circle cx="160" cy="72" r="25" fill="#f9d616"/><path d="M160 32v80M120 72h80M132 44l56 56M188 44l-56 56" stroke="#f9d616" stroke-width="4"/><path d="M160 111 202 175h-84z" fill="#f9d616"/>',
    kirguistan:
      '<rect width="320" height="200" fill="#e8112d"/><circle cx="160" cy="100" r="48" fill="#f9d616"/><circle cx="160" cy="100" r="35" fill="#e8112d"/><path d="M160 54v92M114 100h92M128 68l64 64M192 68l-64 64" stroke="#f9d616" stroke-width="5"/>',
    uzbekistan:
      '<rect width="320" height="58" fill="#1eb53a"/><rect y="58" width="320" height="10" fill="#ce1126"/><rect y="68" width="320" height="64" fill="#fff"/><rect y="132" width="320" height="10" fill="#ce1126"/><rect y="142" width="320" height="58" fill="#0099b5"/><circle cx="58" cy="35" r="20" fill="#fff"/><circle cx="65" cy="35" r="18" fill="#1eb53a"/>',
    tayikistan:
      '<rect width="320" height="67" fill="#ce1126"/><rect y="67" width="320" height="66" fill="#fff"/><rect y="133" width="320" height="67" fill="#009e49"/><path d="M130 108h60M140 100h40M145 92h30" stroke="#f8c300" stroke-width="7"/><path d="m160 74 8 12h-16z" fill="#f8c300"/>',
    turkmenistan:
      '<rect width="320" height="200" fill="#00843d"/><rect width="70" height="200" fill="#b21f35"/><path d="M16 18h38M16 48h38M16 78h38M16 108h38M16 138h38M16 168h38" stroke="#f6d04d" stroke-width="12"/><path d="M16 18h38M16 48h38M16 78h38M16 108h38M16 138h38M16 168h38" stroke="#b21f35" stroke-width="4"/>'
  };
  const body = bodies[kind] ?? '<rect width="320" height="200" fill="#fff" />';
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200">${body}</svg>`)}`;
}

export interface FlagOption {
  id: string;
  label: string;
}

export interface FlagQuestion {
  id: string;
  image: string;
  entityName: string;
  entityType: 'country' | 'community' | 'territory';
  region: FlagRegion;
  difficulty: FlagDifficulty;
  options: [FlagOption, FlagOption, FlagOption, FlagOption];
  correctOptionId: string;
  explanation?: string;
}

function flagQuestion(input: {
  id: string;
  name: string;
  svg: string;
  region: FlagRegion;
  difficulty?: FlagDifficulty;
  options: [string, string, string, string];
  correct: string;
  type?: 'country' | 'community' | 'territory';
  explanation?: string;
}): FlagQuestion {
  return {
    id: input.id,
    image: flagSvg(input.svg),
    entityName: input.name,
    entityType: input.type ?? 'country',
    region: input.region,
    difficulty: input.difficulty ?? 'dificil',
    options: input.options.map((label) => ({ id: label.toLowerCase().replaceAll(' ', '-'), label })) as [
      FlagOption,
      FlagOption,
      FlagOption,
      FlagOption,
    ],
    correctOptionId: input.correct.toLowerCase().replaceAll(' ', '-'),
    explanation: input.explanation,
  };
}

export const FLAG_QUESTIONS: readonly FlagQuestion[] = [
  // Europa: cruces, tricolores y franjas con diferencias pequeñas.
  flagQuestion({ id: 'flag-pt', name: 'Portugal', svg: 'portugal', region: 'europa', options: ['Portugal', 'Rumanía', 'Moldavia', 'Andorra'], correct: 'Portugal', explanation: 'La división vertical verde-roja y el escudo sobre la esfera armilar la separan de las tricolores del este.' }),
  flagQuestion({ id: 'flag-no', name: 'Noruega', svg: 'noruega', region: 'europa', options: ['Noruega', 'Dinamarca', 'Islandia', 'Suecia'], correct: 'Noruega', explanation: 'La cruz azul va dentro de una cruz blanca: ese doble borde la distingue de Dinamarca.' }),
  flagQuestion({ id: 'flag-dk', name: 'Dinamarca', svg: 'dinamarca', region: 'europa', options: ['Dinamarca', 'Noruega', 'Islandia', 'Finlandia'], correct: 'Dinamarca' }),
  flagQuestion({ id: 'flag-is', name: 'Islandia', svg: 'islandia', region: 'europa', options: ['Islandia', 'Noruega', 'Dinamarca', 'Finlandia'], correct: 'Islandia' }),
  flagQuestion({ id: 'flag-fi', name: 'Finlandia', svg: 'finlandia', region: 'europa', options: ['Finlandia', 'Suecia', 'Grecia', 'Islandia'], correct: 'Finlandia' }),
  flagQuestion({ id: 'flag-se', name: 'Suecia', svg: 'suecia', region: 'europa', options: ['Suecia', 'Finlandia', 'Noruega', 'Islandia'], correct: 'Suecia' }),
  flagQuestion({ id: 'flag-nl', name: 'Países Bajos', svg: 'paises-bajos', region: 'europa', options: ['Países Bajos', 'Luxemburgo', 'Rusia', 'Croacia'], correct: 'Países Bajos' }),
  flagQuestion({ id: 'flag-lu', name: 'Luxemburgo', svg: 'luxemburgo', region: 'europa', options: ['Luxemburgo', 'Países Bajos', 'Rusia', 'Serbia'], correct: 'Luxemburgo' }),
  flagQuestion({ id: 'flag-ru', name: 'Rusia', svg: 'rusia', region: 'europa', options: ['Rusia', 'Eslovenia', 'Eslovaquia', 'Países Bajos'], correct: 'Rusia' }),
  flagQuestion({ id: 'flag-hr', name: 'Croacia', svg: 'croacia', region: 'europa', options: ['Croacia', 'Eslovenia', 'Serbia', 'Eslovaquia'], correct: 'Croacia' }),
  flagQuestion({ id: 'flag-si', name: 'Eslovenia', svg: 'eslovenia', region: 'europa', options: ['Eslovenia', 'Eslovaquia', 'Croacia', 'Serbia'], correct: 'Eslovenia' }),
  flagQuestion({ id: 'flag-sk', name: 'Eslovaquia', svg: 'eslovaquia', region: 'europa', options: ['Eslovaquia', 'Eslovenia', 'Serbia', 'Croacia'], correct: 'Eslovaquia' }),
  flagQuestion({ id: 'flag-rs', name: 'Serbia', svg: 'serbia', region: 'europa', options: ['Serbia', 'Rusia', 'Eslovaquia', 'Eslovenia'], correct: 'Serbia' }),
  flagQuestion({ id: 'flag-ro', name: 'Rumanía', svg: 'rumania', region: 'europa', options: ['Rumanía', 'Chad', 'Moldavia', 'Andorra'], correct: 'Rumanía' }),
  flagQuestion({ id: 'flag-md', name: 'Moldavia', svg: 'moldavia', region: 'europa', options: ['Moldavia', 'Rumanía', 'Andorra', 'Chad'], correct: 'Moldavia' }),
  flagQuestion({ id: 'flag-ad', name: 'Andorra', svg: 'andorra', region: 'europa', options: ['Andorra', 'Moldavia', 'Rumanía', 'Chad'], correct: 'Andorra' }),
  flagQuestion({ id: 'flag-be', name: 'Bélgica', svg: 'belgica', region: 'europa', options: ['Bélgica', 'Alemania', 'Rumanía', 'Lituania'], correct: 'Bélgica' }),
  flagQuestion({ id: 'flag-at', name: 'Austria', svg: 'austria', region: 'europa', options: ['Austria', 'Letonia', 'Polonia', 'Indonesia'], correct: 'Austria' }),
  flagQuestion({ id: 'flag-hu', name: 'Hungría', svg: 'hungria', region: 'europa', options: ['Hungría', 'Bulgaria', 'Lituania', 'Rusia'], correct: 'Hungría' }),
  flagQuestion({ id: 'flag-bg', name: 'Bulgaria', svg: 'bulgaria', region: 'europa', options: ['Bulgaria', 'Hungría', 'Estonia', 'Lituania'], correct: 'Bulgaria' }),

  // España: banderas autonómicas que comparten colores y símbolos.
  flagQuestion({ id: 'flag-ga', name: 'Galicia', svg: 'galicia', region: 'espana', type: 'community', options: ['Galicia', 'Asturias', 'Cantabria', 'Castilla y León'], correct: 'Galicia' }),
  flagQuestion({ id: 'flag-as', name: 'Asturias', svg: 'asturias', region: 'espana', type: 'community', options: ['Asturias', 'Galicia', 'Cantabria', 'Navarra'], correct: 'Asturias' }),
  flagQuestion({ id: 'flag-ct', name: 'Cataluña', svg: 'cataluna', region: 'espana', type: 'community', options: ['Cataluña', 'Aragón', 'Comunidad Valenciana', 'Baleares'], correct: 'Cataluña' }),

  // África: muchas tricolores y combinaciones de verde, amarillo y rojo.
  flagQuestion({ id: 'flag-gn', name: 'Guinea', svg: 'guinea', region: 'africa', options: ['Guinea', 'Malí', 'Senegal', 'Camerún'], correct: 'Guinea' }),
  flagQuestion({ id: 'flag-ml', name: 'Malí', svg: 'mali', region: 'africa', options: ['Malí', 'Guinea', 'Senegal', 'Camerún'], correct: 'Malí' }),
  flagQuestion({ id: 'flag-sn', name: 'Senegal', svg: 'senegal', region: 'africa', options: ['Senegal', 'Malí', 'Guinea', 'Camerún'], correct: 'Senegal' }),
  flagQuestion({ id: 'flag-cm', name: 'Camerún', svg: 'camerun', region: 'africa', options: ['Camerún', 'Senegal', 'Guinea', 'Malí'], correct: 'Camerún' }),
  flagQuestion({ id: 'flag-ci', name: 'Costa de Marfil', svg: 'costa-marfil', region: 'africa', options: ['Costa de Marfil', 'Irlanda', 'Italia', 'Guinea'], correct: 'Costa de Marfil' }),
  flagQuestion({ id: 'flag-gh', name: 'Ghana', svg: 'ghana', region: 'africa', options: ['Ghana', 'Guinea', 'Malí', 'Senegal'], correct: 'Ghana' }),
  flagQuestion({ id: 'flag-bf', name: 'Burkina Faso', svg: 'burkina-faso', region: 'africa', options: ['Burkina Faso', 'Ghana', 'Guinea', 'Camerún'], correct: 'Burkina Faso' }),
  flagQuestion({ id: 'flag-bj', name: 'Benín', svg: 'benin', region: 'africa', options: ['Benín', 'Nigeria', 'Costa de Marfil', 'Guinea'], correct: 'Benín' }),
  flagQuestion({ id: 'flag-ng', name: 'Nigeria', svg: 'nigeria', region: 'africa', options: ['Nigeria', 'Benín', 'Irlanda', 'Costa de Marfil'], correct: 'Nigeria' }),
  flagQuestion({ id: 'flag-tg', name: 'Togo', svg: 'togo', region: 'africa', options: ['Togo', 'Ghana', 'Benín', 'Liberia'], correct: 'Togo' }),
  flagQuestion({ id: 'flag-gabon', name: 'Gabón', svg: 'gabon', region: 'africa', options: ['Gabón', 'Ruanda', 'Sierra Leona', 'Ghana'], correct: 'Gabón' }),
  flagQuestion({ id: 'flag-gq', name: 'Guinea Ecuatorial', svg: 'guinea-ecuatorial', region: 'africa', options: ['Guinea Ecuatorial', 'Gabón', 'Ruanda', 'Ghana'], correct: 'Guinea Ecuatorial' }),
  flagQuestion({ id: 'flag-rw', name: 'Ruanda', svg: 'ruanda', region: 'africa', options: ['Ruanda', 'Gabón', 'Etiopía', 'Guinea Ecuatorial'], correct: 'Ruanda' }),
  flagQuestion({ id: 'flag-et', name: 'Etiopía', svg: 'etiopia', region: 'africa', options: ['Etiopía', 'Ghana', 'Malí', 'Guinea'], correct: 'Etiopía' }),
  flagQuestion({ id: 'flag-ke', name: 'Kenia', svg: 'kenia', region: 'africa', options: ['Kenia', 'Tanzania', 'Malaui', 'Uganda'], correct: 'Kenia' }),
  flagQuestion({ id: 'flag-tz', name: 'Tanzania', svg: 'tanzania', region: 'africa', options: ['Tanzania', 'Kenia', 'Malaui', 'Uganda'], correct: 'Tanzania' }),
  flagQuestion({ id: 'flag-ug', name: 'Uganda', svg: 'uganda', region: 'africa', options: ['Uganda', 'Kenia', 'Tanzania', 'Zimbabue'], correct: 'Uganda' }),
  flagQuestion({ id: 'flag-zm', name: 'Zambia', svg: 'zambia', region: 'africa', options: ['Zambia', 'Zimbabue', 'Malaui', 'Mozambique'], correct: 'Zambia' }),
  flagQuestion({ id: 'flag-zw', name: 'Zimbabue', svg: 'zimbabwe', region: 'africa', options: ['Zimbabue', 'Zambia', 'Mozambique', 'Malaui'], correct: 'Zimbabue' }),
  flagQuestion({ id: 'flag-mw', name: 'Malaui', svg: 'malaui', region: 'africa', options: ['Malaui', 'Zambia', 'Zimbabue', 'Kenia'], correct: 'Malaui' }),
  flagQuestion({ id: 'flag-mz', name: 'Mozambique', svg: 'mozambique', region: 'africa', options: ['Mozambique', 'Zimbabue', 'Zambia', 'Angola'], correct: 'Mozambique' }),
  flagQuestion({ id: 'flag-na', name: 'Namibia', svg: 'namibia', region: 'africa', options: ['Namibia', 'Botsuana', 'Sudáfrica', 'Lesoto'], correct: 'Namibia' }),
  flagQuestion({ id: 'flag-bw', name: 'Botsuana', svg: 'botsuana', region: 'africa', options: ['Botsuana', 'Namibia', 'Lesoto', 'Suazilandia'], correct: 'Botsuana' }),
  flagQuestion({ id: 'flag-ls', name: 'Lesoto', svg: 'lesoto', region: 'africa', options: ['Lesoto', 'Namibia', 'Botsuana', 'Suazilandia'], correct: 'Lesoto' }),

  // América: franjas y tricolores que se confunden con facilidad.
  flagQuestion({ id: 'flag-co', name: 'Colombia', svg: 'colombia', region: 'america', options: ['Colombia', 'Ecuador', 'Venezuela', 'Bolivia'], correct: 'Colombia' }),
  flagQuestion({ id: 'flag-ec', name: 'Ecuador', svg: 'ecuador', region: 'america', options: ['Ecuador', 'Colombia', 'Venezuela', 'Bolivia'], correct: 'Ecuador' }),
  flagQuestion({ id: 'flag-ve', name: 'Venezuela', svg: 'venezuela', region: 'america', options: ['Venezuela', 'Colombia', 'Ecuador', 'Bolivia'], correct: 'Venezuela' }),
  flagQuestion({ id: 'flag-bo', name: 'Bolivia', svg: 'bolivia', region: 'america', options: ['Bolivia', 'Colombia', 'Ecuador', 'Venezuela'], correct: 'Bolivia' }),
  flagQuestion({ id: 'flag-cr', name: 'Costa Rica', svg: 'costa-rica', region: 'america', options: ['Costa Rica', 'Nicaragua', 'El Salvador', 'Honduras'], correct: 'Costa Rica' }),
  flagQuestion({ id: 'flag-ni', name: 'Nicaragua', svg: 'nicaragua', region: 'america', options: ['Nicaragua', 'Honduras', 'El Salvador', 'Costa Rica'], correct: 'Nicaragua' }),
  flagQuestion({ id: 'flag-sv', name: 'El Salvador', svg: 'el-salvador', region: 'america', options: ['El Salvador', 'Nicaragua', 'Honduras', 'Costa Rica'], correct: 'El Salvador' }),
  flagQuestion({ id: 'flag-hn', name: 'Honduras', svg: 'honduras', region: 'america', options: ['Honduras', 'Nicaragua', 'El Salvador', 'Costa Rica'], correct: 'Honduras' }),
  flagQuestion({ id: 'flag-gt', name: 'Guatemala', svg: 'guatemala', region: 'america', options: ['Guatemala', 'Honduras', 'El Salvador', 'Nicaragua'], correct: 'Guatemala' }),
  flagQuestion({ id: 'flag-uy', name: 'Uruguay', svg: 'uruguay', region: 'america', options: ['Uruguay', 'Argentina', 'Grecia', 'Honduras'], correct: 'Uruguay' }),

  // Asia y Oceanía: banderas minimalistas y repúblicas de Asia Central.
  flagQuestion({ id: 'flag-id', name: 'Indonesia', svg: 'indonesia', region: 'asia-oceania', options: ['Indonesia', 'Mónaco', 'Polonia', 'Singapur'], correct: 'Indonesia' }),
  flagQuestion({ id: 'flag-sg', name: 'Singapur', svg: 'singapur', region: 'asia-oceania', options: ['Singapur', 'Indonesia', 'Mónaco', 'Polonia'], correct: 'Singapur' }),
  flagQuestion({ id: 'flag-bd', name: 'Bangladés', svg: 'bangladesh', region: 'asia-oceania', options: ['Bangladés', 'Palaos', 'Micronesia', 'Pakistán'], correct: 'Bangladés' }),
  flagQuestion({ id: 'flag-pw', name: 'Palaos', svg: 'palau', region: 'asia-oceania', options: ['Palaos', 'Bangladés', 'Micronesia', 'Japón'], correct: 'Palaos' }),
  flagQuestion({ id: 'flag-fm', name: 'Micronesia', svg: 'micronesia', region: 'asia-oceania', options: ['Micronesia', 'Palaos', 'Bangladés', 'Somalia'], correct: 'Micronesia' }),
  flagQuestion({ id: 'flag-kz', name: 'Kazajistán', svg: 'kazajistan', region: 'asia-oceania', options: ['Kazajistán', 'Kirguistán', 'Uzbekistán', 'Tayikistán'], correct: 'Kazajistán' }),
  flagQuestion({ id: 'flag-kg', name: 'Kirguistán', svg: 'kirguistan', region: 'asia-oceania', options: ['Kirguistán', 'Kazajistán', 'Turkmenistán', 'Tayikistán'], correct: 'Kirguistán' }),
  flagQuestion({ id: 'flag-uz', name: 'Uzbekistán', svg: 'uzbekistan', region: 'asia-oceania', options: ['Uzbekistán', 'Kazajistán', 'Tayikistán', 'Turkmenistán'], correct: 'Uzbekistán' }),
  flagQuestion({ id: 'flag-tj', name: 'Tayikistán', svg: 'tayikistan', region: 'asia-oceania', options: ['Tayikistán', 'Uzbekistán', 'Kirguistán', 'Turkmenistán'], correct: 'Tayikistán' }),
  flagQuestion({ id: 'flag-tm', name: 'Turkmenistán', svg: 'turkmenistan', region: 'asia-oceania', options: ['Turkmenistán', 'Uzbekistán', 'Kazajistán', 'Tayikistán'], correct: 'Turkmenistán' }),
];

function firstOrThrow<T>(items: readonly T[], fallback: readonly T[], label: string): T {
  const value = items[0] ?? fallback[0];
  if (!value) throw new Error(`${label} está vacío`);
  return value;
}

export function flagQuestionById(id: string, questions: readonly FlagQuestion[] = FLAG_QUESTIONS): FlagQuestion {
  return questions.find((question) => question.id === id) ?? firstOrThrow(questions, FLAG_QUESTIONS, 'Banderas');
}

export function flagQuestionIdsFor(
  region: FlagRegion,
  difficulty: FlagDifficulty,
  questions: readonly FlagQuestion[] = FLAG_QUESTIONS,
): string[] {
  // Banderas ya no ofrece selector de dificultad: incluso si llega una sala
  // antigua con `facil` o `normal`, sus rondas deben salir del banco difícil.
  void difficulty;
  const hardQuestions = questions.filter((question) => question.difficulty === 'dificil');
  const filtered = hardQuestions.filter(
    (question) =>
      region === 'mundo' || question.region === region || region === 'parecidas',
  );
  const byRegion = hardQuestions.filter(
    (question) => region === 'mundo' || question.region === region || region === 'parecidas',
  );
  const fallback = hardQuestions.length > 0 ? hardQuestions : questions;
  return (filtered.length > 0 ? filtered : byRegion.length > 0 ? byRegion : fallback).map((question) => question.id);
}

export interface NumberQuestion {
  id: string;
  kind: 'estimate';
  prompt: string;
  unit: string;
  definition: string;
  category: Exclude<CifrasCategory, 'todo'>;
  referenceValue: number;
  source: string;
  updatedAt: string;
}

export interface OrderQuestion {
  id: string;
  kind: 'order';
  prompt: string;
  unit: string;
  definition: string;
  category: Exclude<CifrasCategory, 'todo'>;
  items: { id: string; label: string; value: number }[];
  direction: 'asc' | 'desc';
  source: string;
  updatedAt: string;
}

export type CifrasQuestion = NumberQuestion | OrderQuestion;

export const CIFRAS_QUESTIONS: readonly CifrasQuestion[] = [
  { id: 'altura-eiffel', kind: 'estimate', prompt: '¿Cuántos metros mide la Torre Eiffel hasta su antena?', unit: 'metros', definition: 'Altura total hasta la punta de la antena.', category: 'edificios', referenceValue: 330, source: 'Société d’Exploitation de la Tour Eiffel · ficha editorial', updatedAt: '2026-01-01' },
  { id: 'altura-burj', kind: 'estimate', prompt: '¿Cuántos metros mide el Burj Khalifa?', unit: 'metros', definition: 'Altura arquitectónica oficial hasta la punta.', category: 'edificios', referenceValue: 828, source: 'CTBUH · ficha editorial', updatedAt: '2026-01-01' },
  { id: 'madrid-barcelona', kind: 'estimate', prompt: '¿Qué distancia en línea recta hay entre Madrid y Barcelona?', unit: 'kilómetros', definition: 'Distancia geodésica entre los centros urbanos.', category: 'distancias', referenceValue: 505, source: 'Cálculo geodésico editorial de Ronda', updatedAt: '2026-01-01' },
  { id: 'superficie-espana', kind: 'estimate', prompt: '¿Qué superficie tiene España?', unit: 'km²', definition: 'Superficie territorial de España, sin aguas territoriales.', category: 'superficie', referenceValue: 505990, source: 'Instituto Geográfico Nacional · ficha editorial', updatedAt: '2026-01-01' },
  { id: 'everest', kind: 'estimate', prompt: '¿A qué altura está la cima del Everest?', unit: 'metros', definition: 'Altitud sobre el nivel medio del mar.', category: 'montanas', referenceValue: 8849, source: 'National Geographic · ficha editorial', updatedAt: '2026-01-01' },
  { id: 'profundidad-bajikal', kind: 'estimate', prompt: '¿Cuál es la profundidad máxima del lago Baikal?', unit: 'metros', definition: 'Profundidad máxima registrada del lago.', category: 'profundidad', referenceValue: 1642, source: 'UNESCO · ficha editorial', updatedAt: '2026-01-01' },
  { id: 'orden-edificios', kind: 'order', prompt: 'Ordena estas construcciones de menor a mayor altura.', unit: 'metros', definition: 'Altura arquitectónica oficial, de menor a mayor.', category: 'edificios', direction: 'asc', items: [{ id: 'guggenheim', label: 'Museo Guggenheim Bilbao', value: 32 }, { id: 'torre-pisa', label: 'Torre de Pisa', value: 57 }, { id: 'eiffel', label: 'Torre Eiffel', value: 330 }, { id: 'burj', label: 'Burj Khalifa', value: 828 }], source: 'Fichas editoriales de cada edificio', updatedAt: '2026-01-01' },
  { id: 'orden-montanas', kind: 'order', prompt: 'Ordena estas montañas de mayor a menor altitud.', unit: 'metros', definition: 'Altitud de la cima sobre el nivel del mar, de mayor a menor.', category: 'montanas', direction: 'desc', items: [{ id: 'teide', label: 'Teide', value: 3715 }, { id: 'mont-blanc', label: 'Mont Blanc', value: 4808 }, { id: 'aconcagua', label: 'Aconcagua', value: 6961 }, { id: 'everest', label: 'Everest', value: 8849 }], source: 'Fichas editoriales de cada montaña', updatedAt: '2026-01-01' },
  { id: 'orden-superficie', kind: 'order', prompt: 'Ordena estos territorios de menor a mayor superficie.', unit: 'km²', definition: 'Superficie territorial, de menor a mayor.', category: 'superficie', direction: 'asc', items: [{ id: 'mallorca', label: 'Mallorca', value: 3640 }, { id: 'canarias', label: 'Canarias', value: 7447 }, { id: 'irlanda', label: 'Irlanda', value: 70273 }, { id: 'espana', label: 'España', value: 505990 }], source: 'Instituto Geográfico Nacional · fichas editoriales', updatedAt: '2026-01-01' },
  { id: 'orden-distancias', kind: 'order', prompt: 'Ordena estas distancias entre ciudades de menor a mayor.', unit: 'kilómetros', definition: 'Distancia en línea recta entre los centros urbanos.', category: 'distancias', direction: 'asc', items: [{ id: 'madrid-toledo', label: 'Madrid — Toledo', value: 67 }, { id: 'madrid-valencia', label: 'Madrid — Valencia', value: 303 }, { id: 'madrid-barcelona', label: 'Madrid — Barcelona', value: 505 }, { id: 'madrid-roma', label: 'Madrid — Roma', value: 1363 }], source: 'Cálculo geodésico editorial de Ronda', updatedAt: '2026-01-01' },
];

export function cifrasQuestionById(id: string, questions: readonly CifrasQuestion[] = CIFRAS_QUESTIONS): CifrasQuestion {
  return questions.find((question) => question.id === id) ?? firstOrThrow(questions, CIFRAS_QUESTIONS, 'Cifras');
}

export function cifrasQuestionIdsFor(
  category: CifrasCategory,
  mode: CifrasMode,
  questions: readonly CifrasQuestion[] = CIFRAS_QUESTIONS,
): string[] {
  const filtered = questions.filter(
    (question) =>
      (category === 'todo' || question.category === category) &&
      (mode === 'mixto' || (mode === 'estimacion' ? question.kind === 'estimate' : question.kind === 'order')),
  );
  const fallback = questions.filter(
    (question) => mode === 'mixto' || (mode === 'estimacion' ? question.kind === 'estimate' : question.kind === 'order'),
  );
  return (filtered.length > 0 ? filtered : fallback.length > 0 ? fallback : questions).map((question) => question.id);
}

export interface WhoQuestion {
  id: string;
  pack: WhoPack;
  prompt: string;
}

export const WHO_QUESTIONS: readonly WhoQuestion[] = [
  { id: 'who-01', pack: 'ligero', prompt: '¿Quién sobreviviría menos tiempo en una isla desierta?' },
  { id: 'who-02', pack: 'ligero', prompt: '¿Quién se reiría en el momento menos apropiado?' },
  { id: 'who-03', pack: 'ligero', prompt: '¿Quién acabaría siendo famoso por accidente?' },
  { id: 'who-04', pack: 'ligero', prompt: '¿Quién montaría un mueble sin mirar las instrucciones?' },
  { id: 'who-05', pack: 'fiesta', prompt: '¿Quién propondría salir cuando todo el mundo ya está en pijama?' },
  { id: 'who-06', pack: 'fiesta', prompt: '¿Quién elegiría la música de toda la noche?' },
  { id: 'who-07', pack: 'fiesta', prompt: '¿Quién haría amigos en la cola del baño?' },
  { id: 'who-08', pack: 'fiesta', prompt: '¿Quién acabaría organizando el próximo plan?' },
  { id: 'who-09', pack: 'incomodo', prompt: '¿Quién tardaría más en contestar un mensaje importante?' },
  { id: 'who-10', pack: 'incomodo', prompt: '¿Quién diría “me da igual” queriendo decir lo contrario?' },
  { id: 'who-11', pack: 'incomodo', prompt: '¿Quién se acordaría de una discusión de hace cinco años?' },
  { id: 'who-12', pack: 'incomodo', prompt: '¿Quién necesitaría tener la última palabra?' },
  { id: 'who-13', pack: 'parejas', prompt: '¿Quién elegiría mejor un regalo para la otra persona?' },
  { id: 'who-14', pack: 'parejas', prompt: '¿Quién olvidaría antes una fecha especial?' },
  { id: 'who-15', pack: 'parejas', prompt: '¿Quién prepararía una sorpresa más elaborada?' },
  { id: 'who-16', pack: 'parejas', prompt: '¿Quién pediría perdón primero?' },
  { id: 'who-17', pack: 'adulto', prompt: '¿Quién se atrevería a probar una experiencia nueva primero?' },
  { id: 'who-18', pack: 'adulto', prompt: '¿Quién tendría más facilidad para romper la tensión?' },
];

export function whoQuestionById(id: string, questions: readonly WhoQuestion[] = WHO_QUESTIONS): WhoQuestion {
  return questions.find((question) => question.id === id) ?? firstOrThrow(questions, WHO_QUESTIONS, 'Quién lo haría');
}

export function whoQuestionIdsFor(pack: WhoPack, questions: readonly WhoQuestion[] = WHO_QUESTIONS): string[] {
  const filtered = questions.filter((question) => question.pack === pack);
  return (filtered.length > 0 ? filtered : questions).map((question) => question.id);
}

export interface SentenceQuestion {
  id: string;
  pack: SentencePack;
  category: 'refran' | 'expresion' | 'original';
  prompt: string;
  canonicalAnswer: string;
  acceptedAnswers: string[];
  hint?: string;
}

export const SENTENCE_QUESTIONS: readonly SentenceQuestion[] = [
  { id: 'sentence-01', pack: 'refranes', category: 'refran', prompt: 'En abril, aguas ____.', canonicalAnswer: 'mil', acceptedAnswers: ['mil'], hint: 'Es un número pequeño, pero contundente.' },
  { id: 'sentence-02', pack: 'refranes', category: 'refran', prompt: 'Más vale pájaro en mano que ciento ____.', canonicalAnswer: 'volando', acceptedAnswers: ['volando'], hint: 'Lo contrario de estar posado.' },
  { id: 'sentence-03', pack: 'refranes', category: 'refran', prompt: 'El hábito no hace al ____.', canonicalAnswer: 'monje', acceptedAnswers: ['monje'], hint: 'Una persona que viste hábito.' },
  { id: 'sentence-04', pack: 'refranes', category: 'refran', prompt: 'No hay mal que por bien no ____.', canonicalAnswer: 'venga', acceptedAnswers: ['venga'], hint: 'Termina con un verbo.' },
  { id: 'sentence-05', pack: 'refranes', category: 'refran', prompt: 'A caballo regalado no le mires el ____.', canonicalAnswer: 'diente', acceptedAnswers: ['diente', 'dientes'], hint: 'Está en la boca del caballo.' },
  { id: 'sentence-06', pack: 'refranes', category: 'refran', prompt: 'Quien mucho abarca, poco ____.', canonicalAnswer: 'aprieta', acceptedAnswers: ['aprieta'], hint: 'Lo contrario de soltar.' },
  { id: 'sentence-07', pack: 'expresiones', category: 'expresion', prompt: 'Estar entre la espada y la ____.', canonicalAnswer: 'pared', acceptedAnswers: ['pared'], hint: 'Una superficie vertical.' },
  { id: 'sentence-08', pack: 'expresiones', category: 'expresion', prompt: 'Buscarle tres pies al ____.', canonicalAnswer: 'gato', acceptedAnswers: ['gato'], hint: 'Animal doméstico.' },
  { id: 'sentence-09', pack: 'expresiones', category: 'expresion', prompt: 'Poner toda la carne en el ____.', canonicalAnswer: 'asador', acceptedAnswers: ['asador'], hint: 'Donde se cocina a la brasa.' },
  { id: 'sentence-10', pack: 'originales', category: 'original', prompt: 'Una buena sobremesa siempre necesita una historia y un buen ____.', canonicalAnswer: 'postre', acceptedAnswers: ['postre'], hint: 'Llega al final de la comida.' },
  { id: 'sentence-11', pack: 'originales', category: 'original', prompt: 'La mejor estrategia para ganar es escuchar antes de ____.', canonicalAnswer: 'jugar', acceptedAnswers: ['jugar'], hint: 'Lo que haces durante una partida.' },
  { id: 'sentence-12', pack: 'originales', category: 'original', prompt: 'Si nadie quiere llevar la cuenta, la cuenta acaba llevando a ____.', canonicalAnswer: 'todos', acceptedAnswers: ['todos', 'todo el mundo'], hint: 'No se salva ninguna persona.' },
];

export function sentenceQuestionById(id: string, questions: readonly SentenceQuestion[] = SENTENCE_QUESTIONS): SentenceQuestion {
  return questions.find((question) => question.id === id) ?? firstOrThrow(questions, SENTENCE_QUESTIONS, 'Completa la frase');
}

export function sentenceQuestionIdsFor(pack: SentencePack, questions: readonly SentenceQuestion[] = SENTENCE_QUESTIONS): string[] {
  const filtered = questions.filter((question) => question.pack === pack);
  return (filtered.length > 0 ? filtered : questions).map((question) => question.id);
}
