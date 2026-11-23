/**
 * Generador y validador de Códigos Locales (PIN de 3 dígitos) aleatorios y únicos
 * para el catálogo unificado de Restaurantes, Tarifas & Códigos.
 */

export function normalizeLocalCode(raw?: string | null): string {
  return String(raw || '').replace(/[^0-9]/g, '').slice(0, 4);
}

/**
 * Recopila todos los códigos ya ocupados por restaurantes y locales asociados,
 * excluyendo opcionalmente el restaurante que se está editando actualmente.
 */
export function collectUsedLocalCodes(
  restaurants: Array<{ id: string; localCode?: string | null }>,
  partnerLocals: Array<{ id: string; code?: string | null }> = [],
  excludeRestaurantId?: string
): Set<string> {
  const used = new Set<string>();
  const excludedPartnerId = excludeRestaurantId
    ? `loc-${excludeRestaurantId.replace(/[^a-zA-Z0-9_-]/g, '')}`
    : null;

  for (const r of restaurants) {
    if (excludeRestaurantId && r.id === excludeRestaurantId) continue;
    const clean = normalizeLocalCode(r.localCode);
    if (clean.length === 3) used.add(clean);
  }

  for (const l of partnerLocals) {
    if (excludedPartnerId && l.id === excludedPartnerId) continue;
    const clean = normalizeLocalCode(l.code);
    if (clean.length === 3) used.add(clean);
  }

  return used;
}

/**
 * Genera un código PIN numérico aleatorio de 3 dígitos (100–999) garantizando
 * que no exista en `existingCodes`. Si el rango de 3 dígitos estuviera lleno
 * (900 locales activos), escala de forma segura a 4 dígitos (1000–9999).
 */
export function generateUniqueRandomLocalCode(
  existingCodes: Iterable<string>,
  randomFn: () => number = Math.random
): string {
  const used = new Set<string>();
  for (const code of existingCodes) {
    const clean = normalizeLocalCode(code);
    if (clean) used.add(clean);
  }

  // Construir lista exacta de códigos disponibles en 100..999 (sin bucles infinitos)
  const available3: string[] = [];
  for (let n = 100; n <= 999; n++) {
    const candidate = String(n);
    if (!used.has(candidate)) {
      available3.push(candidate);
    }
  }

  if (available3.length > 0) {
    const idx = Math.min(available3.length - 1, Math.floor(randomFn() * available3.length));
    return available3[idx];
  }

  // Fallback de seguridad si se exceden 900 locales
  const available4: string[] = [];
  for (let n = 1000; n <= 9999; n++) {
    const candidate = String(n);
    if (!used.has(candidate)) {
      available4.push(candidate);
    }
  }
  const idx = Math.min(available4.length - 1, Math.floor(randomFn() * available4.length));
  return available4[idx] || String(1000 + Math.floor(randomFn() * 9000));
}

export function isUniqueValidLocalCode(
  code: string | undefined | null,
  usedCodes: Set<string>
): boolean {
  const clean = normalizeLocalCode(code);
  return /^\d{3}$/.test(clean) && !usedCodes.has(clean);
}
