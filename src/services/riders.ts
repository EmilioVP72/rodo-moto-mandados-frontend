import { apiFetch } from '../api/httpClient';
import { Order, RiderAccount } from '../types';

export function getRiderAccounts(): Promise<RiderAccount[]> {
  return apiFetch<RiderAccount[]>('/api/admin/riders');
}

export function createRiderAccount(input: {
  name: string;
  email: string;
  phone: string;
  password: string;
}): Promise<RiderAccount> {
  return apiFetch<RiderAccount>('/api/admin/riders', { method: 'POST', body: input });
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

export function assignRiderToOrder(orderId: string, riderUserId: string | null): Promise<Order> {
  return apiFetch<Order>(`/api/orders/${encodeURIComponent(orderId)}`, {
    method: 'PATCH',
    body: { assignedRiderUserId: riderUserId, ...(riderUserId ? { status: 'asignado' } : {}) },
  });
}
