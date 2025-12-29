// @ts-nocheck
import { Router } from '../lib/miniExpress.js';
import { authenticate } from '../middleware/authenticate.js';
import { dishRepository } from '../repositories/inMemoryDishRepository.js';
import { orderRepository } from '../repositories/inMemoryOrderRepository.js';
import { pantryRepository } from '../repositories/inMemoryPantryRepository.js';
import { Dish, OrderStatus, PantryItem } from '../types/food.js';

export const orderRoutes = Router();

orderRoutes.get('/orders', authenticate, (req, res) => {
  const all = orderRepository.listByUser(req.user!.id);
  const withEvents = all.map((order) => ({ ...order, events: orderRepository.listEvents(order.id) }));
  const asGuest = withEvents.filter((order) => order.guestId === req.user!.id);
  const asHost = withEvents.filter((order) => order.hostId === req.user!.id);
  res.json({ asGuest, asHost });
});

orderRoutes.post('/orders', authenticate, (req, res) => {
  const { dishIds, guestNote, visitTime, peopleCount, bringByGuest } = req.body ?? {};
  if (!Array.isArray(dishIds) || dishIds.length === 0) {
    res.status(400).json({ message: 'dishIds are required' });
    return;
  }

  const dishes = collectDishes(dishIds);
  if (dishes.error) {
    res.status(dishes.error.status).json({ message: dishes.error.message });
    return;
  }
  const resolvedDishes = dishes.value;

  const hostId = resolvedDishes[0].ownerId;
  const missing = computeMissingIngredients(hostId, resolvedDishes);
  const bringList = Array.isArray(bringByGuest)
    ? bringByGuest.filter((name: any) => missing.includes(String(name)))
    : [];

  const order = orderRepository.create({
    hostId,
    guestId: req.user!.id,
    dishIds: resolvedDishes.map((dish) => dish.id),
    guestNote,
    visitTime,
    peopleCount,
    missingIngredients: missing,
    bringByGuest: bringList.map((item: any) => String(item)),
  });

  res.status(201).json({ order: { ...order, events: orderRepository.listEvents(order.id) } });
});

orderRoutes.patch('/orders/:id/status', authenticate, (req, res) => {
  const order = orderRepository.findById(req.params?.id ?? '');
  if (!order) {
    res.status(404).json({ message: 'Order not found' });
    return;
  }

  const { status, hostNote, note } = req.body ?? {};
  if (!status || !isValidStatus(status)) {
    res.status(400).json({ message: 'status is required and must be valid' });
    return;
  }

  const actorId = req.user!.id;
  const isHost = order.hostId === actorId;
  const isGuest = order.guestId === actorId;

  if (!isHost && !isGuest) {
    res.status(403).json({ message: 'Only host or guest can update this order' });
    return;
  }

  if (!isTransitionAllowed(order.status, status as OrderStatus)) {
    res.status(400).json({ message: `Cannot move from ${order.status} to ${status}` });
    return;
  }

  if (status === 'CANCELLED') {
    const guestCanCancel = isGuest && ['PENDING', 'REVISION_REQUESTED'].includes(order.status);
    const hostCanCancel = isHost && ['PENDING', 'ACCEPTED', 'REVISION_REQUESTED'].includes(order.status);
    if (!guestCanCancel && !hostCanCancel) {
      res.status(403).json({ message: 'Cancel is not allowed for your role or current status' });
      return;
    }
  } else if (!isHost) {
    res.status(403).json({ message: 'Only host can update this order' });
    return;
  }

  const eventNote = typeof note === 'string' ? note : typeof hostNote === 'string' ? hostNote : undefined;
  const updated = orderRepository.updateStatus(
    order.id,
    status as OrderStatus,
    actorId,
    eventNote,
    isHost ? hostNote : undefined,
  );
  res.json({ order: { ...updated, events: orderRepository.listEvents(order.id) } });
});

function collectDishes(ids: string[]): { value: Dish[] } | { error: { status: number; message: string } } {
  const dishes = ids
    .map((id) => dishRepository.findById(id))
    .filter(Boolean) as Dish[];

  if (dishes.length !== ids.length) {
    return { error: { status: 400, message: 'One or more dishes not found' } };
  }

  const [first] = dishes;
  const sameOwner = dishes.every((dish) => dish.ownerId === first.ownerId);
  if (!sameOwner) {
    return { error: { status: 400, message: 'All dishes must belong to the same host' } };
  }

  const activeOnly = dishes.every((dish) => dish.status === 'ACTIVE');
  if (!activeOnly) {
    return { error: { status: 400, message: 'All dishes must be active' } };
  }

  return { value: dishes };
}

function computeMissingIngredients(ownerId: string, dishes: Dish[]): string[] {
  const pantry = pantryRepository.listByOwner(ownerId).filter((item) => item.status === 'HAVE');
  const pantryNames = new Set(pantry.map((item: PantryItem) => item.name.toLowerCase()));
  const missing = new Set<string>();

  dishes.forEach((dish) => {
    dish.ingredients.forEach((ingredient) => {
      const key = ingredient.name.toLowerCase();
      if (!pantryNames.has(key)) {
        missing.add(ingredient.name);
      }
    });
  });

  return Array.from(missing);
}

function isValidStatus(status: string): status is OrderStatus {
  return [
    'PENDING',
    'ACCEPTED',
    'REJECTED',
    'REVISION_REQUESTED',
    'CANCELLED',
    'COMPLETED',
  ].includes(status);
}

function isTransitionAllowed(current: OrderStatus, next: OrderStatus): boolean {
  const transitions: Record<OrderStatus, OrderStatus[]> = {
    PENDING: ['ACCEPTED', 'REJECTED', 'REVISION_REQUESTED', 'CANCELLED'],
    ACCEPTED: ['CANCELLED', 'COMPLETED'],
    REJECTED: [],
    REVISION_REQUESTED: ['CANCELLED'],
    CANCELLED: [],
    COMPLETED: [],
  };
  return transitions[current]?.includes(next) ?? false;
}
