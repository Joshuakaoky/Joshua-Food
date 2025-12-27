// @ts-nocheck
import { randomUUID } from 'crypto';
import { Dish, DishStatus, Ingredient } from '../types/food.js';

interface CreateDishInput {
  ownerId: string;
  title: string;
  coverUrl: string;
  photos?: string[];
  intro?: string;
  tags?: string[];
  ingredients: Ingredient[];
}

interface UpdateDishInput {
  title?: string;
  coverUrl?: string;
  photos?: string[];
  intro?: string;
  tags?: string[];
  ingredients?: Ingredient[];
  status?: DishStatus;
}

export class InMemoryDishRepository {
  private dishes: Dish[] = [];

  create(input: CreateDishInput): Dish {
    const now = new Date();
    const dish: Dish = {
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

  listAll(): Dish[] {
    return [...this.dishes];
  }

  findById(id: string): Dish | undefined {
    return this.dishes.find((dish) => dish.id === id);
  }

  listByOwner(ownerId: string): Dish[] {
    return this.dishes.filter((dish) => dish.ownerId === ownerId);
  }

  update(id: string, updates: UpdateDishInput): Dish | undefined {
    const dish = this.findById(id);
    if (!dish) return undefined;

    Object.assign(dish, updates, { updatedAt: new Date() });
    return dish;
  }
}

export const dishRepository = new InMemoryDishRepository();
