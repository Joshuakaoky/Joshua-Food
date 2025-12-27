// @ts-nocheck
import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { PublicUser } from '../types/user.js';

export type NextFunction = () => void;
export type Handler = (req: Request, res: Response, next: NextFunction) => void | Promise<void>;

export interface Request extends IncomingMessage {
  body?: any;
  user?: PublicUser;
}

export class Response {
  private res: ServerResponse;
  private statusCode = 200;

  constructor(res: ServerResponse) {
    this.res = res;
  }

  status(code: number): this {
    this.statusCode = code;
    return this;
  }

  json(data: unknown): void {
    const payload = JSON.stringify(data);
    this.res.statusCode = this.statusCode;
    this.res.setHeader('Content-Type', 'application/json');
    this.res.end(payload);
  }

  send(data: unknown): void {
    this.res.statusCode = this.statusCode;
    this.res.end(typeof data === 'string' ? data : String(data));
  }
}

interface Route {
  method: string;
  path: string;
  handlers: Handler[];
}

class RouterImpl {
  private routes: Route[] = [];

  use(path: string, router: RouterImpl): void;
  use(handler: Handler): void;
  use(pathOrHandler: string | Handler, maybeRouter?: RouterImpl): void {
    if (typeof pathOrHandler === 'string' && maybeRouter) {
      const base = pathOrHandler;
      maybeRouter.getRoutes().forEach((route) => {
        this.routes.push({ ...route, path: base + route.path });
      });
      return;
    }

    if (typeof pathOrHandler === 'function') {
      this.routes.push({ method: 'USE', path: '*', handlers: [pathOrHandler] });
    }
  }

  get(path: string, ...handlers: Handler[]): void {
    this.routes.push({ method: 'GET', path, handlers });
  }

  post(path: string, ...handlers: Handler[]): void {
    this.routes.push({ method: 'POST', path, handlers });
  }

  getRoutes(): Route[] {
    return this.routes;
  }

  async handle(req: Request, res: Response): Promise<void> {
    const matching = this.routes.filter((route) =>
      (route.method === 'USE' || route.method === req.method) && this.matchPath(route.path, req.url ?? ''),
    );

    const handlers = matching.flatMap((route) => route.handlers);
    let idx = 0;

    const next: NextFunction = () => {
      const handler = handlers[idx++];
      if (handler) {
        return handler(req, res, next);
      }
    };

    next();
  }

  private matchPath(routePath: string, requestUrl: string): boolean {
    if (routePath === '*') return true;
    const url = requestUrl.split('?')[0];
    return url === routePath;
  }
}

class App extends RouterImpl {
  listen(port: number, callback?: () => void): void {
    const server = createServer(async (req, res) => {
      const wrappedReq = req as Request;
      const wrappedRes = new Response(res);
      await parseJsonBody(wrappedReq);
      await this.handle(wrappedReq, wrappedRes);
    });

    server.listen(port, callback);
  }
}

export function express(): App {
  return new App();
}

export function json(): Handler {
  return async (req, _res, next) => {
    await parseJsonBody(req);
    next();
  };
}

async function parseJsonBody(req: Request): Promise<void> {
  if (req.body !== undefined) return;

  if (!req.headers['content-type']?.includes('application/json')) {
    req.body = undefined;
    return;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  const raw = Buffer.concat(chunks).toString('utf-8');
  req.body = raw ? JSON.parse(raw) : {};
}

export const Router = () => new RouterImpl();
