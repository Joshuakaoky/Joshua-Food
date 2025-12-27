// @ts-nocheck
import { randomUUID } from 'crypto';
export class InMemoryOrderRepository {
    constructor() {
        this.orders = [];
        this.events = [];
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
        this.logEvent({
            orderId: order.id,
            actorId: input.guestId,
            toStatus: order.status,
            createdAt: now,
            note: 'Order created',
        });
        return order;
    }
    listByUser(userId) {
        return this.orders.filter((order) => order.guestId === userId || order.hostId === userId);
    }
    findById(id) {
        return this.orders.find((order) => order.id === id);
    }
    updateStatus(id, status, actorId, note, hostNote) {
        const order = this.findById(id);
        if (!order)
            return undefined;
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
    listEvents(orderId) {
        return this.events.filter((event) => event.orderId === orderId);
    }
    logEvent(event) {
        this.events.push({ ...event, id: randomUUID() });
    }
}
export const orderRepository = new InMemoryOrderRepository();
