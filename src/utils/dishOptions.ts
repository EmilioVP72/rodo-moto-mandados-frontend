import type { MenuItemOptionGroup } from '../types';

export type GroupSelectionCounts = Record<string, number>;

export interface NormalizedOptionGroupBounds {
  required: boolean;
  hasLimit: boolean;
  minSelect: number;
  maxSelect: number | null;
  allowRepeat: boolean;
}

export function normalizeOptionGroupBounds(group: MenuItemOptionGroup): NormalizedOptionGroupBounds {
  const optionsCount = Array.isArray(group.options) ? group.options.length : 0;
  const hasLimit = group.hasLimit !== false && (group.maxSelect ?? 1) > 0;
  const rawMax = hasLimit ? Math.max(1, Math.floor(group.maxSelect || 1)) : null;
  const required = group.required !== false;

  let minSelect: number;
  if (typeof group.minSelect === 'number' && Number.isFinite(group.minSelect)) {
    minSelect = Math.max(0, Math.floor(group.minSelect));
  } else {
    minSelect = required ? 1 : 0;
  }

  if (rawMax !== null && minSelect > rawMax) {
    minSelect = rawMax;
  }
  if (!group.allowRepeat && optionsCount > 0 && minSelect > optionsCount) {
    minSelect = optionsCount;
  }

  return {
    required: minSelect > 0,
    hasLimit,
    minSelect,
    maxSelect: rawMax,
    allowRepeat: Boolean(group.allowRepeat) && (rawMax === null || rawMax > 1),
  };
}

export function getTotalGroupSelections(counts: GroupSelectionCounts | undefined): number {
  if (!counts) return 0;
  return Object.values(counts).reduce((sum, n) => sum + (n > 0 ? n : 0), 0);
}

export function isOptionGroupSatisfied(
  group: MenuItemOptionGroup,
  counts: GroupSelectionCounts | undefined
): boolean {
  const bounds = normalizeOptionGroupBounds(group);
  const total = getTotalGroupSelections(counts);
  if (total < bounds.minSelect) return false;
  if (bounds.hasLimit && bounds.maxSelect !== null && total > bounds.maxSelect) return false;
  return true;
}

export function getOptionGroupRuleSubtitle(group: MenuItemOptionGroup): string {
  const bounds = normalizeOptionGroupBounds(group);
  if (!bounds.hasLimit) {
    return bounds.minSelect > 0
      ? `Obligatorio · Elige al menos ${bounds.minSelect} (sin límite máximo)`
      : 'Opcional · Sin límite de elecciones';
  }
  if (bounds.minSelect === bounds.maxSelect) {
    return bounds.maxSelect === 1
      ? 'Obligatorio · Elige 1 opción'
      : `Obligatorio · Elige exactamente ${bounds.maxSelect}${bounds.allowRepeat ? ' (puedes repetir)' : ''}`;
  }
  if (bounds.minSelect === 0) {
    return `Opcional · Máximo ${bounds.maxSelect} ${bounds.maxSelect === 1 ? 'opción' : 'opciones'}`;
  }
  return `Obligatorio · Elige de ${bounds.minSelect} a ${bounds.maxSelect} opciones`;
}

export function getOptionGroupBadgeText(
  group: MenuItemOptionGroup,
  counts: GroupSelectionCounts | undefined
): string {
  const bounds = normalizeOptionGroupBounds(group);
  const total = getTotalGroupSelections(counts);
  if (!bounds.hasLimit) {
    return total > 0 ? `${total} elegida${total === 1 ? '' : 's'} · Sin límite` : 'Sin límite';
  }
  if (bounds.minSelect === bounds.maxSelect) {
    return `${total} de ${bounds.maxSelect} ${bounds.maxSelect === 1 ? 'elegido' : 'elegidos'}`;
  }
  return `${total} / máx. ${bounds.maxSelect}`;
}

export function toggleSingleOrMultiOption(
  group: MenuItemOptionGroup,
  current: GroupSelectionCounts | undefined,
  option: string
): GroupSelectionCounts {
  const bounds = normalizeOptionGroupBounds(group);
  const map: GroupSelectionCounts = { ...(current || {}) };
  const isSelected = (map[option] || 0) > 0;
  const total = getTotalGroupSelections(map);

  // Caso radio (exactamente 1 o máximo 1 sin repetición)
  if (bounds.hasLimit && bounds.maxSelect === 1) {
    if (isSelected && bounds.minSelect === 0) {
      return {};
    }
    return { [option]: 1 };
  }

  if (isSelected) {
    delete map[option];
    return map;
  }

  if (bounds.hasLimit && bounds.maxSelect !== null && total >= bounds.maxSelect) {
    return map;
  }

  map[option] = 1;
  return map;
}

export function adjustRepeatableOptionCount(
  group: MenuItemOptionGroup,
  current: GroupSelectionCounts | undefined,
  option: string,
  delta: 1 | -1
): GroupSelectionCounts {
  const bounds = normalizeOptionGroupBounds(group);
  const map: GroupSelectionCounts = { ...(current || {}) };
  const prevQty = map[option] || 0;
  const total = getTotalGroupSelections(map);

  if (delta === -1) {
    if (prevQty <= 1) {
      delete map[option];
    } else {
      map[option] = prevQty - 1;
    }
    return map;
  }

  if (bounds.hasLimit && bounds.maxSelect !== null && total >= bounds.maxSelect) {
    return map;
  }
  map[option] = prevQty + 1;
  return map;
}

export function formatOptionGroupSummary(
  group: MenuItemOptionGroup,
  counts: GroupSelectionCounts | undefined
): string | null {
  if (!counts) return null;
  const entries = group.options
    .filter((opt) => (counts[opt] || 0) > 0)
    .map((opt) => {
      const qty = counts[opt];
      return qty > 1 ? `${qty}x ${opt}` : opt;
    });
  if (entries.length === 0) return null;
  return `${group.name}: ${entries.join(', ')}`;
}
