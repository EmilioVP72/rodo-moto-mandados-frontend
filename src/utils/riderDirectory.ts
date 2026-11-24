import type { RiderAccount } from '../types';

export function availableDispatchRiders(riders: RiderAccount[]) {
  return riders.filter(rider => rider.available && rider.status === 'activo' && rider.phone.trim());
}
