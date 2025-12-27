// @ts-nocheck
import { randomUUID } from 'crypto';
export class InMemoryUserRepository {
    constructor() {
        this.users = [];
    }
    findByEmail(email) {
        return this.users.find((user) => user.email.toLowerCase() === email.toLowerCase());
    }
    findById(id) {
        return this.users.find((user) => user.id === id);
    }
    create(name, email, passwordHash) {
        const now = new Date();
        const user = {
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
