// @ts-nocheck
import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { PublicUser } from '../types/user.js';

export type NextFunction = () => void;
export type Handler = (req: Request, res: Response, next: NextFunction) => void | Promise<void>;

export interface Request extends IncomingMessage {
  body?: any;
  user?: PublicUser;
  params?: Record<string, string>;
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

  put(path: string, ...handlers: Handler[]): void {
    this.routes.push({ method: 'PUT', path, handlers });
  }

  patch(path: string, ...handlers: Handler[]): void {
    this.routes.push({ method: 'PATCH', path, handlers });
  }

  getRoutes(): Route[] {
    return this.routes;
  }

  async handle(req: Request, res: Response): Promise<void> {
    const matches = this.routes
      .map((route) => {
        if (route.method !== 'USE' && route.method !== req.method) return null;
        const params = this.matchPath(route.path, req.url ?? '');
        if (!params) return null;
        return { route, params };
      })
      .filter(Boolean) as { route: Route; params: Record<string, string> }[];

    if (matches.length === 0) {
      res.status(404).json({ message: 'Not found' });
      return;
    }

    const hasEndpoint = matches.some((match) => match.route.method !== 'USE');
    const handlers = matches.flatMap((match) => match.route.handlers);
    req.params = matches[0]?.params ?? {};

    if (!hasEndpoint) {
      handlers.push((_req, res) => res.status(404).json({ message: 'Not found' }));
    }

    let idx = 0;

    const next: NextFunction = () => {
      const handler = handlers[idx++];
      if (handler) {
        return handler(req, res, next);
      }
    };

    next();
  }

  private matchPath(routePath: string, requestUrl: string): Record<string, string> | null {
    if (routePath === '*') return {};

    const urlPath = requestUrl.split('?')[0];
    const routeParts = routePath.split('/').filter(Boolean);
    const urlParts = urlPath.split('/').filter(Boolean);

    if (routeParts.length !== urlParts.length) return null;

    const params: Record<string, string> = {};
    for (let i = 0; i < routeParts.length; i++) {
      const routePart = routeParts[i];
      const urlPart = urlParts[i];
      if (routePart.startsWith(':')) {
        params[routePart.slice(1)] = decodeURIComponent(urlPart);
        continue;
      }
      if (routePart !== urlPart) return null;
    }

    return params;
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
