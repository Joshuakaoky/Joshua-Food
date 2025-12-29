// @ts-nocheck
import { randomUUID } from 'crypto';
import { PantryItem, PantryItemStatus } from '../types/food.js';

interface UpsertPantryItemInput {
  ownerId: string;
  name: string;
  status?: PantryItemStatus;
  quantity?: number;
  unit?: string;
}

export class InMemoryPantryRepository {
  private items: PantryItem[] = [];

  listByOwner(ownerId: string): PantryItem[] {
    return this.items.filter((item) => item.ownerId === ownerId);
  }

  upsert(input: UpsertPantryItemInput): PantryItem {
    const existing = this.items.find(
      (item) => item.ownerId === input.ownerId && item.name.toLowerCase() === input.name.toLowerCase(),
    );

    if (existing) {
      Object.assign(existing, input, { updatedAt: new Date() });
      return existing;
    }

    const now = new Date();
    const item: PantryItem = {
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
