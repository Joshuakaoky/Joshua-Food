// @ts-nocheck
import { randomUUID } from 'crypto';
import { Order, OrderEvent, OrderStatus } from '../types/food.js';

interface CreateOrderInput {
  hostId: string;
  guestId: string;
  dishIds: string[];
  guestNote?: string;
  visitTime?: string;
  peopleCount?: number;
  missingIngredients: string[];
  bringByGuest: string[];
}

export class InMemoryOrderRepository {
  private orders: Order[] = [];
  private events: OrderEvent[] = [];

  create(input: CreateOrderInput): Order {
    const now = new Date();
    const order: Order = {
      id: randomUUID(),
      status: 'PENDING',
      hostId: input.hostId,
      guestId: input.guestId,
      dishIds: input.dishIds,
      guestNote: input.guestNote,
      hostNote: undefined,
      visitTime: input.visitTime,
      peopleCount: input.peopleCount,
      missingIngredients: input.missingIngredients,
      bringByGuest: input.bringByGuest,
      createdAt: now,
      updatedAt: now,
    };
    this.orders.push(order);
    this.logEvent({
      orderId: order.id,
      actorId: input.guestId,
      toStatus: order.status,
      createdAt: now,
      note: 'Order created',
    });
    return order;
  }

  listByUser(userId: string): Order[] {
    return this.orders.filter((order) => order.guestId === userId || order.hostId === userId);
  }

  findById(id: string): Order | undefined {
    return this.orders.find((order) => order.id === id);
  }

  updateStatus(id: string, status: OrderStatus, actorId: string, note?: string, hostNote?: string): Order | undefined {
    const order = this.findById(id);
    if (!order) return undefined;
    const previous = order.status;
    order.status = status;
    order.hostNote = hostNote ?? order.hostNote;
    order.updatedAt = new Date();
    this.logEvent({
      orderId: order.id,
      actorId,
      fromStatus: previous,
      toStatus: status,
      createdAt: order.updatedAt,
      note,
    });
    return order;
  }

  listEvents(orderId: string): OrderEvent[] {
    return this.events.filter((event) => event.orderId === orderId);
  }

  private logEvent(event: Omit<OrderEvent, 'id'>): void {
    this.events.push({ ...event, id: randomUUID() });
  }
}

export const orderRepository = new InMemoryOrderRepository();
