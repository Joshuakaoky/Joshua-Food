// @ts-nocheck
import { createServer } from 'node:http';
export class Response {
    constructor(res) {
        this.statusCode = 200;
        this.res = res;
    }
    status(code) {
        this.statusCode = code;
        return this;
    }
    json(data) {
        const payload = JSON.stringify(data);
        this.res.statusCode = this.statusCode;
        this.res.setHeader('Content-Type', 'application/json');
        this.res.end(payload);
    }
    send(data) {
        this.res.statusCode = this.statusCode;
        this.res.end(typeof data === 'string' ? data : String(data));
    }
}
class RouterImpl {
    constructor() {
        this.routes = [];
    }
    use(pathOrHandler, maybeRouter) {
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
    get(path, ...handlers) {
        this.routes.push({ method: 'GET', path, handlers });
    }
    post(path, ...handlers) {
        this.routes.push({ method: 'POST', path, handlers });
    }
    getRoutes() {
        return this.routes;
    }
    async handle(req, res) {
        const matching = this.routes.filter((route) => (route.method === 'USE' || route.method === req.method) && this.matchPath(route.path, req.url ?? ''));
        const handlers = matching.flatMap((route) => route.handlers);
        let idx = 0;
        const next = () => {
            const handler = handlers[idx++];
            if (handler) {
                return handler(req, res, next);
            }
        };
        next();
    }
    matchPath(routePath, requestUrl) {
        if (routePath === '*')
            return true;
        const url = requestUrl.split('?')[0];
        return url === routePath;
    }
}
class App extends RouterImpl {
    listen(port, callback) {
        const server = createServer(async (req, res) => {
            const wrappedReq = req;
            const wrappedRes = new Response(res);
            await parseJsonBody(wrappedReq);
            await this.handle(wrappedReq, wrappedRes);
        });
        server.listen(port, callback);
    }
}
export function express() {
    return new App();
}
export function json() {
    return async (req, _res, next) => {
        await parseJsonBody(req);
        next();
    };
}
async function parseJsonBody(req) {
    if (req.body !== undefined)
        return;
    if (!req.headers['content-type']?.includes('application/json')) {
        req.body = undefined;
        return;
    }
    const chunks = [];
    for await (const chunk of req) {
        chunks.push(chunk);
    }
    const raw = Buffer.concat(chunks).toString('utf-8');
    req.body = raw ? JSON.parse(raw) : {};
}
export const Router = () => new RouterImpl();
