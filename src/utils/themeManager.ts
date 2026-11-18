import { HolidayThemeId } from '../types';

export interface HolidayThemeDefinition {
  id: HolidayThemeId;
  name: string;
  seasonLabel: string;
  iconEmoji: string;
  shortDescription: string;
  primaryColor: string; // Color principal (reemplaza o matiza el rojo)
  secondaryColor: string; // Color de contraste festivo
  accentColor: string; // Color para botones o estrellas
  gradientHeader: string; // Clase o estilo de degradado
  gradientBanner: string;
  bannerGreeting: string; // Mensaje festivo mostrado al cliente
  cardBorderColor: string;
  badgeBg: string;
  badgeText: string;
  decorativeMotifs: string[]; // Emojis / iconos temáticos (ej: copos, corazones, banderas)
  tagline: string;
}

/**
 * REGISTRO MODULAR Y EXTENSIBLE DE TEMÁTICAS FESTIVAS
 * Abierto para agregar nuevas festividades fácilmente en futuras actualizaciones.
 */
export const HOLIDAY_THEMES: Record<HolidayThemeId, HolidayThemeDefinition> = {
  clasico_rodo: {
    id: 'clasico_rodo',
    name: 'RODO Clásico Oficial',
    seasonLabel: 'Todo el Año',
    iconEmoji: '🏍️',
    shortDescription: 'Rojo vibrante insignia oficial de RODO Moto Mandados con acentos negros.',
    primaryColor: '#ed0718',
    secondaryColor: '#101b29',
    accentColor: '#ed0718',
    gradientHeader: 'from-[#ed0718] via-[#c90012] to-[#88030b]',
    gradientBanner: 'from-[#ed0718] to-[#101b29]',
    bannerGreeting: '¡RODO Moto Mandados · Despacho y comida rápida en San Miguel de Allende!',
    cardBorderColor: 'border-red-500/40',
    badgeBg: 'bg-red-500/20',
    badgeText: 'text-red-400',
    decorativeMotifs: ['🏍️', '⚡', '📍', '🌮'],
    tagline: 'Entrega veloz y segura en moto por todo San Miguel',
  },

  navidad: {
    id: 'navidad',
    name: 'Navidad Mágica',
    seasonLabel: 'Diciembre (Navidad)',
    iconEmoji: '🎄',
    shortDescription: 'Rojo navideño con verde pino bosque, nieve dorada y motivos de regalos.',
    primaryColor: '#dc2626',
    secondaryColor: '#14532d',
    accentColor: '#f59e0b',
    gradientHeader: 'from-[#dc2626] via-[#991b1b] to-[#14532d]',
    gradientBanner: 'from-[#14532d] via-[#dc2626] to-[#b45309]',
    bannerGreeting: '🎅 ¡Feliz Navidad de parte del equipo RODO! Tus pedidos navideños calientitos y a tiempo.',
    cardBorderColor: 'border-amber-400/50',
    badgeBg: 'bg-emerald-500/20',
    badgeText: 'text-emerald-300',
    decorativeMotifs: ['🎄', '❄️', '🎁', '🔔', '✨'],
    tagline: 'Que la paz y tus antojitos lleguen calientitos a tu hogar',
  },

  ano_nuevo: {
    id: 'ano_nuevo',
    name: 'Año Nuevo & Campanadas',
    seasonLabel: 'Fin de Año & Año Nuevo',
    iconEmoji: '🥂',
    shortDescription: 'Dorado champagne con negro medianoche elegante y fuegos artificiales.',
    primaryColor: '#b45309',
    secondaryColor: '#090d16',
    accentColor: '#fbbf24',
    gradientHeader: 'from-[#090d16] via-[#1e293b] to-[#b45309]',
    gradientBanner: 'from-[#0f172a] via-[#78350f] to-[#fbbf24]',
    bannerGreeting: '🎆 ¡Feliz Año Nuevo! Que este año esté lleno de éxitos, salud y los mejores sabores.',
    cardBorderColor: 'border-amber-300/50',
    badgeBg: 'bg-amber-500/20',
    badgeText: 'text-amber-300',
    decorativeMotifs: ['🎆', '🥂', '⭐', '✨', '🕛'],
    tagline: 'Inicia el año disfrutando con tus platillos favoritos en familia',
  },

  nochebuena: {
    id: 'nochebuena',
    name: 'Flor de Nochebuena',
    seasonLabel: 'Nochebuena & Tradición',
    iconEmoji: '🌺',
    shortDescription: 'Rojo terciopelo profundo con follaje verde esmeralda y destellos cálidos.',
    primaryColor: '#991b1b',
    secondaryColor: '#065f46',
    accentColor: '#d97706',
    gradientHeader: 'from-[#991b1b] via-[#831843] to-[#065f46]',
    gradientBanner: 'from-[#065f46] via-[#991b1b] to-[#7f1d1d]',
    bannerGreeting: '🌺 ¡Cálida Nochebuena! La magia de la cena y las posadas en San Miguel.',
    cardBorderColor: 'border-red-400/50',
    badgeBg: 'bg-red-500/20',
    badgeText: 'text-red-300',
    decorativeMotifs: ['🌺', '🕯️', '🌟', '🔔'],
    tagline: 'Cenas tradicionales y antojos de posada en tu mesa',
  },

  san_valentin: {
    id: 'san_valentin',
    name: '14 de Febrero (San Valentín)',
    seasonLabel: 'Amor & Amistad',
    iconEmoji: '💖',
    shortDescription: 'Rojo carmesí romántico con magenta, corazones flotantes y rosas.',
    primaryColor: '#e11d48',
    secondaryColor: '#831843',
    accentColor: '#f43f5e',
    gradientHeader: 'from-[#e11d48] via-[#be123c] to-[#831843]',
    gradientBanner: 'from-[#be123c] via-[#e11d48] to-[#fb7185]',
    bannerGreeting: '💘 ¡Feliz Día del Amor y la Amistad! Sorprende a quien más quieres con su comida o detalle favorito.',
    cardBorderColor: 'border-pink-400/50',
    badgeBg: 'bg-pink-500/20',
    badgeText: 'text-pink-300',
    decorativeMotifs: ['💖', '🌹', '💌', '🍫', '✨'],
    tagline: 'Envíos con amor y detalles especiales para compartir',
  },

  dia_de_las_madres: {
    id: 'dia_de_las_madres',
    name: 'Día de la Madre',
    seasonLabel: 'Mayo (Mamá)',
    iconEmoji: '💐',
    shortDescription: 'Rosa bugambilia y flor de durazno con acentos dorados y elegancia.',
    primaryColor: '#db2777',
    secondaryColor: '#831843',
    accentColor: '#f59e0b',
    gradientHeader: 'from-[#db2777] via-[#be185d] to-[#4c0519]',
    gradientBanner: 'from-[#be185d] via-[#db2777] to-[#f472b6]',
    bannerGreeting: '💐 ¡Feliz Día de las Madres! Consiente a la reina de la casa con el mejor banquete sin cocinar.',
    cardBorderColor: 'border-rose-400/50',
    badgeBg: 'bg-rose-500/20',
    badgeText: 'text-rose-300',
    decorativeMotifs: ['💐', '👑', '🌷', '💖', '✨'],
    tagline: 'Consentir a mamá es nuestra prioridad número uno',
  },

  dia_del_padre: {
    id: 'dia_del_padre',
    name: 'Día del Padre',
    seasonLabel: 'Junio (Papá)',
    iconEmoji: '👔',
    shortDescription: 'Azul marino distinguido y acero ejecutivo con acentos en rojo cálido.',
    primaryColor: '#1e40af',
    secondaryColor: '#0f172a',
    accentColor: '#38bdf8',
    gradientHeader: 'from-[#1e40af] via-[#1e3a8a] to-[#0f172a]',
    gradientBanner: 'from-[#0f172a] via-[#1e40af] to-[#2563eb]',
    bannerGreeting: '👔 ¡Feliz Día del Padre! Cortes, hamburguesas, mariscos y botanas para festejar a papá como merece.',
    cardBorderColor: 'border-blue-400/50',
    badgeBg: 'bg-blue-500/20',
    badgeText: 'text-blue-300',
    decorativeMotifs: ['👔', '🥩', '🏆', '🍔', '⚡'],
    tagline: 'El banquete perfecto para el campeón de la familia',
  },

  dia_del_grito: {
    id: 'dia_del_grito',
    name: 'Día del Grito (Fiestas Patrias)',
    seasonLabel: '15 y 16 de Septiembre',
    iconEmoji: '🇲🇽',
    shortDescription: 'Tricolor mexicano: Verde bandera, Blanco y Rojo patrio con campana de Dolores.',
    primaryColor: '#15803d',
    secondaryColor: '#dc2626',
    accentColor: '#facc15',
    gradientHeader: 'from-[#15803d] via-[#111827] to-[#dc2626]',
    gradientBanner: 'from-[#15803d] via-[#b91c1c] to-[#ca8a04]',
    bannerGreeting: '🔔 ¡VIVA MÉXICO! Pozole, antojitos mexicanos, tacos y botana para dar el Grito en San Miguel.',
    cardBorderColor: 'border-emerald-400/50',
    badgeBg: 'bg-emerald-500/20',
    badgeText: 'text-emerald-300',
    decorativeMotifs: ['🇲🇽', '🔔', '🎺', '🌮', '🎉'],
    tagline: 'Cuna de la Independencia Nacional · ¡Viva San Miguel de Allende!',
  },
};

export const HOLIDAY_THEMES_ARRAY: HolidayThemeDefinition[] = [
  HOLIDAY_THEMES.clasico_rodo,
  HOLIDAY_THEMES.navidad,
  HOLIDAY_THEMES.ano_nuevo,
  HOLIDAY_THEMES.nochebuena,
  HOLIDAY_THEMES.san_valentin,
  HOLIDAY_THEMES.dia_de_las_madres,
  HOLIDAY_THEMES.dia_del_padre,
  HOLIDAY_THEMES.dia_del_grito,
];

export function getHolidayTheme(themeId?: HolidayThemeId): HolidayThemeDefinition {
  if (themeId && HOLIDAY_THEMES[themeId]) {
    return HOLIDAY_THEMES[themeId];
  }
  return HOLIDAY_THEMES.clasico_rodo;
}
