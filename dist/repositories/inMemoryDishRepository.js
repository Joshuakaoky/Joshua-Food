// @ts-nocheck
import { randomUUID } from 'crypto';
export class InMemoryDishRepository {
    constructor() {
        this.dishes = [];
    }
    create(input) {
        const now = new Date();
        const dish = {
            id: randomUUID(),
            ownerId: input.ownerId,
            title: input.title,
            coverUrl: input.coverUrl,
            photos: input.photos ?? [],
            intro: input.intro,
            tags: input.tags ?? [],
            ingredients: input.ingredients,
            status: 'ACTIVE',
            createdAt: now,
            updatedAt: now,
        };
        this.dishes.push(dish);
        return dish;
    }
    listAll() {
        return [...this.dishes];
    }
    findById(id) {
        return this.dishes.find((dish) => dish.id === id);
    }
    listByOwner(ownerId) {
        return this.dishes.filter((dish) => dish.ownerId === ownerId);
    }
    update(id, updates) {
        const dish = this.findById(id);
        if (!dish)
            return undefined;
        Object.assign(dish, updates, { updatedAt: new Date() });
        return dish;
    }
}
export const dishRepository = new InMemoryDishRepository();
