export interface CustomerSavedAddress {
  id: string;
  label: string;
  calle: string;
  numero?: string | null;
  numeroInterior?: string | null;
  colonia: string;
  referencias?: string | null;
  lat?: number | null;
  lng?: number | null;
  isDefault: boolean;
}

export function cleanStreetNumber(numero?: string | null): string {
  return (numero || '').trim().replace(/^#+/, '').trim();
}

export function formatSavedAddressLine(addr: {
  calle: string;
  numero?: string | null;
  numeroInterior?: string | null;
  colonia: string;
}): string {
  const cleanCalle = addr.calle.trim().replace(/^calle\s+/i, '');
  const cleanNum = cleanStreetNumber(addr.numero);
  const cleanInt = (addr.numeroInterior || '').trim();
  const col = addr.colonia.trim();
  const formattedCol = col.includes(' - ') ? col : `Col. ${col}`;

  const numPart = cleanNum ? `#${cleanNum}` : 'S/N';
  const intPart = cleanInt ? `, Int. ${cleanInt}` : '';
  return `Calle ${cleanCalle} ${numPart}${intPart}, ${formattedCol}`;
}

export function formatSavedAddressHeaderLabel(addr: CustomerSavedAddress): string {
  return `${addr.label} · ${formatSavedAddressLine(addr)}`;
}

export function pickActiveCustomerAddress(
  addresses: CustomerSavedAddress[],
  preferredId?: string | null
): CustomerSavedAddress | null {
  if (!Array.isArray(addresses) || addresses.length === 0) return null;
  if (preferredId) {
    const found = addresses.find((a) => a.id === preferredId);
    if (found) return found;
  }
  const defaultAddr = addresses.find((a) => a.isDefault);
  return defaultAddr || addresses[0];
}

export function getSelectedAddressStorageKey(userId?: string | null): string | null {
  if (!userId || userId.startsWith('guest')) return null;
  return `rodo_selected_address_id_${userId}`;
}
