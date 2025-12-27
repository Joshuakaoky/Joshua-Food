// @ts-nocheck
import { randomUUID } from 'crypto';
export class InMemoryPantryRepository {
    constructor() {
        this.items = [];
    }
    listByOwner(ownerId) {
        return this.items.filter((item) => item.ownerId === ownerId);
    }
    upsert(input) {
        const existing = this.items.find((item) => item.ownerId === input.ownerId && item.name.toLowerCase() === input.name.toLowerCase());
        if (existing) {
            Object.assign(existing, input, { updatedAt: new Date() });
            return existing;
        }
        const now = new Date();
        const item = {
            id: randomUUID(),
            ownerId: input.ownerId,
            name: input.name,
            status: input.status ?? 'HAVE',
            quantity: input.quantity,
            unit: input.unit,
            createdAt: now,
            updatedAt: now,
        };
        this.items.push(item);
        return item;
    }
}
export const pantryRepository = new InMemoryPantryRepository();
