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

export interface CifrasItem {
  id: string;
  label: string;
  value: number;
}

export interface OrderQuestion {
  id: string;
  kind: 'order';
  prompt: string;
  unit: string;
  definition: string;
  category: Exclude<CifrasCategory, 'todo'>;
  items: CifrasItem[];
  direction: 'asc' | 'desc';
  source: string;
  updatedAt: string;
}

export interface CompareQuestion {
  id: string;
  kind: 'compare';
  prompt: string;
  unit: string;
  definition: string;
  category: Exclude<CifrasCategory, 'todo'>;
  items: [CifrasItem, CifrasItem];
  correctOptionId: string;
  source: string;
  updatedAt: string;
}

export type CifrasQuestion = NumberQuestion | OrderQuestion | CompareQuestion;

type CifrasQuestionMeta = Pick<NumberQuestion, 'id' | 'prompt' | 'unit' | 'definition' | 'category'> &
  Partial<Pick<NumberQuestion, 'source' | 'updatedAt'>>;

const CIFRAS_EXTRA_SOURCE = 'Fichas editoriales de Ronda · banco ampliado';
const CIFRAS_EXTRA_DATE = '2026-01-01';

function makeEstimate(input: CifrasQuestionMeta & { referenceValue: number }): NumberQuestion {
  return {
    kind: 'estimate',
    source: CIFRAS_EXTRA_SOURCE,
    updatedAt: CIFRAS_EXTRA_DATE,
    ...input,
  };
}

function makeOrder(
  input: CifrasQuestionMeta & {
    items: CifrasItem[];
    direction: 'asc' | 'desc';
  },
): OrderQuestion {
  return {
    kind: 'order',
    source: CIFRAS_EXTRA_SOURCE,
    updatedAt: CIFRAS_EXTRA_DATE,
    ...input,
  };
}

function makeCompare(
  input: CifrasQuestionMeta & {
    items: [CifrasItem, CifrasItem];
    correctOptionId: string;
  },
): CompareQuestion {
  return {
    kind: 'compare',
    source: CIFRAS_EXTRA_SOURCE,
    updatedAt: CIFRAS_EXTRA_DATE,
    ...input,
  };
}

const CIFRAS_EXTRA_QUESTIONS: readonly CifrasQuestion[] = [
  makeEstimate({ id: 'altura-teide', prompt: '¿A qué altura está la cima del Teide?', unit: 'metros', definition: 'Altitud de la cima sobre el nivel del mar.', category: 'montanas', referenceValue: 3715 }),
  makeEstimate({ id: 'altura-fuji', prompt: '¿Cuántos metros mide el monte Fuji?', unit: 'metros', definition: 'Altitud de la cima sobre el nivel del mar.', category: 'montanas', referenceValue: 3776 }),
  makeEstimate({ id: 'altura-k2', prompt: '¿A qué altura llega el K2?', unit: 'metros', definition: 'Altitud de la cima sobre el nivel del mar.', category: 'montanas', referenceValue: 8611 }),
  makeEstimate({ id: 'altura-empire-state', prompt: '¿Cuánto mide el Empire State Building con su antena?', unit: 'metros', definition: 'Altura total hasta la parte superior de la antena.', category: 'edificios', referenceValue: 443 }),
  makeEstimate({ id: 'altura-cn-tower', prompt: '¿Qué altura tiene la CN Tower de Toronto?', unit: 'metros', definition: 'Altura total de la torre.', category: 'edificios', referenceValue: 553 }),
  makeEstimate({ id: 'altura-estatua-libertad', prompt: '¿Cuánto mide la Estatua de la Libertad desde el suelo hasta la antorcha?', unit: 'metros', definition: 'Altura total incluyendo pedestal y estatua.', category: 'edificios', referenceValue: 93 }),
  makeEstimate({ id: 'altura-taipei-101', prompt: '¿Cuántos metros mide el Taipei 101?', unit: 'metros', definition: 'Altura arquitectónica del edificio.', category: 'edificios', referenceValue: 508 }),
  makeEstimate({ id: 'longitud-golden-gate', prompt: '¿Cuánto mide el puente Golden Gate de extremo a extremo?', unit: 'metros', definition: 'Longitud total del puente.', category: 'distancias', referenceValue: 2737 }),
  makeEstimate({ id: 'longitud-canal-panama', prompt: '¿Qué longitud tiene el canal de Panamá?', unit: 'kilómetros', definition: 'Longitud aproximada de la vía navegable.', category: 'distancias', referenceValue: 82 }),
  makeEstimate({ id: 'longitud-eurotunel', prompt: '¿Cuántos kilómetros tiene el Eurotúnel?', unit: 'kilómetros', definition: 'Longitud total del túnel ferroviario bajo el canal de la Mancha.', category: 'distancias', referenceValue: 50.5 }),
  makeEstimate({ id: 'longitud-nilo', prompt: '¿Cuántos kilómetros recorre aproximadamente el río Nilo?', unit: 'kilómetros', definition: 'Longitud aproximada del curso fluvial.', category: 'distancias', referenceValue: 6650 }),
  makeEstimate({ id: 'longitud-gran-muralla', prompt: '¿Cuál es la longitud total aproximada de la Gran Muralla China?', unit: 'kilómetros', definition: 'Suma de los tramos y ramificaciones catalogados.', category: 'distancias', referenceValue: 21196 }),
  makeEstimate({ id: 'profundidad-mariana', prompt: '¿Qué profundidad alcanza aproximadamente la fosa de las Marianas?', unit: 'metros', definition: 'Profundidad máxima estimada en el abismo Challenger.', category: 'profundidad', referenceValue: 10984 }),
  makeEstimate({ id: 'longitud-gran-canyon', prompt: '¿Cuántos kilómetros tiene el Gran Cañón?', unit: 'kilómetros', definition: 'Longitud aproximada del cañón principal.', category: 'distancias', referenceValue: 446 }),
  makeEstimate({ id: 'superficie-sahara', prompt: '¿Qué superficie ocupa aproximadamente el desierto del Sahara?', unit: 'km²', definition: 'Extensión aproximada del desierto.', category: 'superficie', referenceValue: 9200000 }),
  makeEstimate({ id: 'superficie-africa', prompt: '¿Cuántos kilómetros cuadrados tiene África?', unit: 'km²', definition: 'Superficie territorial aproximada del continente.', category: 'superficie', referenceValue: 30370000 }),
  makeEstimate({ id: 'superficie-pacifico', prompt: '¿Qué superficie ocupa el océano Pacífico?', unit: 'km²', definition: 'Superficie aproximada del océano.', category: 'superficie', referenceValue: 165250000 }),
  makeEstimate({ id: 'superficie-lago-superior', prompt: '¿Qué superficie tiene el lago Superior?', unit: 'km²', definition: 'Superficie aproximada del lago.', category: 'superficie', referenceValue: 82100 }),
  makeEstimate({ id: 'volumen-baikal', prompt: '¿Cuántos kilómetros cúbicos de agua contiene el lago Baikal?', unit: 'km³', definition: 'Volumen aproximado de agua dulce del lago.', category: 'capacidad', referenceValue: 23615 }),
  makeEstimate({ id: 'distancia-luna', prompt: '¿A qué distancia media está la Luna de la Tierra?', unit: 'kilómetros', definition: 'Distancia media entre los centros de la Tierra y la Luna.', category: 'distancias', referenceValue: 384400 }),
  makeEstimate({ id: 'distancia-sol', prompt: '¿A qué distancia media está la Tierra del Sol?', unit: 'kilómetros', definition: 'Distancia media orbital, equivalente a una unidad astronómica.', category: 'distancias', referenceValue: 149600000 }),
  makeEstimate({ id: 'velocidad-luz', prompt: '¿A cuántos kilómetros por segundo viaja la luz en el vacío?', unit: 'km/s', definition: 'Valor de referencia de la velocidad de la luz en el vacío.', category: 'tecnologia', referenceValue: 299792 }),
  makeEstimate({ id: 'distancia-maraton', prompt: '¿Cuántos kilómetros tiene una maratón?', unit: 'kilómetros', definition: 'Distancia oficial de una carrera de maratón.', category: 'deporte', referenceValue: 42.195 }),
  makeEstimate({ id: 'poblacion-mundo-2024', prompt: '¿Cuántos millones de personas vivían en el mundo en 2024?', unit: 'millones de habitantes', definition: 'Estimación mundial de población para 2024.', category: 'poblacion', referenceValue: 8200, source: 'ONU · World Population Prospects 2024', updatedAt: '2024-07-11' }),
  makeEstimate({ id: 'poblacion-india-2024', prompt: '¿Cuántos millones de habitantes tenía India en 2024?', unit: 'millones de habitantes', definition: 'Estimación de población para 2024.', category: 'poblacion', referenceValue: 1451, source: 'ONU · World Population Prospects 2024', updatedAt: '2024-07-11' }),
  makeEstimate({ id: 'poblacion-china-2024', prompt: '¿Cuántos millones de habitantes tenía China en 2024?', unit: 'millones de habitantes', definition: 'Estimación de población para 2024.', category: 'poblacion', referenceValue: 1419, source: 'ONU · World Population Prospects 2024', updatedAt: '2024-07-11' }),
  makeEstimate({ id: 'poblacion-brasil-2024', prompt: '¿Cuántos millones de habitantes tenía Brasil en 2024?', unit: 'millones de habitantes', definition: 'Estimación de población para 2024.', category: 'poblacion', referenceValue: 212.6, source: 'ONU · World Population Prospects 2024', updatedAt: '2024-07-11' }),
  makeEstimate({ id: 'poblacion-japon-2024', prompt: '¿Cuántos millones de habitantes tenía Japón en 2024?', unit: 'millones de habitantes', definition: 'Estimación de población para 2024.', category: 'poblacion', referenceValue: 124.0, source: 'ONU · World Population Prospects 2024', updatedAt: '2024-07-11' }),
  makeEstimate({ id: 'poblacion-mexico-2024', prompt: '¿Cuántos millones de habitantes tenía México en 2024?', unit: 'millones de habitantes', definition: 'Estimación de población para 2024.', category: 'poblacion', referenceValue: 130.3, source: 'ONU · World Population Prospects 2024', updatedAt: '2024-07-11' }),
  makeEstimate({ id: 'poblacion-ue-2024', prompt: '¿Cuántos millones de habitantes tenía la Unión Europea en 2024?', unit: 'millones de habitantes', definition: 'Estimación de población de los 27 Estados miembros.', category: 'poblacion', referenceValue: 449.2, source: 'Eurostat · población de la Unión Europea en 2024', updatedAt: '2024-01-01' }),
  makeEstimate({ id: 'altura-sagrada-familia', prompt: '¿Qué altura tendrá la torre central de la Sagrada Familia?', unit: 'metros', definition: 'Altura proyectada de la torre de Jesucristo.', category: 'edificios', referenceValue: 172.5 }),
  makeEstimate({ id: 'capacidad-camp-nou', prompt: '¿Cuántos espectadores caben aproximadamente en el Camp Nou?', unit: 'espectadores', definition: 'Aforo de referencia del estadio.', category: 'capacidad', referenceValue: 99354 }),
  makeEstimate({ id: 'capacidad-wembley', prompt: '¿Cuál es el aforo aproximado del estadio de Wembley?', unit: 'espectadores', definition: 'Capacidad habitual para eventos deportivos.', category: 'capacidad', referenceValue: 90000 }),
  makeEstimate({ id: 'peso-ballena-azul', prompt: '¿Cuánto puede pesar una ballena azul adulta?', unit: 'kilogramos', definition: 'Peso máximo aproximado de un ejemplar adulto.', category: 'animales-objetos', referenceValue: 150000 }),
  makeEstimate({ id: 'altura-jirafa', prompt: '¿Cuánto mide una jirafa adulta?', unit: 'metros', definition: 'Altura aproximada hasta la cabeza.', category: 'animales-objetos', referenceValue: 5.5 }),

  makeOrder({ id: 'orden-torres-europa', prompt: 'Ordena estas construcciones por altura.', unit: 'metros', definition: 'Altura total aproximada de cada construcción.', category: 'edificios', direction: 'asc', items: [{ id: 'big-ben', label: 'Big Ben', value: 96 }, { id: 'eiffel-europa', label: 'Torre Eiffel', value: 330 }, { id: 'empire-europa', label: 'Empire State Building', value: 443 }, { id: 'cn-tower-europa', label: 'CN Tower', value: 553 }] }),
  makeOrder({ id: 'orden-montanas-pacifico', prompt: 'Ordena estas montañas de menor a mayor altitud.', unit: 'metros', definition: 'Altitud de la cima sobre el nivel del mar.', category: 'montanas', direction: 'asc', items: [{ id: 'teide-pacifico', label: 'Teide', value: 3715 }, { id: 'fuji-pacifico', label: 'Monte Fuji', value: 3776 }, { id: 'mont-blanc-pacifico', label: 'Mont Blanc', value: 4808 }, { id: 'k2-pacifico', label: 'K2', value: 8611 }] }),
  makeOrder({ id: 'orden-profundidades', prompt: 'Ordena estos lugares por profundidad, de menor a mayor.', unit: 'metros', definition: 'Profundidad máxima aproximada.', category: 'profundidad', direction: 'asc', items: [{ id: 'mar-muerto', label: 'Mar Muerto', value: 306 }, { id: 'tahoe', label: 'Lago Tahoe', value: 501 }, { id: 'baikal-profundidad', label: 'Lago Baikal', value: 1642 }, { id: 'marianas', label: 'Fosa de las Marianas', value: 10984 }] }),
  makeOrder({ id: 'orden-islas', prompt: 'Ordena estas islas por superficie, de menor a mayor.', unit: 'km²', definition: 'Superficie territorial aproximada.', category: 'superficie', direction: 'asc', items: [{ id: 'mallorca-islas', label: 'Mallorca', value: 3640 }, { id: 'creta', label: 'Creta', value: 8336 }, { id: 'irlanda-isla', label: 'Irlanda', value: 70273 }, { id: 'islandia', label: 'Islandia', value: 103000 }] }),
  makeOrder({ id: 'orden-paises-superficie', prompt: 'Ordena estos países por superficie, de menor a mayor.', unit: 'km²', definition: 'Superficie territorial aproximada.', category: 'superficie', direction: 'asc', items: [{ id: 'espana-superficie', label: 'España', value: 505990 }, { id: 'francia-superficie', label: 'Francia', value: 551695 }, { id: 'egipto', label: 'Egipto', value: 1002450 }, { id: 'india-superficie', label: 'India', value: 3287263 }] }),
  makeOrder({ id: 'orden-distancias-europa', prompt: 'Ordena estas distancias desde Madrid, de menor a mayor.', unit: 'kilómetros', definition: 'Distancia aproximada en línea recta entre los centros urbanos.', category: 'distancias', direction: 'asc', items: [{ id: 'madrid-toledo-europa', label: 'Toledo', value: 67 }, { id: 'madrid-valencia-europa', label: 'Valencia', value: 303 }, { id: 'madrid-paris', label: 'París', value: 1052 }, { id: 'madrid-roma-europa', label: 'Roma', value: 1363 }] }),
  makeOrder({ id: 'orden-rios', prompt: 'Ordena estos ríos por longitud, de menor a mayor.', unit: 'kilómetros', definition: 'Longitud aproximada del curso fluvial.', category: 'distancias', direction: 'asc', items: [{ id: 'tamesis', label: 'Támesis', value: 346 }, { id: 'danubio', label: 'Danubio', value: 2850 }, { id: 'amazonas', label: 'Amazonas', value: 6400 }, { id: 'nilo-orden', label: 'Nilo', value: 6650 }] }),
  makeOrder({ id: 'orden-oceanos', prompt: 'Ordena estos océanos por superficie, de menor a mayor.', unit: 'millones de km²', definition: 'Superficie aproximada de cada océano.', category: 'superficie', direction: 'asc', items: [{ id: 'artico', label: 'Ártico', value: 14.06 }, { id: 'indico', label: 'Índico', value: 70.56 }, { id: 'atlantico', label: 'Atlántico', value: 106.46 }, { id: 'pacifico', label: 'Pacífico', value: 165.25 }] }),
  makeOrder({ id: 'orden-planetas-sol', prompt: 'Ordena estos planetas según su distancia media al Sol.', unit: 'millones de kilómetros', definition: 'Distancia media orbital al Sol.', category: 'distancias', direction: 'asc', items: [{ id: 'mercurio', label: 'Mercurio', value: 57.9 }, { id: 'venus', label: 'Venus', value: 108.2 }, { id: 'tierra', label: 'Tierra', value: 149.6 }, { id: 'marte', label: 'Marte', value: 227.9 }] }),
  makeOrder({ id: 'orden-poblacion-europa', prompt: 'Ordena estos países por población, de menor a mayor.', unit: 'millones de habitantes', definition: 'Población aproximada en 2024.', category: 'poblacion', direction: 'asc', items: [{ id: 'portugal', label: 'Portugal', value: 10.4 }, { id: 'espana-poblacion-europa', label: 'España', value: 48.6 }, { id: 'alemania-poblacion-europa', label: 'Alemania', value: 83.5 }, { id: 'japon-poblacion-europa', label: 'Japón', value: 124.0 }], source: 'ONU · World Population Prospects 2024', updatedAt: '2024-07-11' }),
  makeOrder({ id: 'orden-poblacion-americas', prompt: 'Ordena estos países por población, de menor a mayor.', unit: 'millones de habitantes', definition: 'Población aproximada en 2024.', category: 'poblacion', direction: 'asc', items: [{ id: 'colombia', label: 'Colombia', value: 52.9 }, { id: 'mexico-poblacion-americas', label: 'México', value: 130.3 }, { id: 'brasil-poblacion-americas', label: 'Brasil', value: 212.6 }, { id: 'estados-unidos', label: 'Estados Unidos', value: 345.4 }], source: 'ONU · World Population Prospects 2024', updatedAt: '2024-07-11' }),
  makeOrder({ id: 'orden-estadios', prompt: 'Ordena estos estadios por aforo, de menor a mayor.', unit: 'espectadores', definition: 'Capacidad de referencia del estadio.', category: 'capacidad', direction: 'asc', items: [{ id: 'san-siro', label: 'San Siro', value: 75817 }, { id: 'bernabeu', label: 'Santiago Bernabéu', value: 84744 }, { id: 'wembley-orden', label: 'Wembley', value: 90000 }, { id: 'camp-nou-orden', label: 'Camp Nou', value: 99354 }] }),
  makeOrder({ id: 'orden-pib-paises', prompt: 'Ordena estos países por PIB nominal, de menor a mayor.', unit: 'billones de USD', definition: 'PIB nominal aproximado de 2024.', category: 'empresas', direction: 'asc', items: [{ id: 'espana-pib', label: 'España', value: 1.73 }, { id: 'italia-pib', label: 'Italia', value: 2.38 }, { id: 'francia-pib', label: 'Francia', value: 3.17 }, { id: 'alemania-pib', label: 'Alemania', value: 4.71 }], source: 'FMI · World Economic Outlook 2024', updatedAt: '2024-10-01' }),
  makeOrder({ id: 'orden-aeropuertos', prompt: 'Ordena estos aeropuertos por pasajeros, de menor a mayor.', unit: 'millones de pasajeros', definition: 'Pasajeros totales gestionados durante 2024.', category: 'distancias', direction: 'asc', items: [{ id: 'heathrow', label: 'Londres-Heathrow', value: 83.9 }, { id: 'dallas', label: 'Dallas-Fort Worth', value: 87.8 }, { id: 'dubai', label: 'Dubái', value: 92.3 }, { id: 'atlanta', label: 'Atlanta', value: 108.1 }], source: 'ACI World · tráfico aeroportuario 2024', updatedAt: '2024-12-31' }),
  makeOrder({ id: 'orden-puentes', prompt: 'Ordena estos puentes por longitud, de menor a mayor.', unit: 'kilómetros', definition: 'Longitud total aproximada de cada infraestructura.', category: 'distancias', direction: 'asc', items: [{ id: 'golden-gate', label: 'Golden Gate', value: 2.737 }, { id: 'akashi', label: 'Akashi Kaikyō', value: 3.911 }, { id: 'hong-kong-zhuhai', label: 'Hong Kong–Zhuhai–Macao', value: 55 }, { id: 'danyang', label: 'Viaducto Danyang–Kunshan', value: 164.8 }] }),
  makeOrder({ id: 'orden-altura-animales', prompt: 'Ordena estos animales por altura, de menor a mayor.', unit: 'metros', definition: 'Altura aproximada del animal adulto.', category: 'animales-objetos', direction: 'asc', items: [{ id: 'gato-altura', label: 'Gato', value: 0.25 }, { id: 'perro-altura', label: 'Perro', value: 0.6 }, { id: 'caballo-altura', label: 'Caballo', value: 1.7 }, { id: 'jirafa-altura', label: 'Jirafa', value: 5.5 }] }),
  makeOrder({ id: 'orden-costas', prompt: 'Ordena estos países por longitud de costa, de menor a mayor.', unit: 'kilómetros', definition: 'Longitud de costa aproximada según la medición geográfica de referencia.', category: 'distancias', direction: 'asc', items: [{ id: 'monaco-costa', label: 'Mónaco', value: 4.1 }, { id: 'espana-costa', label: 'España', value: 7268 }, { id: 'australia-costa', label: 'Australia', value: 25760 }, { id: 'canada-costa', label: 'Canadá', value: 202080 }] }),
  makeOrder({ id: 'orden-capacidad-datos', prompt: 'Ordena estos soportes por capacidad, de menor a mayor.', unit: 'GB', definition: 'Capacidad de almacenamiento de referencia.', category: 'tecnologia', direction: 'asc', items: [{ id: 'cd', label: 'CD', value: 0.7 }, { id: 'dvd', label: 'DVD', value: 4.7 }, { id: 'blu-ray', label: 'Blu-ray', value: 25 }, { id: 'ssd', label: 'SSD de 1 TB', value: 1000 }] }),
  makeOrder({ id: 'orden-fechas-historia', prompt: 'Ordena estos acontecimientos del más antiguo al más reciente.', unit: 'año', definition: 'Año aproximado en el que ocurrió cada hito.', category: 'historia', direction: 'asc', items: [{ id: 'imprenta', label: 'Imprenta de Gutenberg', value: 1440 }, { id: 'america', label: 'Llegada europea a América', value: 1492 }, { id: 'revolucion-industrial', label: 'Revolución Industrial', value: 1760 }, { id: 'luna', label: 'Llegada a la Luna', value: 1969 }] }),
  makeOrder({ id: 'orden-distancias-deportivas', prompt: 'Ordena estas pruebas por distancia, de menor a mayor.', unit: 'metros', definition: 'Distancia oficial o habitual de cada prueba.', category: 'deporte', direction: 'asc', items: [{ id: 'cien-metros', label: '100 metros', value: 100 }, { id: 'cuatrocientos', label: '400 metros', value: 400 }, { id: 'mil-quinientos', label: '1.500 metros', value: 1500 }, { id: 'maraton-deportiva', label: 'Maratón', value: 42195 }] }),
  makeOrder({ id: 'orden-ingresos-marcas-deporte', prompt: 'Ordena estas marcas deportivas por ingresos, de menor a mayor.', unit: 'millones de USD', definition: 'Ingresos aproximados del ejercicio 2024.', category: 'empresas', direction: 'asc', items: [{ id: 'under-armour', label: 'Under Armour', value: 5700 }, { id: 'puma', label: 'Puma', value: 8817 }, { id: 'adidas', label: 'Adidas', value: 23683 }, { id: 'nike-marcas', label: 'Nike', value: 51362 }], source: 'Informes anuales 2024 de cada empresa', updatedAt: '2024-12-31' }),
  makeOrder({ id: 'orden-poblacion-ciudades', prompt: 'Ordena estas ciudades por población, de menor a mayor.', unit: 'millones de habitantes', definition: 'Población aproximada del municipio.', category: 'poblacion', direction: 'asc', items: [{ id: 'sevilla', label: 'Sevilla', value: 0.7 }, { id: 'valencia', label: 'Valencia', value: 0.8 }, { id: 'barcelona-ciudad', label: 'Barcelona', value: 1.7 }, { id: 'madrid-ciudad', label: 'Madrid', value: 3.4 }] }),
  makeOrder({ id: 'orden-temperaturas', prompt: 'Ordena estas temperaturas de menor a mayor.', unit: '°C', definition: 'Temperaturas de referencia en condiciones normales.', category: 'tecnologia', direction: 'asc', items: [{ id: 'nitrogeno', label: 'Nitrógeno líquido', value: -196 }, { id: 'hielo-seco', label: 'Hielo seco', value: -78.5 }, { id: 'agua-congela', label: 'Agua al congelarse', value: 0 }, { id: 'horno', label: 'Horno doméstico', value: 200 }] }),
  makeOrder({ id: 'orden-cimas-paises', prompt: 'Ordena estos países por la altitud de su punto más alto.', unit: 'metros', definition: 'Altitud del punto natural más elevado del país.', category: 'montanas', direction: 'asc', items: [{ id: 'paises-bajos-cima', label: 'Países Bajos', value: 322 }, { id: 'belgica-cima', label: 'Bélgica', value: 694 }, { id: 'espana-cima', label: 'España', value: 3715 }, { id: 'nepal-cima', label: 'Nepal', value: 8849 }] }),
  makeOrder({ id: 'orden-lagos-superficie', prompt: 'Ordena estos lagos por superficie, de menor a mayor.', unit: 'km²', definition: 'Superficie aproximada del lago.', category: 'superficie', direction: 'asc', items: [{ id: 'tahoe-superficie', label: 'Lago Tahoe', value: 490 }, { id: 'baikal-superficie', label: 'Lago Baikal', value: 31500 }, { id: 'victoria-superficie', label: 'Lago Victoria', value: 68870 }, { id: 'superior-superficie', label: 'Lago Superior', value: 82100 }] }),
  makeOrder({ id: 'orden-duraciones', prompt: 'Ordena estos periodos por duración, de menor a mayor.', unit: 'horas', definition: 'Duración aproximada del periodo.', category: 'cultura', direction: 'asc', items: [{ id: 'dia', label: 'Un día', value: 24 }, { id: 'semana', label: 'Una semana', value: 168 }, { id: 'mes', label: 'Un mes', value: 720 }, { id: 'ano', label: 'Un año', value: 8760 }] }),
  makeOrder({ id: 'orden-velocidad-animales', prompt: 'Ordena estos animales por velocidad máxima, de menor a mayor.', unit: 'km/h', definition: 'Velocidad máxima aproximada.', category: 'animales-objetos', direction: 'asc', items: [{ id: 'tortuga-velocidad', label: 'Tortuga', value: 0.3 }, { id: 'humano-velocidad', label: 'Persona corriendo', value: 13 }, { id: 'caballo-velocidad', label: 'Caballo', value: 88 }, { id: 'guepardo-velocidad', label: 'Guepardo', value: 110 }] }),
  makeOrder({ id: 'orden-duracion-peliculas', prompt: 'Ordena estas películas por duración, de menor a mayor.', unit: 'minutos', definition: 'Duración aproximada de la versión cinematográfica principal.', category: 'cultura', direction: 'asc', items: [{ id: 'toy-story', label: 'Toy Story', value: 81 }, { id: 'coco', label: 'Coco', value: 105 }, { id: 'endgame', label: 'Vengadores: Endgame', value: 181 }, { id: 'titanic', label: 'Titanic', value: 195 }] }),
  makeOrder({ id: 'orden-edades-arboles', prompt: 'Ordena estos árboles por longevidad máxima, de menor a mayor.', unit: 'años', definition: 'Edad máxima aproximada que puede alcanzar la especie.', category: 'animales-objetos', direction: 'asc', items: [{ id: 'olivo', label: 'Olivo', value: 100 }, { id: 'roble', label: 'Roble', value: 500 }, { id: 'secuoya', label: 'Secuoya gigante', value: 2000 }, { id: 'pino-bristlecone', label: 'Pino longevo', value: 4800 }] }),
  makeOrder({ id: 'orden-museos-visitas', prompt: 'Ordena estos museos por visitantes anuales, de mayor a menor.', unit: 'millones de visitantes', definition: 'Visitantes anuales aproximados de referencia.', category: 'cultura', direction: 'desc', items: [{ id: 'prado', label: 'Museo del Prado', value: 3.3 }, { id: 'british-museum', label: 'British Museum', value: 6.4 }, { id: 'vaticano', label: 'Museos Vaticanos', value: 6.8 }, { id: 'louvre', label: 'Louvre', value: 8.7 }] }),
  makeOrder({ id: 'orden-videojuegos-ventas', prompt: 'Ordena estos videojuegos por copias vendidas, de mayor a menor.', unit: 'millones de copias', definition: 'Ventas acumuladas aproximadas.', category: 'tecnologia', direction: 'desc', items: [{ id: 'mario-kart-8', label: 'Mario Kart 8 Deluxe', value: 70 }, { id: 'wii-sports', label: 'Wii Sports', value: 82.9 }, { id: 'gta-v', label: 'GTA V', value: 200 }, { id: 'minecraft', label: 'Minecraft', value: 300 }] }),
  makeOrder({ id: 'orden-islas-canarias', prompt: 'Ordena estas islas por superficie, de menor a mayor.', unit: 'km²', definition: 'Superficie territorial aproximada.', category: 'superficie', direction: 'asc', items: [{ id: 'gomera', label: 'La Gomera', value: 369.8 }, { id: 'ibiza', label: 'Ibiza', value: 572.6 }, { id: 'gran-canaria', label: 'Gran Canaria', value: 1560.1 }, { id: 'tenerife', label: 'Tenerife', value: 2034.4 }] }),

  makeCompare({ id: 'comparar-everest-k2', prompt: '¿Qué montaña es más alta?', unit: 'metros', definition: 'Altitud de la cima sobre el nivel del mar.', category: 'montanas', items: [{ id: 'everest-choice', label: 'Everest', value: 8849 }, { id: 'k2-choice', label: 'K2', value: 8611 }], correctOptionId: 'everest-choice' }),
  makeCompare({ id: 'comparar-francia-espana', prompt: '¿Qué país tiene más superficie?', unit: 'km²', definition: 'Superficie territorial aproximada.', category: 'superficie', items: [{ id: 'francia-choice', label: 'Francia', value: 551695 }, { id: 'espana-choice', label: 'España', value: 505990 }], correctOptionId: 'francia-choice' }),
  makeCompare({ id: 'comparar-pacifico-atlantico', prompt: '¿Qué océano ocupa más superficie?', unit: 'millones de km²', definition: 'Superficie aproximada del océano.', category: 'superficie', items: [{ id: 'pacifico-choice', label: 'Pacífico', value: 165.25 }, { id: 'atlantico-choice', label: 'Atlántico', value: 106.46 }], correctOptionId: 'pacifico-choice' }),
  makeCompare({ id: 'comparar-nilo-amazonas', prompt: '¿Qué río es más largo según estas mediciones de referencia?', unit: 'kilómetros', definition: 'Longitud aproximada del curso fluvial.', category: 'distancias', items: [{ id: 'nilo-choice', label: 'Nilo', value: 6650 }, { id: 'amazonas-choice', label: 'Amazonas', value: 6400 }], correctOptionId: 'nilo-choice' }),
  makeCompare({ id: 'comparar-baikal-tahoe', prompt: '¿Qué lago es más profundo?', unit: 'metros', definition: 'Profundidad máxima aproximada.', category: 'profundidad', items: [{ id: 'baikal-choice', label: 'Baikal', value: 1642 }, { id: 'tahoe-choice', label: 'Tahoe', value: 501 }], correctOptionId: 'baikal-choice' }),
  makeCompare({ id: 'comparar-madrid-roma-paris', prompt: 'Desde Madrid, ¿qué ciudad está más lejos en línea recta?', unit: 'kilómetros', definition: 'Distancia aproximada entre los centros urbanos.', category: 'distancias', items: [{ id: 'roma-choice', label: 'Roma', value: 1363 }, { id: 'paris-choice', label: 'París', value: 1052 }], correctOptionId: 'roma-choice' }),
  makeCompare({ id: 'comparar-brasil-mexico', prompt: '¿Qué país tenía más población en 2024?', unit: 'millones de habitantes', definition: 'Estimación de población para 2024.', category: 'poblacion', items: [{ id: 'brasil-choice', label: 'Brasil', value: 212.6 }, { id: 'mexico-choice', label: 'México', value: 130.3 }], correctOptionId: 'brasil-choice', source: 'ONU · World Population Prospects 2024', updatedAt: '2024-07-11' }),
  makeCompare({ id: 'comparar-mexico-japon', prompt: '¿Qué país tenía más población en 2024?', unit: 'millones de habitantes', definition: 'Estimación de población para 2024.', category: 'poblacion', items: [{ id: 'mexico-choice-2', label: 'México', value: 130.3 }, { id: 'japon-choice', label: 'Japón', value: 124.0 }], correctOptionId: 'mexico-choice-2', source: 'ONU · World Population Prospects 2024', updatedAt: '2024-07-11' }),
  makeCompare({ id: 'comparar-alemania-francia', prompt: '¿Qué país tenía más población en 2024?', unit: 'millones de habitantes', definition: 'Estimación de población para 2024.', category: 'poblacion', items: [{ id: 'alemania-choice', label: 'Alemania', value: 83.5 }, { id: 'francia-choice-2', label: 'Francia', value: 68.4 }], correctOptionId: 'alemania-choice', source: 'ONU · World Population Prospects 2024', updatedAt: '2024-07-11' }),
  makeCompare({ id: 'comparar-australia-india', prompt: '¿Qué país ocupa más superficie?', unit: 'millones de km²', definition: 'Superficie territorial aproximada.', category: 'superficie', items: [{ id: 'australia-choice', label: 'Australia', value: 7.688 }, { id: 'india-choice', label: 'India', value: 3.287 }], correctOptionId: 'australia-choice' }),
  makeCompare({ id: 'comparar-campnou-wembley', prompt: '¿Qué estadio tiene más aforo?', unit: 'espectadores', definition: 'Capacidad de referencia del estadio.', category: 'capacidad', items: [{ id: 'campnou-choice', label: 'Camp Nou', value: 99354 }, { id: 'wembley-choice', label: 'Wembley', value: 90000 }], correctOptionId: 'campnou-choice' }),
  makeCompare({ id: 'comparar-bernabeu-sansiro', prompt: '¿Qué estadio tiene más aforo?', unit: 'espectadores', definition: 'Capacidad de referencia del estadio.', category: 'capacidad', items: [{ id: 'bernabeu-choice', label: 'Santiago Bernabéu', value: 84744 }, { id: 'sansiro-choice', label: 'San Siro', value: 75817 }], correctOptionId: 'bernabeu-choice' }),
  makeCompare({ id: 'comparar-apple-microsoft', prompt: '¿Qué empresa tuvo más ingresos en 2024?', unit: 'millones de USD', definition: 'Ingresos reportados en el ejercicio fiscal de referencia.', category: 'empresas', items: [{ id: 'apple-choice', label: 'Apple', value: 391035 }, { id: 'microsoft-choice', label: 'Microsoft', value: 245122 }], correctOptionId: 'apple-choice', source: 'Informes anuales de Apple y Microsoft · ejercicio 2024', updatedAt: '2024-12-31' }),
  makeCompare({ id: 'comparar-walmart-amazon', prompt: '¿Qué empresa facturó más en 2024?', unit: 'millones de USD', definition: 'Ingresos reportados en el ejercicio de referencia.', category: 'empresas', items: [{ id: 'walmart-choice', label: 'Walmart', value: 648125 }, { id: 'amazon-choice', label: 'Amazon', value: 637959 }], correctOptionId: 'walmart-choice', source: 'Informes anuales de Walmart y Amazon · ejercicio 2024', updatedAt: '2024-12-31' }),
  makeCompare({ id: 'comparar-netflix-spotify', prompt: '¿Qué empresa tuvo más ingresos en 2024?', unit: 'millones de USD', definition: 'Ingresos reportados durante 2024.', category: 'empresas', items: [{ id: 'netflix-choice', label: 'Netflix', value: 39000 }, { id: 'spotify-choice', label: 'Spotify', value: 15900 }], correctOptionId: 'netflix-choice', source: 'Informes anuales de Netflix y Spotify · 2024', updatedAt: '2024-12-31' }),
  makeCompare({ id: 'comparar-nike-adidas', prompt: '¿Qué marca tuvo más ingresos en 2024?', unit: 'millones de USD', definition: 'Ingresos reportados durante 2024.', category: 'empresas', items: [{ id: 'nike-choice', label: 'Nike', value: 51362 }, { id: 'adidas-choice', label: 'Adidas', value: 23683 }], correctOptionId: 'nike-choice', source: 'Informes anuales de Nike y Adidas · 2024', updatedAt: '2024-12-31' }),
  makeCompare({ id: 'comparar-starbucks-mcdonalds', prompt: '¿Qué empresa tuvo más ingresos en 2024?', unit: 'millones de USD', definition: 'Ingresos reportados durante 2024.', category: 'empresas', items: [{ id: 'starbucks-choice', label: 'Starbucks', value: 36176 }, { id: 'mcdonalds-choice', label: 'McDonald’s', value: 25920 }], correctOptionId: 'starbucks-choice', source: 'Informes anuales de Starbucks y McDonald’s · 2024', updatedAt: '2024-12-31' }),
  makeCompare({ id: 'comparar-byd-tesla', prompt: '¿Qué fabricante entregó más vehículos en 2024?', unit: 'millones de vehículos', definition: 'Vehículos entregados o vendidos mundialmente durante 2024.', category: 'empresas', items: [{ id: 'byd-choice', label: 'BYD', value: 4.27 }, { id: 'tesla-choice', label: 'Tesla', value: 1.79 }], correctOptionId: 'byd-choice', source: 'Resultados mundiales publicados por BYD y Tesla · 2024', updatedAt: '2024-12-31' }),
  makeCompare({ id: 'comparar-apple-samsung-moviles', prompt: '¿Qué marca envió más smartphones en 2024?', unit: 'millones de smartphones', definition: 'Envíos mundiales aproximados durante 2024.', category: 'tecnologia', items: [{ id: 'apple-moviles-choice', label: 'Apple', value: 232.1 }, { id: 'samsung-moviles-choice', label: 'Samsung', value: 223.4 }], correctOptionId: 'apple-moviles-choice', source: 'IDC · envíos mundiales de smartphones 2024', updatedAt: '2024-12-31' }),
  makeCompare({ id: 'comparar-xiaomi-transsion', prompt: '¿Qué marca envió más smartphones en 2024?', unit: 'millones de smartphones', definition: 'Envíos mundiales aproximados durante 2024.', category: 'tecnologia', items: [{ id: 'xiaomi-choice', label: 'Xiaomi', value: 168.5 }, { id: 'transsion-choice', label: 'Transsion', value: 106.7 }], correctOptionId: 'xiaomi-choice', source: 'IDC · envíos mundiales de smartphones 2024', updatedAt: '2024-12-31' }),
  makeCompare({ id: 'comparar-mundiales-brasil-alemania', prompt: '¿Qué selección ha ganado más Mundiales de fútbol?', unit: 'títulos', definition: 'Títulos de la Copa Mundial masculina hasta 2022.', category: 'deporte', items: [{ id: 'brasil-futbol-choice', label: 'Brasil', value: 5 }, { id: 'alemania-futbol-choice', label: 'Alemania', value: 4 }], correctOptionId: 'brasil-futbol-choice', source: 'FIFA · palmarés de la Copa Mundial', updatedAt: '2022-12-18' }),
  makeCompare({ id: 'comparar-bolt-gay', prompt: '¿Quién tiene el récord de 100 metros más rápido?', unit: 'segundos', definition: 'Mejor marca personal oficial; un tiempo menor es más rápido.', category: 'deporte', items: [{ id: 'bolt-choice', label: 'Usain Bolt', value: 9.58 }, { id: 'gay-choice', label: 'Tyson Gay', value: 9.69 }], correctOptionId: 'bolt-choice', source: 'World Athletics · récords y mejores marcas', updatedAt: '2026-01-01' }),
  makeCompare({ id: 'comparar-ballena-elefante', prompt: '¿Qué animal pesa más?', unit: 'kilogramos', definition: 'Peso máximo aproximado de un adulto.', category: 'animales-objetos', items: [{ id: 'ballena-choice', label: 'Ballena azul', value: 150000 }, { id: 'elefante-choice', label: 'Elefante africano', value: 6000 }], correctOptionId: 'ballena-choice' }),
  makeCompare({ id: 'comparar-jirafa-avestruz', prompt: '¿Qué animal es más alto?', unit: 'metros', definition: 'Altura aproximada del animal adulto.', category: 'animales-objetos', items: [{ id: 'jirafa-choice', label: 'Jirafa', value: 5.5 }, { id: 'avestruz-choice', label: 'Avestruz', value: 2.7 }], correctOptionId: 'jirafa-choice' }),
  makeCompare({ id: 'comparar-guepardo-caballo', prompt: '¿Qué animal alcanza más velocidad?', unit: 'km/h', definition: 'Velocidad máxima aproximada.', category: 'animales-objetos', items: [{ id: 'guepardo-choice', label: 'Guepardo', value: 110 }, { id: 'caballo-choice', label: 'Caballo', value: 88 }], correctOptionId: 'guepardo-choice' }),
  makeCompare({ id: 'comparar-secuoya-roble', prompt: '¿Qué árbol puede alcanzar más altura?', unit: 'metros', definition: 'Altura máxima aproximada de la especie.', category: 'animales-objetos', items: [{ id: 'secuoya-choice', label: 'Secuoya roja', value: 115 }, { id: 'roble-choice', label: 'Roble', value: 40 }], correctOptionId: 'secuoya-choice' }),
  makeCompare({ id: 'comparar-avion-luna', prompt: '¿Qué hito ocurrió más tarde?', unit: 'año', definition: 'Año aproximado del acontecimiento.', category: 'historia', items: [{ id: 'avion-choice', label: 'Primer vuelo de los Wright', value: 1903 }, { id: 'luna-choice', label: 'Llegada a la Luna', value: 1969 }], correctOptionId: 'luna-choice' }),
  makeCompare({ id: 'comparar-minecraft-gta', prompt: '¿Qué videojuego ha vendido más copias?', unit: 'millones de copias', definition: 'Ventas acumuladas aproximadas.', category: 'tecnologia', items: [{ id: 'minecraft-choice', label: 'Minecraft', value: 300 }, { id: 'gta-choice', label: 'GTA V', value: 200 }], correctOptionId: 'minecraft-choice' }),
  makeCompare({ id: 'comparar-minecraft-wii', prompt: '¿Qué videojuego ha vendido más copias?', unit: 'millones de copias', definition: 'Ventas acumuladas aproximadas.', category: 'tecnologia', items: [{ id: 'minecraft-choice-2', label: 'Minecraft', value: 300 }, { id: 'wii-choice', label: 'Wii Sports', value: 82.9 }], correctOptionId: 'minecraft-choice-2' }),
  makeCompare({ id: 'comparar-atlanta-dubai', prompt: '¿Qué aeropuerto tuvo más pasajeros en 2024?', unit: 'millones de pasajeros', definition: 'Pasajeros totales gestionados durante 2024.', category: 'distancias', items: [{ id: 'atlanta-choice', label: 'Atlanta', value: 108.1 }, { id: 'dubai-choice', label: 'Dubái', value: 92.3 }], correctOptionId: 'atlanta-choice', source: 'ACI World · tráfico aeroportuario 2024', updatedAt: '2024-12-31' }),
  makeCompare({ id: 'comparar-pacifico-indico', prompt: '¿Qué océano ocupa más superficie?', unit: 'millones de km²', definition: 'Superficie aproximada del océano.', category: 'superficie', items: [{ id: 'pacifico-choice-2', label: 'Pacífico', value: 165.25 }, { id: 'indico-choice', label: 'Índico', value: 70.56 }], correctOptionId: 'pacifico-choice-2' }),
  makeCompare({ id: 'comparar-australia-groenlandia', prompt: '¿Qué territorio ocupa más superficie?', unit: 'millones de km²', definition: 'Superficie territorial aproximada.', category: 'superficie', items: [{ id: 'australia-choice-2', label: 'Australia', value: 7.688 }, { id: 'groenlandia-choice', label: 'Groenlandia', value: 2.166 }], correctOptionId: 'australia-choice-2' }),
  makeCompare({ id: 'comparar-superior-victoria', prompt: '¿Qué lago tiene más superficie?', unit: 'km²', definition: 'Superficie aproximada del lago.', category: 'superficie', items: [{ id: 'superior-choice', label: 'Lago Superior', value: 82100 }, { id: 'victoria-choice', label: 'Lago Victoria', value: 68870 }], correctOptionId: 'superior-choice' }),
  makeCompare({ id: 'comparar-madrid-roma-barcelona', prompt: 'Desde Madrid, ¿qué ciudad está más lejos en línea recta?', unit: 'kilómetros', definition: 'Distancia aproximada entre los centros urbanos.', category: 'distancias', items: [{ id: 'roma-choice-2', label: 'Roma', value: 1363 }, { id: 'barcelona-choice', label: 'Barcelona', value: 505 }], correctOptionId: 'roma-choice-2' }),
  makeEstimate({ id: 'altura-one-world-trade', prompt: '¿Cuánto mide el One World Trade Center?', unit: 'metros', definition: 'Altura arquitectónica total del edificio.', category: 'edificios', referenceValue: 541 }),
  makeEstimate({ id: 'altura-shanghai-tower', prompt: '¿Cuánto mide la Shanghai Tower?', unit: 'metros', definition: 'Altura arquitectónica total del edificio.', category: 'edificios', referenceValue: 632 }),
  makeEstimate({ id: 'altura-lotte-world', prompt: '¿Qué altura tiene la Lotte World Tower?', unit: 'metros', definition: 'Altura arquitectónica total del edificio.', category: 'edificios', referenceValue: 555 }),
  makeEstimate({ id: 'altura-cristo-redentor', prompt: '¿Cuánto mide el Cristo Redentor con su pedestal?', unit: 'metros', definition: 'Altura total aproximada del monumento.', category: 'edificios', referenceValue: 38.5 }),
  makeEstimate({ id: 'longitud-metro-moscu', prompt: '¿Cuántos kilómetros tiene aproximadamente el metro de Moscú?', unit: 'kilómetros', definition: 'Longitud aproximada de la red en servicio.', category: 'distancias', referenceValue: 800 }),
  makeEstimate({ id: 'distancia-madrid-lisboa', prompt: '¿Qué distancia en línea recta hay entre Madrid y Lisboa?', unit: 'kilómetros', definition: 'Distancia aproximada entre los centros urbanos.', category: 'distancias', referenceValue: 504 }),
  makeEstimate({ id: 'distancia-barcelona-roma', prompt: '¿Qué distancia en línea recta hay entre Barcelona y Roma?', unit: 'kilómetros', definition: 'Distancia aproximada entre los centros urbanos.', category: 'distancias', referenceValue: 859 }),
  makeEstimate({ id: 'longitud-yangtze', prompt: '¿Cuántos kilómetros recorre aproximadamente el río Yangtsé?', unit: 'kilómetros', definition: 'Longitud aproximada del curso fluvial.', category: 'distancias', referenceValue: 6300 }),
  makeEstimate({ id: 'longitud-mississippi', prompt: '¿Cuánto mide aproximadamente el sistema del Misisipi?', unit: 'kilómetros', definition: 'Longitud aproximada del sistema fluvial.', category: 'distancias', referenceValue: 6275 }),
  makeEstimate({ id: 'profundidad-caspio', prompt: '¿Cuál es la profundidad máxima del mar Caspio?', unit: 'metros', definition: 'Profundidad máxima aproximada.', category: 'profundidad', referenceValue: 1025 }),
  makeEstimate({ id: 'superficie-europa', prompt: '¿Qué superficie ocupa Europa?', unit: 'km²', definition: 'Superficie aproximada del continente.', category: 'superficie', referenceValue: 10180000 }),
  makeEstimate({ id: 'superficie-australia', prompt: '¿Cuántos kilómetros cuadrados tiene Australia?', unit: 'km²', definition: 'Superficie territorial aproximada.', category: 'superficie', referenceValue: 7688000 }),
  makeEstimate({ id: 'superficie-mediterraneo', prompt: '¿Qué superficie tiene el mar Mediterráneo?', unit: 'km²', definition: 'Superficie aproximada del mar.', category: 'superficie', referenceValue: 2500000 }),
  makeEstimate({ id: 'superficie-groenlandia', prompt: '¿Qué superficie tiene Groenlandia?', unit: 'km²', definition: 'Superficie territorial aproximada.', category: 'superficie', referenceValue: 2166000 }),
  makeEstimate({ id: 'volumen-mediterraneo', prompt: '¿Cuántos kilómetros cúbicos de agua contiene el Mediterráneo?', unit: 'km³', definition: 'Volumen aproximado de agua del mar.', category: 'capacidad', referenceValue: 3750000 }),
  makeEstimate({ id: 'capacidad-piscina-olimpica', prompt: '¿Cuántos litros de agua caben en una piscina olímpica?', unit: 'litros', definition: 'Volumen aproximado de una piscina olímpica estándar.', category: 'capacidad', referenceValue: 2500000 }),
  makeEstimate({ id: 'poblacion-eeuu-2024', prompt: '¿Cuántos millones de habitantes tenía Estados Unidos en 2024?', unit: 'millones de habitantes', definition: 'Estimación de población para 2024.', category: 'poblacion', referenceValue: 345.4, source: 'ONU · World Population Prospects 2024', updatedAt: '2024-07-11' }),
  makeEstimate({ id: 'poblacion-indonesia-2024', prompt: '¿Cuántos millones de habitantes tenía Indonesia en 2024?', unit: 'millones de habitantes', definition: 'Estimación de población para 2024.', category: 'poblacion', referenceValue: 283.5, source: 'ONU · World Population Prospects 2024', updatedAt: '2024-07-11' }),
  makeEstimate({ id: 'poblacion-nigeria-2024', prompt: '¿Cuántos millones de habitantes tenía Nigeria en 2024?', unit: 'millones de habitantes', definition: 'Estimación de población para 2024.', category: 'poblacion', referenceValue: 232.7, source: 'ONU · World Population Prospects 2024', updatedAt: '2024-07-11' }),
  makeEstimate({ id: 'poblacion-pakistan-2024', prompt: '¿Cuántos millones de habitantes tenía Pakistán en 2024?', unit: 'millones de habitantes', definition: 'Estimación de población para 2024.', category: 'poblacion', referenceValue: 251.3, source: 'ONU · World Population Prospects 2024', updatedAt: '2024-07-11' }),
  makeEstimate({ id: 'poblacion-bangladesh-2024', prompt: '¿Cuántos millones de habitantes tenía Bangladés en 2024?', unit: 'millones de habitantes', definition: 'Estimación de población para 2024.', category: 'poblacion', referenceValue: 173.6, source: 'ONU · World Population Prospects 2024', updatedAt: '2024-07-11' }),
  makeEstimate({ id: 'capacidad-maracana', prompt: '¿Cuál es el aforo aproximado del estadio Maracaná?', unit: 'espectadores', definition: 'Capacidad de referencia del estadio.', category: 'capacidad', referenceValue: 78838 }),
  makeEstimate({ id: 'capacidad-o2-arena', prompt: '¿Cuántos espectadores caben en el O2 Arena de Londres?', unit: 'espectadores', definition: 'Aforo máximo aproximado para eventos.', category: 'capacidad', referenceValue: 20000 }),
  makeEstimate({ id: 'peso-elefante-africano', prompt: '¿Cuánto puede pesar un elefante africano adulto?', unit: 'kilogramos', definition: 'Peso máximo aproximado de un ejemplar adulto.', category: 'animales-objetos', referenceValue: 6000 }),
  makeEstimate({ id: 'velocidad-guepardo', prompt: '¿A qué velocidad máxima puede correr un guepardo?', unit: 'km/h', definition: 'Velocidad máxima aproximada en una carrera corta.', category: 'animales-objetos', referenceValue: 110 }),
  makeEstimate({ id: 'envergadura-a380', prompt: '¿Cuántos metros mide de ancho un Airbus A380?', unit: 'metros', definition: 'Envergadura aproximada del avión.', category: 'tecnologia', referenceValue: 79.75 }),
  makeEstimate({ id: 'circunferencia-tierra', prompt: '¿Cuál es la circunferencia aproximada de la Tierra por el ecuador?', unit: 'kilómetros', definition: 'Longitud aproximada del ecuador terrestre.', category: 'distancias', referenceValue: 40075 }),
  makeEstimate({ id: 'dia-jupiter', prompt: '¿Cuántas horas dura aproximadamente un día en Júpiter?', unit: 'horas', definition: 'Duración aproximada de una rotación completa.', category: 'tecnologia', referenceValue: 9.9 }),
  makeEstimate({ id: 'edad-tierra', prompt: '¿Cuántos millones de años tiene aproximadamente la Tierra?', unit: 'millones de años', definition: 'Edad estimada del planeta.', category: 'historia', referenceValue: 4540 }),
  makeEstimate({ id: 'latidos-dia', prompt: '¿Cuántos latidos da aproximadamente un corazón humano en un día?', unit: 'latidos', definition: 'Estimación orientativa para una frecuencia media.', category: 'animales-objetos', referenceValue: 100000 }),
  makeEstimate({ id: 'altura-petronas', prompt: '¿Cuánto miden las Torres Petronas?', unit: 'metros', definition: 'Altura arquitectónica aproximada de cada torre.', category: 'edificios', referenceValue: 452.6 }),

  makeOrder({ id: 'orden-torres-asia', prompt: 'Ordena estos rascacielos por altura, de mayor a menor.', unit: 'metros', definition: 'Altura arquitectónica total.', category: 'edificios', direction: 'desc', items: [{ id: 'petronas-asia', label: 'Torres Petronas', value: 452.6 }, { id: 'taipei-asia', label: 'Taipei 101', value: 508 }, { id: 'lotte-asia', label: 'Lotte World Tower', value: 555 }, { id: 'shanghai-asia', label: 'Shanghai Tower', value: 632 }] }),
  makeOrder({ id: 'orden-monumentos', prompt: 'Ordena estos monumentos por altura, de menor a mayor.', unit: 'metros', definition: 'Altura total aproximada del monumento.', category: 'edificios', direction: 'asc', items: [{ id: 'cristo-monumentos', label: 'Cristo Redentor', value: 38.5 }, { id: 'pisa-monumentos', label: 'Torre de Pisa', value: 57 }, { id: 'estatua-monumentos', label: 'Estatua de la Libertad', value: 93 }, { id: 'big-ben-monumentos', label: 'Big Ben', value: 96 }] }),
  makeOrder({ id: 'orden-rios-largos', prompt: 'Ordena estos ríos por longitud, de menor a mayor.', unit: 'kilómetros', definition: 'Longitud aproximada del curso fluvial.', category: 'distancias', direction: 'asc', items: [{ id: 'ebro-largo', label: 'Ebro', value: 930 }, { id: 'danubio-largo', label: 'Danubio', value: 2850 }, { id: 'misisipi-largo', label: 'Misisipi', value: 6275 }, { id: 'yangtse-largo', label: 'Yangtsé', value: 6300 }] }),
  makeOrder({ id: 'orden-profundidades-oceanos', prompt: 'Ordena estos lugares por profundidad, de menor a mayor.', unit: 'metros', definition: 'Profundidad máxima aproximada.', category: 'profundidad', direction: 'asc', items: [{ id: 'mar-muerto-oceanos', label: 'Mar Muerto', value: 306 }, { id: 'baltico', label: 'Mar Báltico', value: 459 }, { id: 'caspio-oceanos', label: 'Mar Caspio', value: 1025 }, { id: 'mediterraneo-profundo', label: 'Mar Mediterráneo', value: 5267 }] }),
  makeOrder({ id: 'orden-continentes', prompt: 'Ordena estos continentes por superficie, de menor a mayor.', unit: 'millones de km²', definition: 'Superficie aproximada del continente.', category: 'superficie', direction: 'asc', items: [{ id: 'australia-continentes', label: 'Australia', value: 7.688 }, { id: 'europa-continentes', label: 'Europa', value: 10.18 }, { id: 'antartida', label: 'Antártida', value: 14.2 }, { id: 'africa-continentes', label: 'África', value: 30.37 }] }),
  makeOrder({ id: 'orden-paises-grandes', prompt: 'Ordena estos países por superficie, de menor a mayor.', unit: 'miles de km²', definition: 'Superficie territorial aproximada.', category: 'superficie', direction: 'asc', items: [{ id: 'portugal-grande', label: 'Portugal', value: 92 }, { id: 'espana-grande', label: 'España', value: 506 }, { id: 'egipto-grande', label: 'Egipto', value: 1002 }, { id: 'australia-grande', label: 'Australia', value: 7688 }] }),
  makeOrder({ id: 'orden-poblacion-asia', prompt: 'Ordena estos países por población, de menor a mayor.', unit: 'millones de habitantes', definition: 'Población aproximada en 2024.', category: 'poblacion', direction: 'asc', items: [{ id: 'japon-asia', label: 'Japón', value: 124 }, { id: 'bangladesh-asia', label: 'Bangladés', value: 173.6 }, { id: 'pakistan-asia', label: 'Pakistán', value: 251.3 }, { id: 'indonesia-asia', label: 'Indonesia', value: 283.5 }], source: 'ONU · World Population Prospects 2024', updatedAt: '2024-07-11' }),
  makeOrder({ id: 'orden-poblacion-cuatro', prompt: 'Ordena estos países por población, de menor a mayor.', unit: 'millones de habitantes', definition: 'Población aproximada en 2024.', category: 'poblacion', direction: 'asc', items: [{ id: 'brasil-cuatro', label: 'Brasil', value: 212.6 }, { id: 'nigeria-cuatro', label: 'Nigeria', value: 232.7 }, { id: 'indonesia-cuatro', label: 'Indonesia', value: 283.5 }, { id: 'eeuu-cuatro', label: 'Estados Unidos', value: 345.4 }], source: 'ONU · World Population Prospects 2024', updatedAt: '2024-07-11' }),
  makeOrder({ id: 'orden-distancias-sur-europa', prompt: 'Ordena estas distancias desde Madrid, de menor a mayor.', unit: 'kilómetros', definition: 'Distancia aproximada en línea recta.', category: 'distancias', direction: 'asc', items: [{ id: 'lisboa-sur', label: 'Lisboa', value: 504 }, { id: 'barcelona-sur', label: 'Barcelona', value: 505 }, { id: 'paris-sur', label: 'París', value: 1052 }, { id: 'roma-sur', label: 'Roma', value: 1363 }] }),
  makeOrder({ id: 'orden-almacenamiento', prompt: 'Ordena estos soportes por capacidad, de menor a mayor.', unit: 'MB', definition: 'Capacidad de almacenamiento de referencia convertida a MB.', category: 'tecnologia', direction: 'asc', items: [{ id: 'disquete', label: 'Disquete', value: 1.44 }, { id: 'cd-almacenamiento', label: 'CD', value: 700 }, { id: 'dvd-almacenamiento', label: 'DVD', value: 4700 }, { id: 'ssd-almacenamiento', label: 'SSD de 1 TB', value: 1000000 }] }),
  makeOrder({ id: 'orden-hitos-tecnologia', prompt: 'Ordena estos hitos tecnológicos del más antiguo al más reciente.', unit: 'año', definition: 'Año aproximado del hito.', category: 'historia', direction: 'asc', items: [{ id: 'imprenta-tecno', label: 'Imprenta', value: 1440 }, { id: 'maquina-vapor', label: 'Máquina de vapor práctica', value: 1769 }, { id: 'telefono', label: 'Teléfono', value: 1876 }, { id: 'internet', label: 'Internet moderno', value: 1983 }] }),
  makeOrder({ id: 'orden-duracion-cine', prompt: 'Ordena estas películas por duración, de menor a mayor.', unit: 'minutos', definition: 'Duración aproximada de la película.', category: 'cultura', direction: 'asc', items: [{ id: 'up-cine', label: 'Up', value: 96 }, { id: 'interestellar-cine', label: 'Interstellar', value: 169 }, { id: 'avatar-cine', label: 'Avatar', value: 162 }, { id: 'el-padrino-cine', label: 'El padrino', value: 175 }] }),
  makeOrder({ id: 'orden-vida-animales', prompt: 'Ordena estos animales por esperanza de vida, de menor a mayor.', unit: 'años', definition: 'Esperanza de vida aproximada en condiciones habituales.', category: 'animales-objetos', direction: 'asc', items: [{ id: 'hamster-vida', label: 'Hámster', value: 2 }, { id: 'perro-vida', label: 'Perro', value: 13 }, { id: 'caballo-vida', label: 'Caballo', value: 30 }, { id: 'tortuga-vida', label: 'Tortuga gigante', value: 100 }] }),
  makeOrder({ id: 'orden-peso-animales', prompt: 'Ordena estos animales por peso, de menor a mayor.', unit: 'kilogramos', definition: 'Peso aproximado de un adulto grande.', category: 'animales-objetos', direction: 'asc', items: [{ id: 'gato-peso', label: 'Gato', value: 4 }, { id: 'perro-peso', label: 'Perro', value: 30 }, { id: 'caballo-peso', label: 'Caballo', value: 600 }, { id: 'elefante-peso', label: 'Elefante africano', value: 6000 }] }),
  makeOrder({ id: 'orden-pruebas-running', prompt: 'Ordena estas pruebas por distancia, de menor a mayor.', unit: 'metros', definition: 'Distancia oficial de cada prueba.', category: 'deporte', direction: 'asc', items: [{ id: 'cinco-k', label: '5K', value: 5000 }, { id: 'diez-k', label: '10K', value: 10000 }, { id: 'media-maraton', label: 'Media maratón', value: 21097 }, { id: 'maraton-running', label: 'Maratón', value: 42195 }] }),
  makeOrder({ id: 'orden-estadios-grandes', prompt: 'Ordena estos estadios por aforo, de menor a mayor.', unit: 'espectadores', definition: 'Capacidad de referencia para eventos.', category: 'capacidad', direction: 'asc', items: [{ id: 'o2-estadio', label: 'O2 Arena', value: 20000 }, { id: 'san-siro-grandes', label: 'San Siro', value: 75817 }, { id: 'maracana-grandes', label: 'Maracaná', value: 78838 }, { id: 'camp-nou-grandes', label: 'Camp Nou', value: 99354 }] }),
  makeOrder({ id: 'orden-ingresos-marcas', prompt: 'Ordena estas marcas por ingresos, de menor a mayor.', unit: 'millones de USD', definition: 'Ingresos aproximados del ejercicio 2024.', category: 'empresas', direction: 'asc', items: [{ id: 'under-armour-ingresos', label: 'Under Armour', value: 5700 }, { id: 'puma-ingresos', label: 'Puma', value: 8817 }, { id: 'starbucks-ingresos', label: 'Starbucks', value: 36176 }, { id: 'nike-ingresos', label: 'Nike', value: 51362 }], source: 'Informes anuales de cada empresa · 2024', updatedAt: '2024-12-31' }),
  makeOrder({ id: 'orden-smartphones-envios', prompt: 'Ordena estas marcas por smartphones enviados en 2024, de mayor a menor.', unit: 'millones de smartphones', definition: 'Envíos mundiales aproximados durante 2024.', category: 'tecnologia', direction: 'desc', items: [{ id: 'transsion-envios', label: 'Transsion', value: 106.7 }, { id: 'xiaomi-envios', label: 'Xiaomi', value: 168.5 }, { id: 'samsung-envios', label: 'Samsung', value: 223.4 }, { id: 'apple-envios', label: 'Apple', value: 232.1 }], source: 'IDC · envíos mundiales de smartphones 2024', updatedAt: '2024-12-31' }),
  makeOrder({ id: 'orden-aeropuertos-otra', prompt: 'Ordena estos aeropuertos por pasajeros, de menor a mayor.', unit: 'millones de pasajeros', definition: 'Pasajeros totales aproximados durante 2024.', category: 'distancias', direction: 'asc', items: [{ id: 'madrid-aeropuerto', label: 'Madrid-Barajas', value: 66 }, { id: 'heathrow-aeropuerto', label: 'Londres-Heathrow', value: 83.9 }, { id: 'dubai-aeropuerto', label: 'Dubái', value: 92.3 }, { id: 'atlanta-aeropuerto', label: 'Atlanta', value: 108.1 }], source: 'ACI World · tráfico aeroportuario 2024', updatedAt: '2024-12-31' }),
  makeOrder({ id: 'orden-edades-arboles-largos', prompt: 'Ordena estos árboles por edad máxima, de menor a mayor.', unit: 'años', definition: 'Edad máxima aproximada de la especie.', category: 'animales-objetos', direction: 'asc', items: [{ id: 'olivo-largo', label: 'Olivo', value: 100 }, { id: 'roble-largo', label: 'Roble', value: 500 }, { id: 'secuoya-larga', label: 'Secuoya gigante', value: 2000 }, { id: 'pino-largo', label: 'Pino longevo', value: 4800 }] }),
  makeOrder({ id: 'orden-videojuegos-largos', prompt: 'Ordena estos videojuegos por copias vendidas, de menor a mayor.', unit: 'millones de copias', definition: 'Ventas acumuladas aproximadas.', category: 'tecnologia', direction: 'asc', items: [{ id: 'wii-largos', label: 'Wii Sports', value: 82.9 }, { id: 'gta-largos', label: 'GTA V', value: 200 }, { id: 'minecraft-largos', label: 'Minecraft', value: 300 }, { id: 'tetris-largos', label: 'Tetris', value: 520 }] }),
  makeOrder({ id: 'orden-islas-mediterraneo', prompt: 'Ordena estas islas por superficie, de menor a mayor.', unit: 'km²', definition: 'Superficie territorial aproximada.', category: 'superficie', direction: 'asc', items: [{ id: 'ibiza-mediterraneo', label: 'Ibiza', value: 572.6 }, { id: 'mallorca-mediterraneo', label: 'Mallorca', value: 3640 }, { id: 'creta-mediterraneo', label: 'Creta', value: 8336 }, { id: 'islandia-mediterraneo', label: 'Islandia', value: 103000 }] }),
  makeOrder({ id: 'orden-puentes-otra', prompt: 'Ordena estos puentes por longitud, de menor a mayor.', unit: 'kilómetros', definition: 'Longitud total aproximada de la infraestructura.', category: 'distancias', direction: 'asc', items: [{ id: 'golden-gate-otra', label: 'Golden Gate', value: 2.737 }, { id: 'akashi-otra', label: 'Akashi Kaikyō', value: 3.911 }, { id: 'vasco-da-gama', label: 'Vasco da Gama', value: 17.2 }, { id: 'danyang-otra', label: 'Danyang–Kunshan', value: 164.8 }] }),
  makeOrder({ id: 'orden-capitales-altitud', prompt: 'Ordena estas capitales por altitud, de menor a mayor.', unit: 'metros', definition: 'Altitud aproximada sobre el nivel del mar.', category: 'montanas', direction: 'asc', items: [{ id: 'amsterdam-altitud', label: 'Ámsterdam', value: -2 }, { id: 'madrid-altitud', label: 'Madrid', value: 667 }, { id: 'mexico-altitud', label: 'Ciudad de México', value: 2240 }, { id: 'lapaz-altitud', label: 'La Paz', value: 3640 }] }),
  makeOrder({ id: 'orden-aviones-capacidad', prompt: 'Ordena estos aviones por capacidad de pasajeros, de menor a mayor.', unit: 'pasajeros', definition: 'Capacidad máxima aproximada en configuración de referencia.', category: 'tecnologia', direction: 'asc', items: [{ id: 'cessna-capacidad', label: 'Cessna 172', value: 4 }, { id: 'jet-privado', label: 'Jet privado', value: 10 }, { id: 'airbus-a320', label: 'Airbus A320', value: 180 }, { id: 'airbus-a380', label: 'Airbus A380', value: 853 }] }),

  makeCompare({ id: 'comparar-shanghai-taipei', prompt: '¿Qué rascacielos es más alto?', unit: 'metros', definition: 'Altura arquitectónica total.', category: 'edificios', items: [{ id: 'shanghai-choice', label: 'Shanghai Tower', value: 632 }, { id: 'taipei-choice-2', label: 'Taipei 101', value: 508 }], correctOptionId: 'shanghai-choice' }),
  makeCompare({ id: 'comparar-madrid-barcelona-lisboa', prompt: 'Desde Madrid, ¿qué ciudad está más lejos en línea recta?', unit: 'kilómetros', definition: 'Distancia aproximada entre los centros urbanos.', category: 'distancias', items: [{ id: 'barcelona-choice-2', label: 'Barcelona', value: 505 }, { id: 'lisboa-choice', label: 'Lisboa', value: 504 }], correctOptionId: 'barcelona-choice-2' }),
  makeCompare({ id: 'comparar-yangtze-misisipi', prompt: '¿Qué río es más largo?', unit: 'kilómetros', definition: 'Longitud aproximada del curso fluvial.', category: 'distancias', items: [{ id: 'yangtze-choice', label: 'Yangtsé', value: 6300 }, { id: 'misisipi-choice', label: 'Misisipi', value: 6275 }], correctOptionId: 'yangtze-choice' }),
  makeCompare({ id: 'comparar-caspio-baikal', prompt: '¿Qué lago o mar es más profundo?', unit: 'metros', definition: 'Profundidad máxima aproximada.', category: 'profundidad', items: [{ id: 'caspio-choice', label: 'Mar Caspio', value: 1025 }, { id: 'baikal-choice-2', label: 'Lago Baikal', value: 1642 }], correctOptionId: 'baikal-choice-2' }),
  makeCompare({ id: 'comparar-africa-europa', prompt: '¿Qué continente ocupa más superficie?', unit: 'millones de km²', definition: 'Superficie aproximada del continente.', category: 'superficie', items: [{ id: 'africa-choice', label: 'África', value: 30.37 }, { id: 'europa-choice', label: 'Europa', value: 10.18 }], correctOptionId: 'africa-choice' }),
  makeCompare({ id: 'comparar-australia-europa', prompt: '¿Qué territorio ocupa más superficie?', unit: 'millones de km²', definition: 'Superficie territorial aproximada.', category: 'superficie', items: [{ id: 'australia-choice-3', label: 'Australia', value: 7.688 }, { id: 'europa-choice-2', label: 'Europa', value: 10.18 }], correctOptionId: 'europa-choice-2' }),
  makeCompare({ id: 'comparar-eeuu-indonesia', prompt: '¿Qué país tenía más población en 2024?', unit: 'millones de habitantes', definition: 'Estimación de población para 2024.', category: 'poblacion', items: [{ id: 'eeuu-choice', label: 'Estados Unidos', value: 345.4 }, { id: 'indonesia-choice', label: 'Indonesia', value: 283.5 }], correctOptionId: 'eeuu-choice', source: 'ONU · World Population Prospects 2024', updatedAt: '2024-07-11' }),
  makeCompare({ id: 'comparar-indonesia-pakistan', prompt: '¿Qué país tenía más población en 2024?', unit: 'millones de habitantes', definition: 'Estimación de población para 2024.', category: 'poblacion', items: [{ id: 'indonesia-choice-2', label: 'Indonesia', value: 283.5 }, { id: 'pakistan-choice', label: 'Pakistán', value: 251.3 }], correctOptionId: 'indonesia-choice-2', source: 'ONU · World Population Prospects 2024', updatedAt: '2024-07-11' }),
  makeCompare({ id: 'comparar-bangladesh-japon', prompt: '¿Qué país tenía más población en 2024?', unit: 'millones de habitantes', definition: 'Estimación de población para 2024.', category: 'poblacion', items: [{ id: 'bangladesh-choice', label: 'Bangladés', value: 173.6 }, { id: 'japon-choice-2', label: 'Japón', value: 124 }], correctOptionId: 'bangladesh-choice', source: 'ONU · World Population Prospects 2024', updatedAt: '2024-07-11' }),
  makeCompare({ id: 'comparar-maracana-o2', prompt: '¿Qué recinto tiene más aforo?', unit: 'espectadores', definition: 'Capacidad de referencia para eventos.', category: 'capacidad', items: [{ id: 'maracana-choice', label: 'Maracaná', value: 78838 }, { id: 'o2-choice', label: 'O2 Arena', value: 20000 }], correctOptionId: 'maracana-choice' }),
  makeCompare({ id: 'comparar-a380-747', prompt: '¿Qué avión tiene mayor envergadura?', unit: 'metros', definition: 'Distancia aproximada entre los extremos de las alas.', category: 'tecnologia', items: [{ id: 'a380-choice', label: 'Airbus A380', value: 79.75 }, { id: '747-choice', label: 'Boeing 747-8', value: 68.4 }], correctOptionId: 'a380-choice' }),
  makeCompare({ id: 'comparar-tierra-marte', prompt: '¿Qué planeta está más lejos del Sol?', unit: 'millones de kilómetros', definition: 'Distancia media orbital al Sol.', category: 'distancias', items: [{ id: 'tierra-choice', label: 'Tierra', value: 149.6 }, { id: 'marte-choice-2', label: 'Marte', value: 227.9 }], correctOptionId: 'marte-choice-2' }),
  makeCompare({ id: 'comparar-jupiter-tierra-dia', prompt: '¿En qué planeta dura menos un día?', unit: 'horas', definition: 'Duración aproximada de una rotación completa.', category: 'tecnologia', items: [{ id: 'jupiter-dia-choice', label: 'Júpiter', value: 9.9 }, { id: 'tierra-dia-choice', label: 'Tierra', value: 24 }], correctOptionId: 'jupiter-dia-choice' }),
  makeCompare({ id: 'comparar-tierra-dinosaurios', prompt: '¿Qué es más antiguo?', unit: 'millones de años', definition: 'Antigüedad aproximada del referente.', category: 'historia', items: [{ id: 'tierra-antigua-choice', label: 'La Tierra', value: 4540 }, { id: 'dinosaurios-choice', label: 'Extinción de los dinosaurios', value: 66 }], correctOptionId: 'tierra-antigua-choice' }),
  makeCompare({ id: 'comparar-nike-puma', prompt: '¿Qué marca tuvo más ingresos en 2024?', unit: 'millones de USD', definition: 'Ingresos aproximados del ejercicio 2024.', category: 'empresas', items: [{ id: 'nike-puma-choice', label: 'Nike', value: 51362 }, { id: 'puma-choice-2', label: 'Puma', value: 8817 }], correctOptionId: 'nike-puma-choice', source: 'Informes anuales de Nike y Puma · 2024', updatedAt: '2024-12-31' }),
  makeCompare({ id: 'comparar-samsung-xiaomi', prompt: '¿Qué marca envió más smartphones en 2024?', unit: 'millones de smartphones', definition: 'Envíos mundiales aproximados durante 2024.', category: 'tecnologia', items: [{ id: 'samsung-choice-2', label: 'Samsung', value: 223.4 }, { id: 'xiaomi-choice-2', label: 'Xiaomi', value: 168.5 }], correctOptionId: 'samsung-choice-2', source: 'IDC · envíos mundiales de smartphones 2024', updatedAt: '2024-12-31' }),
  makeCompare({ id: 'comparar-5g-4g', prompt: '¿Qué tecnología puede alcanzar mayor velocidad de descarga?', unit: 'Mbps', definition: 'Velocidad máxima teórica aproximada.', category: 'tecnologia', items: [{ id: 'cinco-g-choice', label: '5G', value: 1000 }, { id: 'cuatro-g-choice', label: '4G', value: 100 }], correctOptionId: 'cinco-g-choice' }),
  makeCompare({ id: 'comparar-ssd-cd', prompt: '¿Qué soporte tiene más capacidad?', unit: 'GB', definition: 'Capacidad de almacenamiento de referencia.', category: 'tecnologia', items: [{ id: 'ssd-choice', label: 'SSD de 1 TB', value: 1000 }, { id: 'cd-choice', label: 'CD', value: 0.7 }], correctOptionId: 'ssd-choice' }),
  makeCompare({ id: 'comparar-maraton-media', prompt: '¿Qué prueba es más larga?', unit: 'metros', definition: 'Distancia oficial de la prueba.', category: 'deporte', items: [{ id: 'maraton-choice', label: 'Maratón', value: 42195 }, { id: 'media-choice', label: 'Media maratón', value: 21097 }], correctOptionId: 'maraton-choice' }),
  makeCompare({ id: 'comparar-bolt-gatlin', prompt: '¿Quién tiene el 100 metros más rápido?', unit: 'segundos', definition: 'Mejor marca personal oficial; un tiempo menor es más rápido.', category: 'deporte', items: [{ id: 'bolt-gatlin-choice', label: 'Usain Bolt', value: 9.58 }, { id: 'gatlin-choice', label: 'Justin Gatlin', value: 9.74 }], correctOptionId: 'bolt-gatlin-choice' }),
  makeCompare({ id: 'comparar-perro-hamster', prompt: '¿Qué animal suele vivir más años?', unit: 'años', definition: 'Esperanza de vida aproximada.', category: 'animales-objetos', items: [{ id: 'perro-vida-choice', label: 'Perro', value: 13 }, { id: 'hamster-vida-choice', label: 'Hámster', value: 2 }], correctOptionId: 'perro-vida-choice' }),
  makeCompare({ id: 'comparar-elefante-caballo', prompt: '¿Qué animal pesa más?', unit: 'kilogramos', definition: 'Peso aproximado de un adulto grande.', category: 'animales-objetos', items: [{ id: 'elefante-peso-choice', label: 'Elefante africano', value: 6000 }, { id: 'caballo-peso-choice', label: 'Caballo', value: 600 }], correctOptionId: 'elefante-peso-choice' }),
  makeCompare({ id: 'comparar-tetris-minecraft', prompt: '¿Qué videojuego ha vendido más copias?', unit: 'millones de copias', definition: 'Ventas acumuladas aproximadas.', category: 'tecnologia', items: [{ id: 'tetris-choice', label: 'Tetris', value: 520 }, { id: 'minecraft-choice-3', label: 'Minecraft', value: 300 }], correctOptionId: 'tetris-choice' }),
  makeCompare({ id: 'comparar-o2-wembley', prompt: '¿Qué recinto tiene más aforo?', unit: 'espectadores', definition: 'Capacidad de referencia para eventos.', category: 'capacidad', items: [{ id: 'o2-choice-2', label: 'O2 Arena', value: 20000 }, { id: 'wembley-choice-2', label: 'Wembley', value: 90000 }], correctOptionId: 'wembley-choice-2' }),
  makeCompare({ id: 'comparar-petronas-taipei', prompt: '¿Qué edificio es más alto?', unit: 'metros', definition: 'Altura arquitectónica total.', category: 'edificios', items: [{ id: 'petronas-choice', label: 'Torres Petronas', value: 452.6 }, { id: 'taipei-choice-3', label: 'Taipei 101', value: 508 }], correctOptionId: 'taipei-choice-3' }),
];

export const CIFRAS_QUESTIONS: readonly CifrasQuestion[] = [
  { id: 'altura-eiffel', kind: 'estimate', prompt: '¿Cuántos metros mide la Torre Eiffel hasta su antena?', unit: 'metros', definition: 'Altura total hasta la punta de la antena.', category: 'edificios', referenceValue: 330, source: 'Société d’Exploitation de la Tour Eiffel · ficha editorial', updatedAt: '2026-01-01' },
  { id: 'altura-burj', kind: 'estimate', prompt: '¿Cuántos metros mide el Burj Khalifa?', unit: 'metros', definition: 'Altura arquitectónica oficial hasta la punta.', category: 'edificios', referenceValue: 828, source: 'CTBUH · ficha editorial', updatedAt: '2026-01-01' },
  { id: 'madrid-barcelona', kind: 'estimate', prompt: '¿Qué distancia en línea recta hay entre Madrid y Barcelona?', unit: 'kilómetros', definition: 'Distancia geodésica entre los centros urbanos.', category: 'distancias', referenceValue: 505, source: 'Cálculo geodésico editorial de Ronda', updatedAt: '2026-01-01' },
  { id: 'superficie-espana', kind: 'estimate', prompt: '¿Qué superficie tiene España?', unit: 'km²', definition: 'Superficie territorial de España, sin aguas territoriales.', category: 'superficie', referenceValue: 505990, source: 'Instituto Geográfico Nacional · ficha editorial', updatedAt: '2026-01-01' },
  { id: 'everest', kind: 'estimate', prompt: '¿A qué altura está la cima del Everest?', unit: 'metros', definition: 'Altitud sobre el nivel medio del mar.', category: 'montanas', referenceValue: 8849, source: 'National Geographic · ficha editorial', updatedAt: '2026-01-01' },
  { id: 'profundidad-bajikal', kind: 'estimate', prompt: '¿Cuál es la profundidad máxima del lago Baikal?', unit: 'metros', definition: 'Profundidad máxima registrada del lago.', category: 'profundidad', referenceValue: 1642, source: 'UNESCO · ficha editorial', updatedAt: '2026-01-01' },
  { id: 'orden-edificios', kind: 'order', prompt: 'Ordena estas construcciones por altura.', unit: 'metros', definition: 'Altura arquitectónica oficial.', category: 'edificios', direction: 'asc', items: [{ id: 'guggenheim', label: 'Museo Guggenheim Bilbao', value: 32 }, { id: 'torre-pisa', label: 'Torre de Pisa', value: 57 }, { id: 'eiffel', label: 'Torre Eiffel', value: 330 }, { id: 'burj', label: 'Burj Khalifa', value: 828 }], source: 'Fichas editoriales de cada edificio', updatedAt: '2026-01-01' },
  { id: 'orden-montanas', kind: 'order', prompt: 'Ordena estas montañas por altitud.', unit: 'metros', definition: 'Altitud de la cima sobre el nivel del mar.', category: 'montanas', direction: 'desc', items: [{ id: 'teide', label: 'Teide', value: 3715 }, { id: 'mont-blanc', label: 'Mont Blanc', value: 4808 }, { id: 'aconcagua', label: 'Aconcagua', value: 6961 }, { id: 'everest', label: 'Everest', value: 8849 }], source: 'Fichas editoriales de cada montaña', updatedAt: '2026-01-01' },
  { id: 'orden-superficie', kind: 'order', prompt: 'Ordena estos territorios por superficie.', unit: 'km²', definition: 'Superficie territorial.', category: 'superficie', direction: 'asc', items: [{ id: 'mallorca', label: 'Mallorca', value: 3640 }, { id: 'canarias', label: 'Canarias', value: 7447 }, { id: 'irlanda', label: 'Irlanda', value: 70273 }, { id: 'espana', label: 'España', value: 505990 }], source: 'Instituto Geográfico Nacional · fichas editoriales', updatedAt: '2026-01-01' },
  { id: 'orden-distancias', kind: 'order', prompt: 'Ordena estas distancias entre ciudades.', unit: 'kilómetros', definition: 'Distancia en línea recta entre los centros urbanos.', category: 'distancias', direction: 'asc', items: [{ id: 'madrid-toledo', label: 'Madrid — Toledo', value: 67 }, { id: 'madrid-valencia', label: 'Madrid — Valencia', value: 303 }, { id: 'madrid-barcelona', label: 'Madrid — Barcelona', value: 505 }, { id: 'madrid-roma', label: 'Madrid — Roma', value: 1363 }], source: 'Cálculo geodésico editorial de Ronda', updatedAt: '2026-01-01' },
  { id: 'orden-ingresos-2024', kind: 'order', prompt: 'Ordena estas empresas por ingresos.', unit: 'millones de USD', definition: 'Ingresos reportados durante 2024.', category: 'empresas', direction: 'asc', items: [{ id: 'mcdonalds', label: 'McDonald’s', value: 25920 }, { id: 'coca-cola', label: 'Coca-Cola', value: 47061 }, { id: 'nike', label: 'Nike', value: 51362 }, { id: 'pepsico', label: 'PepsiCo', value: 91854 }], source: 'Informes anuales 2024 de cada empresa', updatedAt: '2024-12-31' },
  { id: 'orden-poblacion-paises', kind: 'order', prompt: 'Ordena estos países por población.', unit: 'millones de habitantes', definition: 'Población aproximada en 2024.', category: 'poblacion', direction: 'asc', items: [{ id: 'australia', label: 'Australia', value: 26.6 }, { id: 'espana-poblacion', label: 'España', value: 48.6 }, { id: 'francia', label: 'Francia', value: 68.4 }, { id: 'alemania', label: 'Alemania', value: 83.5 }], source: 'ONU y oficinas estadísticas nacionales · 2024', updatedAt: '2024-12-31' },
  { id: 'orden-coches-2024', kind: 'order', prompt: 'Ordena estos grupos automovilísticos por vehículos vendidos.', unit: 'millones de vehículos', definition: 'Ventas o entregas mundiales durante 2024.', category: 'empresas', direction: 'desc', items: [{ id: 'toyota-group', label: 'Toyota Group', value: 10.16 }, { id: 'volkswagen-group', label: 'Volkswagen Group', value: 9.03 }, { id: 'hyundai-kia', label: 'Hyundai–Kia', value: 7.23 }, { id: 'ford', label: 'Ford', value: 4.47 }], source: 'Resultados mundiales publicados por cada grupo · 2024', updatedAt: '2024-12-31' },
  { id: 'comparar-coca-pepsi', kind: 'compare', prompt: '¿Quién tuvo más ingresos en 2024?', unit: 'millones de USD', definition: 'Compara los ingresos totales reportados por cada empresa.', category: 'empresas', items: [{ id: 'coca-cola-compare', label: 'Coca-Cola', value: 47061 }, { id: 'pepsico-compare', label: 'PepsiCo', value: 91854 }], correctOptionId: 'pepsico-compare', source: 'Informes anuales 2024 de Coca-Cola y PepsiCo', updatedAt: '2024-12-31' },
  { id: 'comparar-poblacion-india-china', kind: 'compare', prompt: '¿Qué país tenía más población en 2024?', unit: 'millones de habitantes', definition: 'Estimación de población de la ONU para 2024.', category: 'poblacion', items: [{ id: 'india', label: 'India', value: 1451 }, { id: 'china', label: 'China', value: 1419 }], correctOptionId: 'india', source: 'ONU · World Population Prospects 2024', updatedAt: '2024-07-11' },
  { id: 'comparar-coches-toyota-volkswagen', kind: 'compare', prompt: '¿Quién vendió más vehículos en 2024?', unit: 'millones de vehículos', definition: 'Ventas o entregas mundiales de cada grupo automovilístico.', category: 'empresas', items: [{ id: 'toyota-compare', label: 'Toyota Group', value: 10.16 }, { id: 'volkswagen-compare', label: 'Volkswagen Group', value: 9.03 }], correctOptionId: 'toyota-compare', source: 'Toyota y Volkswagen Group · resultados mundiales 2024', updatedAt: '2024-12-31' },
  { id: 'comparar-superficie-rusia-canada', kind: 'compare', prompt: '¿Qué país ocupa más superficie?', unit: 'km²', definition: 'Superficie total aproximada de cada país.', category: 'superficie', items: [{ id: 'rusia', label: 'Rusia', value: 17098242 }, { id: 'canada', label: 'Canadá', value: 9984670 }], correctOptionId: 'rusia', source: 'Banco Mundial · superficie total', updatedAt: '2026-01-01' },
  { id: 'comparar-suscriptores-youtube', kind: 'compare', prompt: '¿Qué canal tenía más suscriptores?', unit: 'millones de suscriptores', definition: 'Comparación fechada: octubre de 2025.', category: 'empresas', items: [{ id: 'mrbeast', label: 'MrBeast', value: 430 }, { id: 't-series', label: 'T-Series', value: 302 }], correctOptionId: 'mrbeast', source: 'Kepios · Digital 2026 Global Overview, datos de octubre de 2025', updatedAt: '2025-10-01' },
  ...CIFRAS_EXTRA_QUESTIONS,
];

export function cifrasQuestionById(id: string, questions: readonly CifrasQuestion[] = CIFRAS_QUESTIONS): CifrasQuestion {
  return questions.find((question) => question.id === id) ?? firstOrThrow(questions, CIFRAS_QUESTIONS, 'Cifras');
}

export function cifrasQuestionIdsFor(
  category: CifrasCategory,
  mode: CifrasMode,
  questions: readonly CifrasQuestion[] = CIFRAS_QUESTIONS,
): string[] {
  const matchesMode = (question: CifrasQuestion): boolean =>
    mode === 'mixto' ||
    (mode === 'estimacion' && question.kind === 'estimate') ||
    (mode === 'ordena' && question.kind === 'order') ||
    (mode === 'comparar' && question.kind === 'compare');
  const filtered = questions.filter(
    (question) =>
      (category === 'todo' || question.category === category) &&
      matchesMode(question),
  );
  const fallback = questions.filter(matchesMode);
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
  category: 'refran' | 'expresion' | 'cita' | 'historica' | 'humor' | 'meme';
  prompt: string;
  canonicalAnswer: string;
  acceptedAnswers: string[];
  hint?: string;
  author?: string;
  source?: string;
}

type SentenceDraft = Omit<SentenceQuestion, 'source'> & { source?: string };

function makeSentence(input: SentenceDraft): SentenceQuestion {
  return {
    source: 'Catálogo editorial de frases y expresiones conocidas',
    ...input,
  };
}

const SENTENCE_BASE_QUESTIONS: readonly SentenceQuestion[] = [
  makeSentence({ id: 'sentence-01', pack: 'refranes', category: 'refran', prompt: 'En abril, aguas ____.', canonicalAnswer: 'mil', acceptedAnswers: ['mil'], hint: 'Es un número pequeño, pero contundente.', source: 'Refranero popular español' }),
  makeSentence({ id: 'sentence-02', pack: 'refranes', category: 'refran', prompt: 'Más vale pájaro en mano que ciento ____.', canonicalAnswer: 'volando', acceptedAnswers: ['volando'], hint: 'Lo contrario de estar posado.', source: 'Refranero popular español' }),
  makeSentence({ id: 'sentence-03', pack: 'refranes', category: 'refran', prompt: 'El hábito no hace al ____.', canonicalAnswer: 'monje', acceptedAnswers: ['monje'], hint: 'Una persona que viste hábito.', source: 'Refranero popular español' }),
  makeSentence({ id: 'sentence-04', pack: 'refranes', category: 'refran', prompt: 'No hay mal que por bien no ____.', canonicalAnswer: 'venga', acceptedAnswers: ['venga'], hint: 'Termina con un verbo.', source: 'Refranero popular español' }),
  makeSentence({ id: 'sentence-05', pack: 'refranes', category: 'refran', prompt: 'A caballo regalado no le mires el ____.', canonicalAnswer: 'diente', acceptedAnswers: ['diente', 'dientes'], hint: 'Está en la boca del caballo.', source: 'Refranero popular español' }),
  makeSentence({ id: 'sentence-06', pack: 'refranes', category: 'refran', prompt: 'Quien mucho abarca, poco ____.', canonicalAnswer: 'aprieta', acceptedAnswers: ['aprieta'], hint: 'Lo contrario de soltar.', source: 'Refranero popular español' }),
  makeSentence({ id: 'sentence-07', pack: 'refranes', category: 'refran', prompt: 'A quien madruga, Dios le ____.', canonicalAnswer: 'ayuda', acceptedAnswers: ['ayuda'], hint: 'Una mano divina.', source: 'Refranero popular español' }),
  makeSentence({ id: 'sentence-08', pack: 'refranes', category: 'refran', prompt: 'Más sabe el diablo por viejo que por ____.', canonicalAnswer: 'diablo', acceptedAnswers: ['diablo'], hint: 'La misma palabra que aparece antes.', source: 'Refranero popular español' }),
  makeSentence({ id: 'sentence-09', pack: 'refranes', category: 'refran', prompt: 'Ojos que no ven, corazón que no ____.', canonicalAnswer: 'siente', acceptedAnswers: ['siente'], hint: 'Lo que hace el corazón.', source: 'Refranero popular español' }),
  makeSentence({ id: 'sentence-10', pack: 'refranes', category: 'refran', prompt: 'En casa del herrero, cuchillo de ____.', canonicalAnswer: 'palo', acceptedAnswers: ['palo'], hint: 'Un material sencillo.', source: 'Refranero popular español' }),
  makeSentence({ id: 'sentence-11', pack: 'refranes', category: 'refran', prompt: 'Dime con quién andas y te diré quién ____.', canonicalAnswer: 'eres', acceptedAnswers: ['eres'], hint: 'Verbo relacionado con identidad.', source: 'Refranero popular español' }),
  makeSentence({ id: 'sentence-12', pack: 'refranes', category: 'refran', prompt: 'Cría cuervos y te sacarán los ____.', canonicalAnswer: 'ojos', acceptedAnswers: ['ojos'], hint: 'Están en la cara.', source: 'Refranero popular español' }),
  makeSentence({ id: 'sentence-13', pack: 'refranes', category: 'refran', prompt: 'No por mucho madrugar amanece más ____.', canonicalAnswer: 'temprano', acceptedAnswers: ['temprano'], hint: 'Lo contrario de tarde.', source: 'Refranero popular español' }),
  makeSentence({ id: 'sentence-14', pack: 'refranes', category: 'refran', prompt: 'Cuando el río suena, agua ____.', canonicalAnswer: 'lleva', acceptedAnswers: ['lleva'], hint: 'Lo que hace un río.', source: 'Refranero popular español' }),
  makeSentence({ id: 'sentence-15', pack: 'refranes', category: 'refran', prompt: 'A río revuelto, ganancia de ____.', canonicalAnswer: 'pescadores', acceptedAnswers: ['pescadores'], hint: 'Quienes viven de pescar.', source: 'Refranero popular español' }),
  makeSentence({ id: 'sentence-16', pack: 'refranes', category: 'refran', prompt: 'El que la sigue, la ____.', canonicalAnswer: 'consigue', acceptedAnswers: ['consigue'], hint: 'Persistir suele tener este resultado.', source: 'Refranero popular español' }),
  makeSentence({ id: 'sentence-17', pack: 'refranes', category: 'refran', prompt: 'Más vale malo conocido que bueno por ____.', canonicalAnswer: 'conocer', acceptedAnswers: ['conocer'], hint: 'Descubrir algo nuevo.', source: 'Refranero popular español' }),
  makeSentence({ id: 'sentence-18', pack: 'refranes', category: 'refran', prompt: 'Perro ladrador, poco ____.', canonicalAnswer: 'mordedor', acceptedAnswers: ['mordedor'], hint: 'El que muerde.', source: 'Refranero popular español' }),

  makeSentence({ id: 'sentence-19', pack: 'expresiones', category: 'expresion', prompt: 'Estar entre la espada y la ____.', canonicalAnswer: 'pared', acceptedAnswers: ['pared'], hint: 'Una superficie vertical.', source: 'Expresión idiomática del español' }),
  makeSentence({ id: 'sentence-20', pack: 'expresiones', category: 'expresion', prompt: 'Buscarle tres pies al ____.', canonicalAnswer: 'gato', acceptedAnswers: ['gato'], hint: 'Animal doméstico.', source: 'Expresión idiomática del español' }),
  makeSentence({ id: 'sentence-21', pack: 'expresiones', category: 'expresion', prompt: 'Poner toda la carne en el ____.', canonicalAnswer: 'asador', acceptedAnswers: ['asador'], hint: 'Donde se cocina a la brasa.', source: 'Expresión idiomática del español' }),
  makeSentence({ id: 'sentence-22', pack: 'expresiones', category: 'expresion', prompt: 'Estar como una ____.', canonicalAnswer: 'cabra', acceptedAnswers: ['cabra'], hint: 'Animal de montaña.', source: 'Expresión idiomática del español' }),
  makeSentence({ id: 'sentence-23', pack: 'expresiones', category: 'expresion', prompt: 'Irse el santo al ____.', canonicalAnswer: 'cielo', acceptedAnswers: ['cielo'], hint: 'Está encima de nosotros.', source: 'Expresión idiomática del español' }),
  makeSentence({ id: 'sentence-24', pack: 'expresiones', category: 'expresion', prompt: 'Matar dos pájaros de un ____.', canonicalAnswer: 'tiro', acceptedAnswers: ['tiro'], hint: 'Un solo disparo.', source: 'Expresión idiomática del español' }),
  makeSentence({ id: 'sentence-25', pack: 'expresiones', category: 'expresion', prompt: 'Ver el mundo de color de ____.', canonicalAnswer: 'rosa', acceptedAnswers: ['rosa'], hint: 'Un color optimista.', source: 'Expresión idiomática del español' }),
  makeSentence({ id: 'sentence-26', pack: 'expresiones', category: 'expresion', prompt: 'Tener la sartén por el ____.', canonicalAnswer: 'mango', acceptedAnswers: ['mango'], hint: 'La parte por la que se agarra.', source: 'Expresión idiomática del español' }),
  makeSentence({ id: 'sentence-27', pack: 'expresiones', category: 'expresion', prompt: 'Estar con el agua al ____.', canonicalAnswer: 'cuello', acceptedAnswers: ['cuello'], hint: 'Está entre la cabeza y el torso.', source: 'Expresión idiomática del español' }),
  makeSentence({ id: 'sentence-28', pack: 'expresiones', category: 'expresion', prompt: 'Hacer borrón y cuenta ____.', canonicalAnswer: 'nueva', acceptedAnswers: ['nueva'], hint: 'Empezar de cero.', source: 'Expresión idiomática del español' }),
  makeSentence({ id: 'sentence-29', pack: 'expresiones', category: 'expresion', prompt: 'A buenas horas, mangas ____.', canonicalAnswer: 'verdes', acceptedAnswers: ['verdes'], hint: 'Un color.', source: 'Expresión idiomática del español' }),
  makeSentence({ id: 'sentence-30', pack: 'expresiones', category: 'expresion', prompt: 'Llueve sobre ____.', canonicalAnswer: 'mojado', acceptedAnswers: ['mojado'], hint: 'Lo contrario de seco.', source: 'Expresión idiomática del español' }),

  makeSentence({ id: 'sentence-31', pack: 'citas', category: 'cita', prompt: 'Pienso, luego ____.', canonicalAnswer: 'existo', acceptedAnswers: ['existo'], hint: 'Verbo relacionado con existir.', author: 'René Descartes', source: 'Discurso del método, 1637' }),
  makeSentence({ id: 'sentence-32', pack: 'citas', category: 'cita', prompt: 'Solo sé que no sé ____.', canonicalAnswer: 'nada', acceptedAnswers: ['nada'], hint: 'La ausencia de conocimiento.', author: 'Atribuida a Sócrates', source: 'Tradición filosófica clásica' }),
  makeSentence({ id: 'sentence-33', pack: 'citas', category: 'cita', prompt: 'El conocimiento es ____.', canonicalAnswer: 'poder', acceptedAnswers: ['poder'], hint: 'Una forma de influencia.', author: 'Francis Bacon', source: 'Meditationes Sacrae, 1597' }),
  makeSentence({ id: 'sentence-34', pack: 'citas', category: 'cita', prompt: 'La imaginación es más importante que el ____.', canonicalAnswer: 'conocimiento', acceptedAnswers: ['conocimiento', 'saber'], hint: 'Lo que se aprende.', author: 'Atribuida a Albert Einstein', source: 'Cita popular atribuida a Einstein' }),
  makeSentence({ id: 'sentence-35', pack: 'citas', category: 'cita', prompt: 'La vida es ____.', canonicalAnswer: 'sueño', acceptedAnswers: ['sueño'], hint: 'Lo que ocurre mientras dormimos.', author: 'Pedro Calderón de la Barca', source: 'La vida es sueño, 1635' }),
  makeSentence({ id: 'sentence-36', pack: 'citas', category: 'cita', prompt: 'Ser o no ____, esa es la cuestión.', canonicalAnswer: 'ser', acceptedAnswers: ['ser'], hint: 'El mismo verbo que aparece antes.', author: 'William Shakespeare', source: 'Hamlet, acto III' }),
  makeSentence({ id: 'sentence-37', pack: 'citas', category: 'cita', prompt: 'El corazón tiene razones que la razón no ____.', canonicalAnswer: 'entiende', acceptedAnswers: ['entiende'], hint: 'Comprender algo.', author: 'Blaise Pascal', source: 'Pensées, 1670' }),
  makeSentence({ id: 'sentence-38', pack: 'citas', category: 'cita', prompt: 'Caminante, no hay camino, se hace camino al ____.', canonicalAnswer: 'andar', acceptedAnswers: ['andar'], hint: 'Avanzar a pie.', author: 'Antonio Machado', source: 'Proverbios y cantares XXIX' }),
  makeSentence({ id: 'sentence-39', pack: 'citas', category: 'cita', prompt: 'Lo esencial es invisible a los ____.', canonicalAnswer: 'ojos', acceptedAnswers: ['ojos'], hint: 'Sirven para ver.', author: 'Antoine de Saint-Exupéry', source: 'El principito, 1943' }),
  makeSentence({ id: 'sentence-40', pack: 'citas', category: 'cita', prompt: 'No hay camino para la paz; la paz es el ____.', canonicalAnswer: 'camino', acceptedAnswers: ['camino'], hint: 'Por donde se avanza.', author: 'Atribuida a Mahatma Gandhi', source: 'Cita popular atribuida a Gandhi' }),
  makeSentence({ id: 'sentence-41', pack: 'citas', category: 'cita', prompt: 'La libertad, Sancho, es uno de los más preciosos ____.', canonicalAnswer: 'dones', acceptedAnswers: ['dones', 'regalos'], hint: 'Algo que se recibe gratuitamente.', author: 'Miguel de Cervantes', source: 'Don Quijote de la Mancha, segunda parte' }),
  makeSentence({ id: 'sentence-42', pack: 'citas', category: 'cita', prompt: 'Puedo resistir todo menos la ____.', canonicalAnswer: 'tentación', acceptedAnswers: ['tentación', 'tentacion'], hint: 'Algo difícil de rechazar.', author: 'Oscar Wilde', source: 'La importancia de llamarse Ernesto, 1895' }),

  makeSentence({ id: 'sentence-43', pack: 'historicas', category: 'historica', prompt: 'Veni, vidi, ____.', canonicalAnswer: 'vici', acceptedAnswers: ['vici'], hint: 'La tercera palabra de la frase latina.', author: 'Julio César', source: 'Frase latina atribuida a Julio César' }),
  makeSentence({ id: 'sentence-44', pack: 'historicas', category: 'historica', prompt: 'Eppur si ____.', canonicalAnswer: 'muove', acceptedAnswers: ['muove'], hint: '“Y, sin embargo, se mueve”.', author: 'Atribuida a Galileo Galilei', source: 'Tradición histórica sobre el juicio de Galileo' }),
  makeSentence({ id: 'sentence-45', pack: 'historicas', category: 'historica', prompt: 'I have a ____.', canonicalAnswer: 'dream', acceptedAnswers: ['dream'], hint: 'Un deseo o visión de futuro.', author: 'Martin Luther King Jr.', source: 'Discurso “I Have a Dream”, 1963' }),
  makeSentence({ id: 'sentence-46', pack: 'historicas', category: 'historica', prompt: 'Ich bin ein ____.', canonicalAnswer: 'Berliner', acceptedAnswers: ['Berliner', 'berliner'], hint: 'Una persona de Berlín.', author: 'John F. Kennedy', source: 'Discurso en Berlín, 1963' }),
  makeSentence({ id: 'sentence-47', pack: 'historicas', category: 'historica', prompt: 'Ask not what your country can do for ____.', canonicalAnswer: 'you', acceptedAnswers: ['you'], hint: 'Pronombre inglés para la persona que escucha.', author: 'John F. Kennedy', source: 'Discurso inaugural, 1961' }),
  makeSentence({ id: 'sentence-48', pack: 'historicas', category: 'historica', prompt: 'We shall fight on the ____.', canonicalAnswer: 'beaches', acceptedAnswers: ['beaches'], hint: 'La costa en inglés.', author: 'Winston Churchill', source: 'Discurso ante la Cámara de los Comunes, 1940' }),
  makeSentence({ id: 'sentence-49', pack: 'historicas', category: 'historica', prompt: '¡No __!', canonicalAnswer: 'pasarán', acceptedAnswers: ['pasarán', 'pasaran'], hint: 'Grito de resistencia.', author: 'Dolores Ibárruri', source: 'Lema histórico de la Guerra Civil española' }),
  makeSentence({ id: 'sentence-50', pack: 'historicas', category: 'historica', prompt: '¡Viva la __!', canonicalAnswer: 'Pepa', acceptedAnswers: ['Pepa', 'pepa'], hint: 'Apodo de la Constitución de 1812.', source: 'Lema popular de la Constitución de Cádiz de 1812' }),
  makeSentence({ id: 'sentence-51', pack: 'historicas', category: 'historica', prompt: 'Liberté, égalité, ____.', canonicalAnswer: 'fraternité', acceptedAnswers: ['fraternité', 'fraternite'], hint: 'La tercera palabra del lema francés.', source: 'Lema nacional de Francia' }),
  makeSentence({ id: 'sentence-52', pack: 'historicas', category: 'historica', prompt: 'La suerte está ____.', canonicalAnswer: 'echada', acceptedAnswers: ['echada'], hint: 'Ya no se puede deshacer.', author: 'Atribuida a Julio César', source: 'Traducción tradicional de “Alea iacta est”' }),

  makeSentence({ id: 'sentence-53', pack: 'humor', category: 'humor', prompt: 'Estos son mis principios; si no le gustan, tengo ____.', canonicalAnswer: 'otros', acceptedAnswers: ['otros'], hint: 'Más de los que acaba de mencionar.', author: 'Groucho Marx', source: 'Frase humorística atribuida a Groucho Marx' }),
  makeSentence({ id: 'sentence-54', pack: 'humor', category: 'humor', prompt: 'Nunca olvido una cara, pero en su caso haré una ____.', canonicalAnswer: 'excepción', acceptedAnswers: ['excepción', 'excepcion'], hint: 'Una regla que no se cumple.', author: 'Groucho Marx', source: 'Frase humorística atribuida a Groucho Marx' }),
  makeSentence({ id: 'sentence-55', pack: 'humor', category: 'humor', prompt: 'No puedo ser miembro de un club que admita como socio a alguien como ____.', canonicalAnswer: 'yo', acceptedAnswers: ['yo'], hint: 'La persona que habla.', author: 'Groucho Marx', source: 'Frase humorística atribuida a Groucho Marx' }),
  makeSentence({ id: 'sentence-56', pack: 'humor', category: 'humor', prompt: 'El matrimonio es la principal causa de ____.', canonicalAnswer: 'divorcio', acceptedAnswers: ['divorcio'], hint: 'La ruptura legal de un matrimonio.', author: 'Groucho Marx', source: 'Frase humorística atribuida a Groucho Marx' }),
  makeSentence({ id: 'sentence-57', pack: 'humor', category: 'humor', prompt: 'La televisión es muy educativa: cuando alguien la enciende, me voy a otra ____.', canonicalAnswer: 'habitación', acceptedAnswers: ['habitación', 'habitacion'], hint: 'Otro espacio de la casa.', author: 'Groucho Marx', source: 'Frase humorística atribuida a Groucho Marx' }),
  makeSentence({ id: 'sentence-58', pack: 'humor', category: 'humor', prompt: 'Fuera del perro, un libro es el mejor amigo del hombre; dentro del perro está demasiado ____.', canonicalAnswer: 'oscuro', acceptedAnswers: ['oscuro'], hint: 'Lo contrario de iluminado.', author: 'Groucho Marx', source: 'Frase humorística atribuida a Groucho Marx' }),

  makeSentence({ id: 'sentence-59', pack: 'memes', category: 'meme', prompt: 'No contaban con mi ____.', canonicalAnswer: 'astucia', acceptedAnswers: ['astucia'], hint: 'Ingenio para salir de una situación.', source: 'El Chapulín Colorado · cultura popular' }),
  makeSentence({ id: 'sentence-60', pack: 'memes', category: 'meme', prompt: 'Que la Fuerza te ____.', canonicalAnswer: 'acompañe', acceptedAnswers: ['acompañe', 'acompane'], hint: 'Un deseo de buena suerte.', source: 'Star Wars · cultura popular' }),
  makeSentence({ id: 'sentence-61', pack: 'memes', category: 'meme', prompt: 'Yo soy tu ____.', canonicalAnswer: 'padre', acceptedAnswers: ['padre'], hint: 'Un familiar directo.', source: 'Star Wars · cultura popular' }),
  makeSentence({ id: 'sentence-62', pack: 'memes', category: 'meme', prompt: 'Houston, tenemos un ____.', canonicalAnswer: 'problema', acceptedAnswers: ['problema'], hint: 'Algo que hay que resolver.', source: 'Apollo 13 · frase popularizada por el cine' }),
  makeSentence({ id: 'sentence-63', pack: 'memes', category: 'meme', prompt: 'Hasta la ____, baby.', canonicalAnswer: 'vista', acceptedAnswers: ['vista'], hint: 'Lo que haces con los ojos.', source: 'Terminator 2 · cultura popular' }),
  makeSentence({ id: 'sentence-64', pack: 'memes', category: 'meme', prompt: 'Esto es ____.', canonicalAnswer: 'Esparta', acceptedAnswers: ['Esparta', 'esparta'], hint: 'La antigua ciudad griega.', source: '300 · cultura popular' }),
  makeSentence({ id: 'sentence-65', pack: 'memes', category: 'meme', prompt: 'Winter is ____.', canonicalAnswer: 'coming', acceptedAnswers: ['coming'], hint: '“El invierno se acerca”.', source: 'Game of Thrones · cultura popular' }),
  makeSentence({ id: 'sentence-66', pack: 'memes', category: 'meme', prompt: 'La resistencia es ____.', canonicalAnswer: 'inútil', acceptedAnswers: ['inútil', 'inutil'], hint: 'Que no sirve para nada.', source: 'Star Trek · cultura popular' }),
];

const SENTENCE_EXTRA_QUESTIONS: readonly SentenceQuestion[] = [
  makeSentence({ id: 'sentence-067', pack: 'refranes', category: 'refran', prompt: 'A falta de pan, buenas son ____.', canonicalAnswer: 'tortas', acceptedAnswers: ['tortas'], hint: 'Un dulce o pieza de masa.', source: 'Refranero popular español' }),
  makeSentence({ id: 'sentence-068', pack: 'refranes', category: 'refran', prompt: 'A la tercera va la ____.', canonicalAnswer: 'vencida', acceptedAnswers: ['vencida'], hint: 'La que finalmente gana.', source: 'Refranero popular español' }),
  makeSentence({ id: 'sentence-069', pack: 'refranes', category: 'refran', prompt: 'A palabras necias, oídos ____.', canonicalAnswer: 'sordos', acceptedAnswers: ['sordos'], hint: 'Que no oyen.', source: 'Refranero popular español' }),
  makeSentence({ id: 'sentence-070', pack: 'refranes', category: 'refran', prompt: 'Al mal tiempo, buena ____.', canonicalAnswer: 'cara', acceptedAnswers: ['cara'], hint: 'Está en la parte delantera de la cabeza.', source: 'Refranero popular español' }),
  makeSentence({ id: 'sentence-071', pack: 'refranes', category: 'refran', prompt: 'Al pan, pan, y al vino, ____.', canonicalAnswer: 'vino', acceptedAnswers: ['vino'], hint: 'La misma palabra que aparece al final.', source: 'Refranero popular español' }),
  makeSentence({ id: 'sentence-072', pack: 'refranes', category: 'refran', prompt: 'Ande yo caliente, ríase la ____.', canonicalAnswer: 'gente', acceptedAnswers: ['gente'], hint: 'El conjunto de las personas.', source: 'Refranero popular español' }),
  makeSentence({ id: 'sentence-073', pack: 'refranes', category: 'refran', prompt: 'Antes se pilla a un mentiroso que a un ____.', canonicalAnswer: 'cojo', acceptedAnswers: ['cojo'], hint: 'Alguien que camina con dificultad.', source: 'Refranero popular español' }),
  makeSentence({ id: 'sentence-074', pack: 'refranes', category: 'refran', prompt: 'Cada oveja con su ____.', canonicalAnswer: 'pareja', acceptedAnswers: ['pareja'], hint: 'La persona o animal que le corresponde.', source: 'Refranero popular español' }),
  makeSentence({ id: 'sentence-075', pack: 'refranes', category: 'refran', prompt: 'Cada maestrillo tiene su ____.', canonicalAnswer: 'librillo', acceptedAnswers: ['librillo'], hint: 'Un libro pequeño.', source: 'Refranero popular español' }),
  makeSentence({ id: 'sentence-076', pack: 'refranes', category: 'refran', prompt: 'Casa con dos puertas, mala es de ____.', canonicalAnswer: 'guardar', acceptedAnswers: ['guardar'], hint: 'Lo que haces para proteger algo.', source: 'Refranero popular español' }),
  makeSentence({ id: 'sentence-077', pack: 'refranes', category: 'refran', prompt: 'De tal palo, tal ____.', canonicalAnswer: 'astilla', acceptedAnswers: ['astilla'], hint: 'Un trozo pequeño de madera.', source: 'Refranero popular español' }),
  makeSentence({ id: 'sentence-078', pack: 'refranes', category: 'refran', prompt: 'Del dicho al hecho hay un gran ____.', canonicalAnswer: 'trecho', acceptedAnswers: ['trecho'], hint: 'Una distancia o diferencia.', source: 'Refranero popular español' }),
  makeSentence({ id: 'sentence-079', pack: 'refranes', category: 'refran', prompt: 'Dios los cría y ellos se ____.', canonicalAnswer: 'juntan', acceptedAnswers: ['juntan'], hint: 'Se reúnen.', source: 'Refranero popular español' }),
  makeSentence({ id: 'sentence-080', pack: 'refranes', category: 'refran', prompt: 'Donde dije digo, digo ____.', canonicalAnswer: 'Diego', acceptedAnswers: ['Diego', 'diego'], hint: 'Un nombre propio que rima.', source: 'Refranero popular español' }),
  makeSentence({ id: 'sentence-081', pack: 'refranes', category: 'refran', prompt: 'El que avisa no es ____.', canonicalAnswer: 'traidor', acceptedAnswers: ['traidor'], hint: 'Quien engaña a los demás.', source: 'Refranero popular español' }),
  makeSentence({ id: 'sentence-082', pack: 'refranes', category: 'refran', prompt: 'El que calla, ____.', canonicalAnswer: 'otorga', acceptedAnswers: ['otorga'], hint: 'Concede o da la razón.', source: 'Refranero popular español' }),
  makeSentence({ id: 'sentence-083', pack: 'refranes', category: 'refran', prompt: 'El que mucho habla, mucho ____.', canonicalAnswer: 'yerra', acceptedAnswers: ['yerra'], hint: 'Se equivoca.', source: 'Refranero popular español' }),
  makeSentence({ id: 'sentence-084', pack: 'refranes', category: 'refran', prompt: 'En boca cerrada no entran ____.', canonicalAnswer: 'moscas', acceptedAnswers: ['moscas'], hint: 'Insectos que vuelan.', source: 'Refranero popular español' }),
  makeSentence({ id: 'sentence-085', pack: 'refranes', category: 'refran', prompt: 'Gallo que no ____, algo tiene en la garganta.', canonicalAnswer: 'canta', acceptedAnswers: ['canta'], hint: 'Lo que hace un gallo al amanecer.', source: 'Refranero popular español' }),
  makeSentence({ id: 'sentence-086', pack: 'refranes', category: 'refran', prompt: 'La avaricia rompe el ____.', canonicalAnswer: 'saco', acceptedAnswers: ['saco'], hint: 'Una bolsa grande.', source: 'Refranero popular español' }),
  makeSentence({ id: 'sentence-087', pack: 'refranes', category: 'refran', prompt: 'La curiosidad mató al ____.', canonicalAnswer: 'gato', acceptedAnswers: ['gato'], hint: 'Animal doméstico.', source: 'Refranero popular español' }),
  makeSentence({ id: 'sentence-088', pack: 'refranes', category: 'refran', prompt: 'La unión hace la ____.', canonicalAnswer: 'fuerza', acceptedAnswers: ['fuerza'], hint: 'Lo que permite vencer obstáculos.', source: 'Refranero popular español' }),
  makeSentence({ id: 'sentence-089', pack: 'refranes', category: 'refran', prompt: 'Lo prometido es ____.', canonicalAnswer: 'deuda', acceptedAnswers: ['deuda'], hint: 'Obligación pendiente.', source: 'Refranero popular español' }),
  makeSentence({ id: 'sentence-090', pack: 'refranes', category: 'refran', prompt: 'Mal de muchos, consuelo de ____.', canonicalAnswer: 'tontos', acceptedAnswers: ['tontos'], hint: 'Personas poco sensatas.', source: 'Refranero popular español' }),
  makeSentence({ id: 'sentence-091', pack: 'refranes', category: 'refran', prompt: 'Más vale tarde que ____.', canonicalAnswer: 'nunca', acceptedAnswers: ['nunca'], hint: 'En ningún momento.', source: 'Refranero popular español' }),
  makeSentence({ id: 'sentence-092', pack: 'refranes', category: 'refran', prompt: 'Nadie es profeta en su ____.', canonicalAnswer: 'tierra', acceptedAnswers: ['tierra'], hint: 'El lugar de donde procede.', source: 'Refranero popular español' }),
  makeSentence({ id: 'sentence-093', pack: 'refranes', category: 'refran', prompt: 'No dejes para mañana lo que puedas hacer ____.', canonicalAnswer: 'hoy', acceptedAnswers: ['hoy'], hint: 'El día presente.', source: 'Refranero popular español' }),
  makeSentence({ id: 'sentence-094', pack: 'refranes', category: 'refran', prompt: 'No hay dos sin ____.', canonicalAnswer: 'tres', acceptedAnswers: ['tres'], hint: 'El número que viene después del dos.', source: 'Refranero popular español' }),
  makeSentence({ id: 'sentence-095', pack: 'refranes', category: 'refran', prompt: 'Nunca digas de esta agua no ____.', canonicalAnswer: 'beberé', acceptedAnswers: ['beberé', 'bebere'], hint: 'Tomar un líquido.', source: 'Refranero popular español' }),
  makeSentence({ id: 'sentence-096', pack: 'refranes', category: 'refran', prompt: 'Quien ríe el último, ríe ____.', canonicalAnswer: 'mejor', acceptedAnswers: ['mejor'], hint: 'De una manera superior.', source: 'Refranero popular español' }),
  makeSentence({ id: 'sentence-097', pack: 'refranes', category: 'refran', prompt: 'Quien tiene boca se ____.', canonicalAnswer: 'equivoca', acceptedAnswers: ['equivoca'], hint: 'Comete un error.', source: 'Refranero popular español' }),
  makeSentence({ id: 'sentence-098', pack: 'refranes', category: 'refran', prompt: 'Sobre gustos no hay nada ____.', canonicalAnswer: 'escrito', acceptedAnswers: ['escrito'], hint: 'Lo contrario de oral.', source: 'Refranero popular español' }),
  makeSentence({ id: 'sentence-099', pack: 'refranes', category: 'refran', prompt: 'Tanto va el cántaro a la fuente que al final se ____.', canonicalAnswer: 'rompe', acceptedAnswers: ['rompe'], hint: 'Deja de estar entero.', source: 'Refranero popular español' }),
  makeSentence({ id: 'sentence-100', pack: 'refranes', category: 'refran', prompt: 'Zapatero, a tus ____.', canonicalAnswer: 'zapatos', acceptedAnswers: ['zapatos'], hint: 'Lo que fabrica o arregla un zapatero.', source: 'Refranero popular español' }),

  makeSentence({ id: 'sentence-101', pack: 'expresiones', category: 'expresion', prompt: 'Dar en el ____.', canonicalAnswer: 'clavo', acceptedAnswers: ['clavo'], hint: 'Una pieza de metal que se golpea.', source: 'Expresión idiomática del español' }),
  makeSentence({ id: 'sentence-102', pack: 'expresiones', category: 'expresion', prompt: 'Meter la ____.', canonicalAnswer: 'pata', acceptedAnswers: ['pata'], hint: 'Una extremidad de un animal.', source: 'Expresión idiomática del español' }),
  makeSentence({ id: 'sentence-103', pack: 'expresiones', category: 'expresion', prompt: 'Tirar la ____.', canonicalAnswer: 'toalla', acceptedAnswers: ['toalla'], hint: 'Se usa para secarse.', source: 'Expresión idiomática del español' }),
  makeSentence({ id: 'sentence-104', pack: 'expresiones', category: 'expresion', prompt: 'Dormirse en los ____.', canonicalAnswer: 'laureles', acceptedAnswers: ['laureles'], hint: 'Árboles asociados a la gloria.', source: 'Expresión idiomática del español' }),
  makeSentence({ id: 'sentence-105', pack: 'expresiones', category: 'expresion', prompt: 'Poner los puntos sobre las ____.', canonicalAnswer: 'íes', acceptedAnswers: ['íes', 'ies'], hint: 'Una letra con punto.', source: 'Expresión idiomática del español' }),
  makeSentence({ id: 'sentence-106', pack: 'expresiones', category: 'expresion', prompt: 'Hacer la vista ____.', canonicalAnswer: 'gorda', acceptedAnswers: ['gorda'], hint: 'Lo contrario de delgada.', source: 'Expresión idiomática del español' }),
  makeSentence({ id: 'sentence-107', pack: 'expresiones', category: 'expresion', prompt: 'Costar un ojo de la ____.', canonicalAnswer: 'cara', acceptedAnswers: ['cara'], hint: 'Está en la parte delantera de la cabeza.', source: 'Expresión idiomática del español' }),
  makeSentence({ id: 'sentence-108', pack: 'expresiones', category: 'expresion', prompt: 'No tener pelos en la ____.', canonicalAnswer: 'lengua', acceptedAnswers: ['lengua'], hint: 'Órgano que usamos para hablar.', source: 'Expresión idiomática del español' }),
  makeSentence({ id: 'sentence-109', pack: 'expresiones', category: 'expresion', prompt: 'Estar en las ____.', canonicalAnswer: 'nubes', acceptedAnswers: ['nubes'], hint: 'Flotan en el cielo.', source: 'Expresión idiomática del español' }),
  makeSentence({ id: 'sentence-110', pack: 'expresiones', category: 'expresion', prompt: 'Ponerse las ____.', canonicalAnswer: 'pilas', acceptedAnswers: ['pilas'], hint: 'Dan energía a algunos aparatos.', source: 'Expresión idiomática del español' }),
  makeSentence({ id: 'sentence-111', pack: 'expresiones', category: 'expresion', prompt: 'Salvarse por los ____.', canonicalAnswer: 'pelos', acceptedAnswers: ['pelos'], hint: 'Crecen en la piel.', source: 'Expresión idiomática del español' }),
  makeSentence({ id: 'sentence-112', pack: 'expresiones', category: 'expresion', prompt: 'Echar una ____.', canonicalAnswer: 'mano', acceptedAnswers: ['mano'], hint: 'Parte del cuerpo con cinco dedos.', source: 'Expresión idiomática del español' }),
  makeSentence({ id: 'sentence-113', pack: 'expresiones', category: 'expresion', prompt: 'Romper el ____.', canonicalAnswer: 'hielo', acceptedAnswers: ['hielo'], hint: 'Agua en estado sólido.', source: 'Expresión idiomática del español' }),
  makeSentence({ id: 'sentence-114', pack: 'expresiones', category: 'expresion', prompt: 'Quedarse de ____.', canonicalAnswer: 'piedra', acceptedAnswers: ['piedra'], hint: 'Material duro de la naturaleza.', source: 'Expresión idiomática del español' }),
  makeSentence({ id: 'sentence-115', pack: 'expresiones', category: 'expresion', prompt: 'Esto es __ comido.', canonicalAnswer: 'pan', acceptedAnswers: ['pan'], hint: 'Alimento básico hecho con harina.', source: 'Expresión idiomática del español' }),
  makeSentence({ id: 'sentence-116', pack: 'expresiones', category: 'expresion', prompt: 'Estar hecho un ____.', canonicalAnswer: 'lío', acceptedAnswers: ['lío', 'lio'], hint: 'Un desorden o embrollo.', source: 'Expresión idiomática del español' }),
  makeSentence({ id: 'sentence-117', pack: 'expresiones', category: 'expresion', prompt: 'Estar en el séptimo ____.', canonicalAnswer: 'cielo', acceptedAnswers: ['cielo'], hint: 'Está encima de nosotros.', source: 'Expresión idiomática del español' }),
  makeSentence({ id: 'sentence-118', pack: 'expresiones', category: 'expresion', prompt: 'Al final siempre paga el ____.', canonicalAnswer: 'pato', acceptedAnswers: ['pato'], hint: 'Ave que nada.', source: 'Expresión idiomática del español' }),
  makeSentence({ id: 'sentence-119', pack: 'expresiones', category: 'expresion', prompt: 'Tomar el ____.', canonicalAnswer: 'pelo', acceptedAnswers: ['pelo'], hint: 'Crece en la cabeza.', source: 'Expresión idiomática del español' }),
  makeSentence({ id: 'sentence-120', pack: 'expresiones', category: 'expresion', prompt: 'No dar pie con ____.', canonicalAnswer: 'bola', acceptedAnswers: ['bola'], hint: 'Objeto redondo.', source: 'Expresión idiomática del español' }),
  makeSentence({ id: 'sentence-121', pack: 'expresiones', category: 'expresion', prompt: 'Le dio ____.', canonicalAnswer: 'calabazas', acceptedAnswers: ['calabazas'], hint: 'Frutos de color naranja.', source: 'Expresión idiomática del español' }),
  makeSentence({ id: 'sentence-122', pack: 'expresiones', category: 'expresion', prompt: 'Tener la mosca detrás de la ____.', canonicalAnswer: 'oreja', acceptedAnswers: ['oreja'], hint: 'Parte del cuerpo que usamos para oír.', source: 'Expresión idiomática del español' }),
  makeSentence({ id: 'sentence-123', pack: 'expresiones', category: 'expresion', prompt: 'Ponerse de ____.', canonicalAnswer: 'acuerdo', acceptedAnswers: ['acuerdo'], hint: 'Coincidir con otra persona.', source: 'Expresión idiomática del español' }),
  makeSentence({ id: 'sentence-124', pack: 'expresiones', category: 'expresion', prompt: 'Estar de brazos ____.', canonicalAnswer: 'cruzados', acceptedAnswers: ['cruzados'], hint: 'Colocados uno sobre otro.', source: 'Expresión idiomática del español' }),
  makeSentence({ id: 'sentence-125', pack: 'expresiones', category: 'expresion', prompt: 'Buscar una aguja en un ____.', canonicalAnswer: 'pajar', acceptedAnswers: ['pajar'], hint: 'Montón de paja.', source: 'Expresión idiomática del español' }),
  makeSentence({ id: 'sentence-126', pack: 'expresiones', category: 'expresion', prompt: 'Hablar por los ____.', canonicalAnswer: 'codos', acceptedAnswers: ['codos'], hint: 'Articulaciones de los brazos.', source: 'Expresión idiomática del español' }),

  makeSentence({ id: 'sentence-127', pack: 'citas', category: 'cita', prompt: 'El fin justifica los ____.', canonicalAnswer: 'medios', acceptedAnswers: ['medios'], hint: 'Los recursos usados para lograr algo.', author: 'Atribuida a Nicolás Maquiavelo', source: 'Atribución popular relacionada con El príncipe' }),
  makeSentence({ id: 'sentence-128', pack: 'citas', category: 'cita', prompt: 'Conócete a ti ____.', canonicalAnswer: 'mismo', acceptedAnswers: ['mismo', 'misma'], hint: 'Una persona debe mirarse por dentro.', author: 'Máxima de Delfos', source: 'Tradición filosófica griega' }),
  makeSentence({ id: 'sentence-129', pack: 'citas', category: 'cita', prompt: 'El que lee mucho y anda mucho, ve mucho y sabe ____.', canonicalAnswer: 'mucho', acceptedAnswers: ['mucho'], hint: 'Lo contrario de poco.', author: 'Miguel de Cervantes', source: 'Don Quijote de la Mancha' }),
  makeSentence({ id: 'sentence-130', pack: 'citas', category: 'cita', prompt: 'El hombre es la medida de todas las ____.', canonicalAnswer: 'cosas', acceptedAnswers: ['cosas'], hint: 'Todo lo que existe.', author: 'Protágoras', source: 'Tradición filosófica griega' }),
  makeSentence({ id: 'sentence-131', pack: 'citas', category: 'cita', prompt: 'El arte es largo y la vida ____.', canonicalAnswer: 'breve', acceptedAnswers: ['breve'], hint: 'Lo contrario de larga.', author: 'Atribuida a Hipócrates', source: 'Aforismo clásico “Ars longa, vita brevis”' }),
  makeSentence({ id: 'sentence-132', pack: 'citas', category: 'cita', prompt: 'La pluma es más poderosa que la ____.', canonicalAnswer: 'espada', acceptedAnswers: ['espada'], hint: 'Arma blanca.', author: 'Edward Bulwer-Lytton', source: 'Richelieu; Or the Conspiracy, 1839' }),
  makeSentence({ id: 'sentence-133', pack: 'citas', category: 'cita', prompt: 'El que tiene un porqué para vivir puede soportar casi cualquier ____.', canonicalAnswer: 'cómo', acceptedAnswers: ['cómo', 'como'], hint: 'Pregunta por la manera.', author: 'Friedrich Nietzsche', source: 'El crepúsculo de los ídolos, 1889' }),
  makeSentence({ id: 'sentence-134', pack: 'citas', category: 'cita', prompt: 'La simplicidad es la máxima ____.', canonicalAnswer: 'sofisticación', acceptedAnswers: ['sofisticación', 'sofisticacion'], hint: 'Elegancia compleja.', author: 'Atribuida a Leonardo da Vinci', source: 'Cita popular atribuida a Leonardo' }),
  makeSentence({ id: 'sentence-135', pack: 'citas', category: 'cita', prompt: 'La creatividad es la inteligencia ____.', canonicalAnswer: 'divirtiéndose', acceptedAnswers: ['divirtiéndose', 'divirtiendose'], hint: 'Pasándolo bien.', author: 'Atribuida a Albert Einstein', source: 'Cita popular atribuida a Einstein' }),
  makeSentence({ id: 'sentence-136', pack: 'citas', category: 'cita', prompt: 'La educación es el arma más poderosa para cambiar el ____.', canonicalAnswer: 'mundo', acceptedAnswers: ['mundo'], hint: 'El planeta y la sociedad.', author: 'Nelson Mandela', source: 'Cita atribuida a Mandela' }),
  makeSentence({ id: 'sentence-137', pack: 'citas', category: 'cita', prompt: 'El futuro pertenece a quienes creen en la belleza de sus ____.', canonicalAnswer: 'sueños', acceptedAnswers: ['sueños', 'suenos'], hint: 'Lo que imaginamos al dormir o al proyectarnos.', author: 'Eleanor Roosevelt', source: 'Cita atribuida a Eleanor Roosevelt' }),
  makeSentence({ id: 'sentence-138', pack: 'citas', category: 'cita', prompt: 'No se puede enseñar nada a un hombre; solo ayudarle a encontrar la respuesta dentro de sí ____.', canonicalAnswer: 'mismo', acceptedAnswers: ['mismo'], hint: 'En su propio interior.', author: 'Atribuida a Galileo Galilei', source: 'Cita popular atribuida a Galileo' }),
  makeSentence({ id: 'sentence-139', pack: 'citas', category: 'cita', prompt: 'La medida de la inteligencia es la capacidad de ____.', canonicalAnswer: 'cambiar', acceptedAnswers: ['cambiar'], hint: 'Hacer algo de otra manera.', author: 'Atribuida a Albert Einstein', source: 'Cita popular atribuida a Einstein' }),
  makeSentence({ id: 'sentence-140', pack: 'citas', category: 'cita', prompt: 'La paz comienza con una ____.', canonicalAnswer: 'sonrisa', acceptedAnswers: ['sonrisa'], hint: 'Se hace con la boca.', author: 'Atribuida a Teresa de Calcuta', source: 'Cita popular atribuida a Teresa de Calcuta' }),
  makeSentence({ id: 'sentence-141', pack: 'citas', category: 'cita', prompt: 'Si quieres resultados distintos, no hagas siempre lo ____.', canonicalAnswer: 'mismo', acceptedAnswers: ['mismo'], hint: 'Lo contrario de diferente.', author: 'Atribuida a Albert Einstein', source: 'Cita popular atribuida a Einstein' }),
  makeSentence({ id: 'sentence-142', pack: 'citas', category: 'cita', prompt: 'El tiempo es un gran ____.', canonicalAnswer: 'maestro', acceptedAnswers: ['maestro'], hint: 'Persona que enseña.', author: 'Pierre Corneille', source: 'Aforismo atribuido a Corneille' }),
  makeSentence({ id: 'sentence-143', pack: 'citas', category: 'cita', prompt: 'La música es el lenguaje universal de la ____.', canonicalAnswer: 'humanidad', acceptedAnswers: ['humanidad'], hint: 'El conjunto de las personas.', author: 'Atribuida a Henry Wadsworth Longfellow', source: 'Cita popular atribuida a Longfellow' }),
  makeSentence({ id: 'sentence-144', pack: 'citas', category: 'cita', prompt: 'La belleza perece en la vida, pero es inmortal en el ____.', canonicalAnswer: 'arte', acceptedAnswers: ['arte'], hint: 'Creación artística.', author: 'Atribuida a Leonardo da Vinci', source: 'Cita popular atribuida a Leonardo' }),
  makeSentence({ id: 'sentence-145', pack: 'citas', category: 'cita', prompt: 'La mejor victoria es vencer sin ____.', canonicalAnswer: 'combatir', acceptedAnswers: ['combatir'], hint: 'Luchar contra alguien.', author: 'Sun Tzu', source: 'El arte de la guerra' }),
  makeSentence({ id: 'sentence-146', pack: 'citas', category: 'cita', prompt: 'El viaje de mil millas comienza con un primer ____.', canonicalAnswer: 'paso', acceptedAnswers: ['paso'], hint: 'Movimiento de una pierna al caminar.', author: 'Lao-Tsé', source: 'Atribución tradicional del Tao Te Ching' }),
  makeSentence({ id: 'sentence-147', pack: 'citas', category: 'cita', prompt: 'La verdad os hará ____.', canonicalAnswer: 'libres', acceptedAnswers: ['libres'], hint: 'Sin estar sometidos.', author: 'Evangelio de Juan', source: 'Juan 8:32' }),
  makeSentence({ id: 'sentence-148', pack: 'citas', category: 'cita', prompt: 'La historia la escriben los ____.', canonicalAnswer: 'vencedores', acceptedAnswers: ['vencedores'], hint: 'Quienes ganan.', author: 'Atribuida a Winston Churchill', source: 'Cita popular atribuida a Churchill' }),
  makeSentence({ id: 'sentence-149', pack: 'citas', category: 'cita', prompt: 'El saber no ocupa ____.', canonicalAnswer: 'lugar', acceptedAnswers: ['lugar'], hint: 'Un espacio.', source: 'Dicho popular español' }),
  makeSentence({ id: 'sentence-150', pack: 'citas', category: 'cita', prompt: 'La palabra es mitad de quien la pronuncia y mitad de quien la ____.', canonicalAnswer: 'escucha', acceptedAnswers: ['escucha'], hint: 'Prestar atención con los oídos.', author: 'Michel de Montaigne', source: 'Ensayos · atribución habitual' }),
  makeSentence({ id: 'sentence-151', pack: 'citas', category: 'cita', prompt: 'El amor mueve ____.', canonicalAnswer: 'montañas', acceptedAnswers: ['montañas', 'montanas'], hint: 'Grandes elevaciones de terreno.', source: 'Dicho popular' }),
  makeSentence({ id: 'sentence-152', pack: 'citas', category: 'cita', prompt: 'La risa es el sol que ahuyenta el invierno del rostro ____.', canonicalAnswer: 'humano', acceptedAnswers: ['humano'], hint: 'Relacionado con las personas.', author: 'Victor Hugo', source: 'Cita atribuida a Victor Hugo' }),
  makeSentence({ id: 'sentence-153', pack: 'citas', category: 'cita', prompt: 'El mundo es un ____, y quienes no viajan leen solo una página.', canonicalAnswer: 'libro', acceptedAnswers: ['libro'], hint: 'Tiene páginas.', author: 'Atribuida a San Agustín', source: 'Cita tradicional atribuida a San Agustín' }),
  makeSentence({ id: 'sentence-154', pack: 'citas', category: 'cita', prompt: 'La noche es más oscura justo antes del ____.', canonicalAnswer: 'amanecer', acceptedAnswers: ['amanecer'], hint: 'Cuando empieza el día.', source: 'Dicho popular y cultura cinematográfica' }),

  makeSentence({ id: 'sentence-155', pack: 'historicas', category: 'historica', prompt: 'El Estado soy ____.', canonicalAnswer: 'yo', acceptedAnswers: ['yo'], hint: 'La persona que habla.', author: 'Atribuida a Luis XIV', source: 'Frase histórica atribuida al Rey Sol' }),
  makeSentence({ id: 'sentence-156', pack: 'historicas', category: 'historica', prompt: 'Después de mí, el ____.', canonicalAnswer: 'diluvio', acceptedAnswers: ['diluvio'], hint: 'Lluvia muy intensa y prolongada.', author: 'Atribuida a Luis XV', source: 'Frase histórica atribuida a Luis XV' }),
  makeSentence({ id: 'sentence-157', pack: 'historicas', category: 'historica', prompt: 'Divide y ____.', canonicalAnswer: 'vencerás', acceptedAnswers: ['vencerás', 'venceras'], hint: 'Ganar en el futuro.', source: 'Máxima política tradicional' }),
  makeSentence({ id: 'sentence-158', pack: 'historicas', category: 'historica', prompt: 'Pan y ____.', canonicalAnswer: 'circo', acceptedAnswers: ['circo'], hint: 'Espectáculo con acróbatas y payasos.', author: 'Juvenal', source: 'Sátiras, expresión “panem et circenses”' }),
  makeSentence({ id: 'sentence-159', pack: 'historicas', category: 'historica', prompt: 'Proletarios de todos los países, ____.', canonicalAnswer: 'uníos', acceptedAnswers: ['uníos', 'unios'], hint: 'Juntaos.', author: 'Karl Marx y Friedrich Engels', source: 'Manifiesto Comunista, 1848' }),
  makeSentence({ id: 'sentence-160', pack: 'historicas', category: 'historica', prompt: 'Seamos realistas, pidamos lo ____.', canonicalAnswer: 'imposible', acceptedAnswers: ['imposible'], hint: 'Que no puede hacerse.', source: 'Lema de Mayo del 68' }),
  makeSentence({ id: 'sentence-161', pack: 'historicas', category: 'historica', prompt: 'Bajo los adoquines está la ____.', canonicalAnswer: 'playa', acceptedAnswers: ['playa'], hint: 'Arena junto al mar.', source: 'Lema de Mayo del 68' }),
  makeSentence({ id: 'sentence-162', pack: 'historicas', category: 'historica', prompt: 'Paz, pan y ____.', canonicalAnswer: 'tierra', acceptedAnswers: ['tierra'], hint: 'El suelo que pisamos.', source: 'Lema de la Revolución rusa' }),
  makeSentence({ id: 'sentence-163', pack: 'historicas', category: 'historica', prompt: 'Tierra y ____.', canonicalAnswer: 'libertad', acceptedAnswers: ['libertad'], hint: 'Lo contrario de esclavitud.', author: 'Emiliano Zapata', source: 'Lema revolucionario mexicano' }),
  makeSentence({ id: 'sentence-164', pack: 'historicas', category: 'historica', prompt: 'Orden y ____.', canonicalAnswer: 'progreso', acceptedAnswers: ['progreso'], hint: 'Avance o mejora.', source: 'Lema nacional de Brasil' }),
  makeSentence({ id: 'sentence-165', pack: 'historicas', category: 'historica', prompt: 'Sangre, sudor y ____.', canonicalAnswer: 'lágrimas', acceptedAnswers: ['lágrimas', 'lagrimas'], hint: 'Se derraman al llorar.', author: 'Winston Churchill', source: 'Discurso ante la Cámara de los Comunes, 1940' }),
  makeSentence({ id: 'sentence-166', pack: 'historicas', category: 'historica', prompt: 'Nunca tantos debieron tanto a tan ____.', canonicalAnswer: 'pocos', acceptedAnswers: ['pocos'], hint: 'Lo contrario de muchos.', author: 'Winston Churchill', source: 'Discurso sobre la Batalla de Inglaterra, 1940' }),
  makeSentence({ id: 'sentence-167', pack: 'historicas', category: 'historica', prompt: 'Un pequeño paso para un hombre, un gran salto para la ____.', canonicalAnswer: 'humanidad', acceptedAnswers: ['humanidad'], hint: 'Todas las personas.', author: 'Neil Armstrong', source: 'Alunizaje del Apolo 11, 1969' }),
  makeSentence({ id: 'sentence-168', pack: 'historicas', category: 'historica', prompt: 'La imaginación al ____.', canonicalAnswer: 'poder', acceptedAnswers: ['poder'], hint: 'Capacidad de hacer algo.', source: 'Lema de Mayo del 68' }),
  makeSentence({ id: 'sentence-169', pack: 'historicas', category: 'historica', prompt: 'Todo para el pueblo, pero sin el ____.', canonicalAnswer: 'pueblo', acceptedAnswers: ['pueblo'], hint: 'La gente de un país.', source: 'Fórmula del despotismo ilustrado' }),
  makeSentence({ id: 'sentence-170', pack: 'historicas', category: 'historica', prompt: 'La propiedad es un ____.', canonicalAnswer: 'robo', acceptedAnswers: ['robo'], hint: 'Tomar algo que no es tuyo.', author: 'Pierre-Joseph Proudhon', source: '¿Qué es la propiedad?, 1840' }),
  makeSentence({ id: 'sentence-171', pack: 'historicas', category: 'historica', prompt: 'La religión es el opio del ____.', canonicalAnswer: 'pueblo', acceptedAnswers: ['pueblo'], hint: 'La gente de una sociedad.', author: 'Karl Marx', source: 'Contribución a la crítica de la filosofía del derecho de Hegel, 1843' }),
  makeSentence({ id: 'sentence-172', pack: 'historicas', category: 'historica', prompt: '¡Santiago y ____, España!', canonicalAnswer: 'cierra', acceptedAnswers: ['cierra'], hint: 'Verbo que significa cerrar.', source: 'Grito histórico de batalla' }),
  makeSentence({ id: 'sentence-173', pack: 'historicas', category: 'historica', prompt: 'El pueblo unido jamás será ____.', canonicalAnswer: 'vencido', acceptedAnswers: ['vencido'], hint: 'Derrotado.', source: 'Lema político y canción popular' }),
  makeSentence({ id: 'sentence-174', pack: 'historicas', category: 'historica', prompt: '¡Independencia o __!', canonicalAnswer: 'muerte', acceptedAnswers: ['muerte'], hint: 'El final de la vida.', source: 'Lema independentista latinoamericano' }),
  makeSentence({ id: 'sentence-175', pack: 'historicas', category: 'historica', prompt: '¡Patria o __!', canonicalAnswer: 'muerte', acceptedAnswers: ['muerte'], hint: 'El final de la vida.', source: 'Lema político cubano' }),
  makeSentence({ id: 'sentence-176', pack: 'historicas', category: 'historica', prompt: 'La historia me ____.', canonicalAnswer: 'absolverá', acceptedAnswers: ['absolverá', 'absolvera'], hint: 'Declarar inocente.', author: 'Fidel Castro', source: 'La historia me absolverá, 1953' }),

  makeSentence({ id: 'sentence-177', pack: 'humor', category: 'humor', prompt: 'Un día sin reír es un día ____.', canonicalAnswer: 'perdido', acceptedAnswers: ['perdido'], hint: 'Que no se ha aprovechado.', author: 'Atribuida a Charlie Chaplin', source: 'Cita popular atribuida a Chaplin' }),
  makeSentence({ id: 'sentence-178', pack: 'humor', category: 'humor', prompt: 'La vida es demasiado importante para tomarla en ____.', canonicalAnswer: 'serio', acceptedAnswers: ['serio'], hint: 'Lo contrario de broma.', author: 'Oscar Wilde', source: 'Cita atribuida a Oscar Wilde' }),
  makeSentence({ id: 'sentence-179', pack: 'humor', category: 'humor', prompt: 'La experiencia es el nombre que damos a nuestros ____.', canonicalAnswer: 'errores', acceptedAnswers: ['errores'], hint: 'Fallos o equivocaciones.', author: 'Oscar Wilde', source: 'Cita atribuida a Oscar Wilde' }),
  makeSentence({ id: 'sentence-180', pack: 'humor', category: 'humor', prompt: 'La mejor manera de librarse de la tentación es ____.', canonicalAnswer: 'ceder', acceptedAnswers: ['ceder'], hint: 'Dejar de resistirse.', author: 'Oscar Wilde', source: 'La importancia de llamarse Ernesto, 1895' }),
  makeSentence({ id: 'sentence-181', pack: 'humor', category: 'humor', prompt: '¿A quién va usted a creer, a mí o a sus propios __?', canonicalAnswer: 'ojos', acceptedAnswers: ['ojos'], hint: 'Sirven para ver.', author: 'Groucho Marx', source: 'Frase humorística atribuida a Groucho Marx' }),
  makeSentence({ id: 'sentence-182', pack: 'humor', category: 'humor', prompt: 'He tenido una noche maravillosa, pero no ha sido esta ____.', canonicalAnswer: 'noche', acceptedAnswers: ['noche'], hint: 'Lo contrario de día.', author: 'Groucho Marx', source: 'Frase humorística atribuida a Groucho Marx' }),
  makeSentence({ id: 'sentence-183', pack: 'humor', category: 'humor', prompt: 'Es mejor estar callado y parecer tonto que abrir la boca y despejar toda ____.', canonicalAnswer: 'duda', acceptedAnswers: ['duda'], hint: 'Falta de certeza.', author: 'Atribuida a Mark Twain', source: 'Frase humorística atribuida a Mark Twain' }),
  makeSentence({ id: 'sentence-184', pack: 'humor', category: 'humor', prompt: 'Si no puedes convencerlos, ____.', canonicalAnswer: 'confúndelos', acceptedAnswers: ['confúndelos', 'confundelos'], hint: 'Haz que no entiendan nada.', author: 'Atribuida a Harry Truman', source: 'Frase humorística atribuida a Harry Truman' }),
  makeSentence({ id: 'sentence-185', pack: 'humor', category: 'humor', prompt: 'La risa es la distancia más corta entre dos ____.', canonicalAnswer: 'personas', acceptedAnswers: ['personas'], hint: 'Seres humanos.', author: 'Victor Borge', source: 'Cita humorística atribuida a Victor Borge' }),
  makeSentence({ id: 'sentence-186', pack: 'humor', category: 'humor', prompt: 'La prueba más segura de que existe vida inteligente en otros planetas es que no han ____.', canonicalAnswer: 'contactado', acceptedAnswers: ['contactado'], hint: 'Comunicado con nosotros.', author: 'Bill Watterson', source: 'Cita humorística atribuida a Bill Watterson' }),
  makeSentence({ id: 'sentence-187', pack: 'humor', category: 'humor', prompt: 'No tengo miedo a la muerte; solo no quiero estar allí cuando ____.', canonicalAnswer: 'ocurra', acceptedAnswers: ['ocurra'], hint: 'Ocurra.', author: 'Atribuida a Woody Allen', source: 'Cita humorística atribuida a Woody Allen' }),
  makeSentence({ id: 'sentence-188', pack: 'humor', category: 'humor', prompt: 'La vida es como una caja de bombones: nunca sabes lo que te va a ____.', canonicalAnswer: 'tocar', acceptedAnswers: ['tocar'], hint: 'Lo que te corresponde recibir.', source: 'Forrest Gump · cultura popular' }),
  makeSentence({ id: 'sentence-189', pack: 'humor', category: 'humor', prompt: 'Si quieres contarle a la gente la verdad, hazles reír; de lo contrario te ____.', canonicalAnswer: 'matarán', acceptedAnswers: ['matarán', 'mataran'], hint: 'Te quitarán la vida.', author: 'Oscar Wilde', source: 'Cita atribuida a Oscar Wilde' }),
  makeSentence({ id: 'sentence-190', pack: 'humor', category: 'humor', prompt: '¿Qué ha hecho la posteridad por __?', canonicalAnswer: 'mí', acceptedAnswers: ['mí', 'mi'], hint: 'La persona que habla.', author: 'Groucho Marx', source: 'Frase humorística atribuida a Groucho Marx' }),
  makeSentence({ id: 'sentence-191', pack: 'humor', category: 'humor', prompt: 'Cualquiera puede envejecer; lo único que hay que hacer es vivir lo ____.', canonicalAnswer: 'suficiente', acceptedAnswers: ['suficiente'], hint: 'En la cantidad necesaria.', author: 'Groucho Marx', source: 'Frase humorística atribuida a Groucho Marx' }),
  makeSentence({ id: 'sentence-192', pack: 'humor', category: 'humor', prompt: 'La inteligencia me persigue, pero yo soy más ____.', canonicalAnswer: 'rápido', acceptedAnswers: ['rápido', 'rapido'], hint: 'Que se mueve a gran velocidad.', source: 'Humor popular' }),

  makeSentence({ id: 'sentence-193', pack: 'memes', category: 'meme', prompt: '¿Por qué tan __?', canonicalAnswer: 'serio', acceptedAnswers: ['serio'], hint: 'Lo contrario de divertido.', source: 'The Dark Knight · cultura popular' }),
  makeSentence({ id: 'sentence-194', pack: 'memes', category: 'meme', prompt: 'Hakuna ____.', canonicalAnswer: 'matata', acceptedAnswers: ['matata'], hint: 'Una expresión que significa “sin preocupaciones”.', source: 'El rey león · cultura popular' }),
  makeSentence({ id: 'sentence-195', pack: 'memes', category: 'meme', prompt: '¡Hasta el infinito y más __!', canonicalAnswer: 'allá', acceptedAnswers: ['allá', 'alla'], hint: 'Más lejos que aquí.', source: 'Toy Story · cultura popular' }),
  makeSentence({ id: 'sentence-196', pack: 'memes', category: 'meme', prompt: 'Elemental, mi querido ____.', canonicalAnswer: 'Watson', acceptedAnswers: ['Watson', 'watson'], hint: 'El compañero de Sherlock Holmes.', source: 'Sherlock Holmes · cultura popular' }),
  makeSentence({ id: 'sentence-197', pack: 'memes', category: 'meme', prompt: 'Bond, __ Bond.', canonicalAnswer: 'James', acceptedAnswers: ['James', 'james'], hint: 'El nombre del agente 007.', source: 'James Bond · cultura popular' }),
  makeSentence({ id: 'sentence-198', pack: 'memes', category: 'meme', prompt: 'No hay lugar como el ____.', canonicalAnswer: 'hogar', acceptedAnswers: ['hogar'], hint: 'La casa propia.', source: 'El mago de Oz · cultura popular' }),
  makeSentence({ id: 'sentence-199', pack: 'memes', category: 'meme', prompt: 'Siempre nos quedará ____.', canonicalAnswer: 'París', acceptedAnswers: ['París', 'paris'], hint: 'Capital francesa.', source: 'Casablanca · cultura popular' }),
  makeSentence({ id: 'sentence-200', pack: 'memes', category: 'meme', prompt: '¡Corre, Forrest, __!', canonicalAnswer: 'corre', acceptedAnswers: ['corre'], hint: 'Muévete deprisa.', source: 'Forrest Gump · cultura popular' }),
  makeSentence({ id: 'sentence-201', pack: 'memes', category: 'meme', prompt: '¿Quién vive en una piña debajo del __?', canonicalAnswer: 'mar', acceptedAnswers: ['mar'], hint: 'Agua salada que cubre gran parte del planeta.', source: 'Bob Esponja · cultura popular' }),
  makeSentence({ id: 'sentence-202', pack: 'memes', category: 'meme', prompt: 'Un gran poder conlleva una gran ____.', canonicalAnswer: 'responsabilidad', acceptedAnswers: ['responsabilidad'], hint: 'Obligación de responder por algo.', source: 'Spider-Man · cultura popular' }),
  makeSentence({ id: 'sentence-203', pack: 'memes', category: 'meme', prompt: "I'll be ____.", canonicalAnswer: 'back', acceptedAnswers: ['back'], hint: 'Volveré.', source: 'Terminator · cultura popular' }),
  makeSentence({ id: 'sentence-204', pack: 'memes', category: 'meme', prompt: 'Keep calm and carry ____.', canonicalAnswer: 'on', acceptedAnswers: ['on'], hint: 'Sigue adelante, en inglés.', source: 'Cartel británico de 1939 · cultura popular' }),
  makeSentence({ id: 'sentence-205', pack: 'memes', category: 'meme', prompt: 'This is ____.', canonicalAnswer: 'fine', acceptedAnswers: ['fine'], hint: '“Esto está bien”, en inglés.', source: 'Meme “This Is Fine” · cultura popular' }),
  makeSentence({ id: 'sentence-206', pack: 'memes', category: 'meme', prompt: 'One does not simply walk into ____.', canonicalAnswer: 'Mordor', acceptedAnswers: ['Mordor', 'mordor'], hint: 'La tierra de Sauron.', source: 'El Señor de los Anillos · cultura popular' }),
  makeSentence({ id: 'sentence-207', pack: 'memes', category: 'meme', prompt: "It's over ____, I have the high ground.", canonicalAnswer: 'Anakin', acceptedAnswers: ['Anakin', 'anakin'], hint: 'El nombre del personaje al que habla Obi-Wan.', source: 'Star Wars · cultura popular' }),
  makeSentence({ id: 'sentence-208', pack: 'memes', category: 'meme', prompt: 'I am ____.', canonicalAnswer: 'Iron Man', acceptedAnswers: ['Iron Man', 'iron man'], hint: 'La identidad de Tony Stark.', source: 'Iron Man · cultura popular' }),
  makeSentence({ id: 'sentence-209', pack: 'memes', category: 'meme', prompt: 'You shall not __!', canonicalAnswer: 'pass', acceptedAnswers: ['pass'], hint: 'No podrás pasar, en inglés.', source: 'El Señor de los Anillos · cultura popular' }),
  makeSentence({ id: 'sentence-210', pack: 'memes', category: 'meme', prompt: "Don't ____.", canonicalAnswer: 'panic', acceptedAnswers: ['panic'], hint: 'No te alteres, en inglés.', source: 'Guía del autoestopista galáctico · cultura popular' }),
];

export const SENTENCE_QUESTIONS: readonly SentenceQuestion[] = [
  ...SENTENCE_BASE_QUESTIONS,
  ...SENTENCE_EXTRA_QUESTIONS,
];

export function sentenceQuestionById(id: string, questions: readonly SentenceQuestion[] = SENTENCE_QUESTIONS): SentenceQuestion {
  return questions.find((question) => question.id === id) ?? firstOrThrow(questions, SENTENCE_QUESTIONS, 'Completa la frase');
}

export function sentenceQuestionIdsFor(pack: SentencePack, questions: readonly SentenceQuestion[] = SENTENCE_QUESTIONS): string[] {
  // `todo` (y el pack `originales` de salas antiguas) significa mezclar todo
  // el catálogo disponible; no se crean frases artificiales para ese legado.
  const filtered = pack === 'todo' || pack === 'originales'
    ? questions
    : questions.filter((question) => question.pack === pack);
  return (filtered.length > 0 ? filtered : questions).map((question) => question.id);
}
