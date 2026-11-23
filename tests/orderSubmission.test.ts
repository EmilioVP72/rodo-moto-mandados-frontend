import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { persistOnlyAfterConfirmation } from '../src/services/orderPersistence.ts';

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
