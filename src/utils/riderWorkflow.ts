import type { Order } from '../types';

export const NEXT_RIDER_STATUS: Partial<Record<Order['status'], Order['status']>> = {
  asignado: 'recolectado',
  recolectado: 'en_camino',
  en_camino: 'afuera_del_domicilio',
  afuera_del_domicilio: 'entregado',
};

export const RIDER_STATUS_ACTION: Partial<Record<Order['status'], string>> = {
  asignado: 'Confirmar recolección',
  recolectado: 'Iniciar entrega',
  en_camino: 'Avisar que estoy afuera',
  afuera_del_domicilio: 'Confirmar entrega',
};

export function getNextRiderStatus(status: Order['status']): Order['status'] | undefined {
  return NEXT_RIDER_STATUS[status];
}
