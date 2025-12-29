// @ts-nocheck
import { Handler } from '../lib/miniExpress.js';

export const requestLogger: Handler = (req, _res, next) => {
  // eslint-disable-next-line no-console
  console.log(`${req.method} ${req.url}`);
  next();
};
// @ts-nocheck
