// @ts-nocheck
import { randomUUID } from 'crypto';
import { Order, OrderStatus } from '../types/food.js';

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
    return order;
  }

  listByUser(userId: string): Order[] {
    return this.orders.filter((order) => order.guestId === userId || order.hostId === userId);
  }

  findById(id: string): Order | undefined {
    return this.orders.find((order) => order.id === id);
  }

  updateStatus(id: string, status: OrderStatus, hostNote?: string): Order | undefined {
    const order = this.findById(id);
    if (!order) return undefined;
    order.status = status;
    order.hostNote = hostNote ?? order.hostNote;
    order.updatedAt = new Date();
    return order;
  }
}

export const orderRepository = new InMemoryOrderRepository();
