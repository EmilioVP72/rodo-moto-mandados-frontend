import { availableDispatchRiders } from '../src/utils/riderDirectory.ts';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getNextRiderStatus, RIDER_STATUS_ACTION } from '../src/utils/riderWorkflow.ts';

describe('Rider delivery workflow', () => {
  it('advances one allowed delivery step at a time', () => {
    assert.equal(getNextRiderStatus('asignado'), 'recolectado');
    assert.equal(getNextRiderStatus('recolectado'), 'en_camino');
    assert.equal(getNextRiderStatus('en_camino'), 'afuera_del_domicilio');
    assert.equal(getNextRiderStatus('afuera_del_domicilio'), 'entregado');
  });

  it('does not offer progression for terminal, unassigned, or customer-only states', () => {
    assert.equal(getNextRiderStatus('nuevo'), undefined);
    assert.equal(getNextRiderStatus('entregado'), undefined);
    assert.equal(getNextRiderStatus('cancelado'), undefined);
    assert.equal(getNextRiderStatus('pendiente_cotizacion'), undefined);
  });

  it('provides an explicit rider action label at each active step', () => {
    assert.equal(RIDER_STATUS_ACTION.asignado, 'Confirmar recolección');
    assert.equal(RIDER_STATUS_ACTION.en_camino, 'Avisar que estoy afuera');
    assert.equal(RIDER_STATUS_ACTION.entregado, undefined);
  });
});

it('ofrece en despacho los repartidores disponibles y conserva los contactos de WhatsApp sin acceso', () => {
  const rider = { id: 'r1', userId: 'r1', email: 'r@example.invalid', name: 'Moto', phone: '4151234567',
    available: true, status: 'activo' as const, createdAt: '' };
  const contact = { ...rider, id: 'contact', userId: null, email: null };
  assert.deepEqual(availableDispatchRiders([rider, contact, { ...rider, available: false },
    { ...rider, status: 'bloqueado_fraude' }, { ...rider, phone: ' ' }]), [rider, contact]);
});
