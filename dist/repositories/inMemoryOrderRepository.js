// @ts-nocheck
import { randomUUID } from 'crypto';
export class InMemoryOrderRepository {
    constructor() {
        this.orders = [];
    }
    create(input) {
        const now = new Date();
        const order = {
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
    listByUser(userId) {
        return this.orders.filter((order) => order.guestId === userId || order.hostId === userId);
    }
    findById(id) {
        return this.orders.find((order) => order.id === id);
    }
    updateStatus(id, status, hostNote) {
        const order = this.findById(id);
        if (!order)
            return undefined;
        order.status = status;
        order.hostNote = hostNote ?? order.hostNote;
        order.updatedAt = new Date();
        return order;
    }
}
export const orderRepository = new InMemoryOrderRepository();
