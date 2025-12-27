// @ts-nocheck
import { randomUUID } from 'crypto';
import { User } from '../types/user.js';

export class InMemoryUserRepository {
  private users: User[] = [];

  findByEmail(email: string): User | undefined {
    return this.users.find(
      (user) => user.email.toLowerCase() === email.toLowerCase(),
    );
  }

  findById(id: string): User | undefined {
    return this.users.find((user) => user.id === id);
  }

  create(name: string, email: string, passwordHash: string): User {
    const now = new Date();
    const user: User = {
      id: randomUUID(),
      name,
      email,
      passwordHash,
      createdAt: now,
      updatedAt: now,
    };
    this.users.push(user);
    return user;
  }
}

export const userRepository = new InMemoryUserRepository();
// @ts-nocheck
