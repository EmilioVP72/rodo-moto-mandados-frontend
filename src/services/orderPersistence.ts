export async function persistOnlyAfterConfirmation<T extends { id?: unknown }>(
  sendOrder: () => Promise<T>,
  storeOrder: (order: T) => void
): Promise<T> {
  const savedOrder = await sendOrder();
  if (!savedOrder || typeof savedOrder.id !== 'string' || !savedOrder.id) {
    throw new Error('El servidor no confirmo el registro del pedido.');
  }

  storeOrder(savedOrder);
  return savedOrder;
}
