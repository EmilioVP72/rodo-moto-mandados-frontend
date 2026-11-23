import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { persistOnlyAfterConfirmation, refreshOpenTicket } from '../src/services/orderPersistence.ts';

describe('Order persistence confirmation', () => {
  it('does not store an order when the API request fails', async () => {
    let storedOrder: { id: string } | null = null;

    await assert.rejects(
      persistOnlyAfterConfirmation(
        async () => {
          throw new Error('Network unavailable');
        },
        (order) => {
          storedOrder = order;
        }
      ),
      /Network unavailable/
    );

    assert.equal(storedOrder, null);
  });

  it('does not store an order when the response has no persisted order ID', async () => {
    let storedOrder: unknown = null;

    await assert.rejects(
      persistOnlyAfterConfirmation(
        async () => ({}),
        (order) => {
          storedOrder = order;
        }
      ),
      /servidor no confirmo/
    );

    assert.equal(storedOrder, null);
  });

  it('stores the server-confirmed order and returns it', async () => {
    let storedOrder: { id: string } | null = null;
    const confirmedOrder = { id: 'order-123' };

    const result = await persistOnlyAfterConfirmation(
      async () => confirmedOrder,
      (order) => {
        storedOrder = order;
      }
    );

    assert.equal(result, confirmedOrder);
    assert.equal(storedOrder, confirmedOrder);
  });
});

it('muestra la última cotización del ticket abierto sin abrir pedidos distintos', () => {
  const open = { id: 'gasolina', total: 49 };
  const quoted = { id: 'gasolina', total: 89 };
  assert.equal(refreshOpenTicket(open, [{ id: 'comida', total: 75 }, quoted]), quoted);
  assert.equal(refreshOpenTicket(open, []), open);
  assert.equal(refreshOpenTicket(null, [quoted]), null);
});
