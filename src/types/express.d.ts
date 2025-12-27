import type { PublicUser } from './user.js';

declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    interface Request {
      user?: PublicUser;
    }
  }
}
export {};
