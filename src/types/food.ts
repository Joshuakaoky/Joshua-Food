export interface Ingredient {
  name: string;
  quantity?: number;
  unit?: string;
}

export type DishStatus = 'ACTIVE' | 'INACTIVE';

export interface Dish {
  id: string;
  ownerId: string;
  title: string;
  coverUrl: string;
  photos?: string[];
  intro?: string;
  tags?: string[];
  ingredients: Ingredient[];
  status: DishStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type PantryItemStatus = 'HAVE' | 'LOW' | 'OUT';

export interface PantryItem {
  id: string;
  ownerId: string;
  name: string;
  status: PantryItemStatus;
  quantity?: number;
  unit?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type OrderStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'REVISION_REQUESTED'
  | 'CANCELLED'
  | 'COMPLETED';

export interface Order {
  id: string;
  hostId: string;
  guestId: string;
  dishIds: string[];
  guestNote?: string;
  hostNote?: string;
  visitTime?: string;
  peopleCount?: number;
  missingIngredients: string[];
  bringByGuest: string[];
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}
