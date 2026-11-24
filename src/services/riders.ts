import { apiFetch } from '../api/httpClient';
import { Order, RiderAccount } from '../types';
import { applyConfirmedOrderUpdate } from './db';

export function getRiderAccounts(): Promise<RiderAccount[]> {
  return apiFetch<RiderAccount[]>('/api/admin/riders');
}

export function createRiderAccount(input: {
  name: string;
  email: string;
  phone: string;
  password: string;
  available?: boolean;
}): Promise<RiderAccount> {
  return apiFetch<RiderAccount>('/api/admin/riders', { method: 'POST', body: input });
}

export interface RiderChanges {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
  available?: boolean;
}

export function editRiderAccount(id: string, changes: RiderChanges): Promise<RiderAccount> {
  return apiFetch(`/api/admin/riders/${encodeURIComponent(id)}`, { method: 'PATCH', body: changes });
}

export function deleteRiderAccount(id: string): Promise<void> {
  return apiFetch(`/api/admin/riders/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function getAssignedRiderOrders(): Promise<Order[]> {
  return apiFetch<Order[]>('/api/rider/orders');
}

export function updateAssignedRiderOrder(
  orderId: string,
  status: Order['status'],
  deliveryNotes?: string
): Promise<Order> {
  return apiFetch<Order>(`/api/rider/orders/${encodeURIComponent(orderId)}/status`, {
    method: 'PATCH',
    body: { status, deliveryNotes },
  });
}

export async function assignRiderToOrder(
  orderId: string,
  riderSelection: string | null | { riderId?: string | null; riderUserId?: string | null }
): Promise<Order> {
  const body =
    typeof riderSelection === 'object' && riderSelection !== null
      ? {
          ...(riderSelection.riderId !== undefined ? { assignedRiderId: riderSelection.riderId } : {}),
          ...(riderSelection.riderUserId !== undefined && riderSelection.riderId === undefined
            ? { assignedRiderUserId: riderSelection.riderUserId }
            : {}),
        }
      : { assignedRiderId: riderSelection };

  const updated = await apiFetch<Order>(`/api/orders/${encodeURIComponent(orderId)}`, {
    method: 'PATCH',
    body,
  });
  applyConfirmedOrderUpdate(updated);
  return updated;
}

export async function notifyCustomerArrival(orderId: string): Promise<Order> {
  const updated = await apiFetch<Order>(`/api/orders/${encodeURIComponent(orderId)}/notify-arrival`, {
    method: 'POST',
  });
  applyConfirmedOrderUpdate(updated);
  return updated;
}
