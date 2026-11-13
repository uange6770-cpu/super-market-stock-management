import { Router } from 'express';

function catchAsync(handler) {
  return (req, res, next) => {
    try {
      Promise.resolve(handler(req, res, next)).catch(next);
    } catch (error) {
      next(error);
    }
  };
}

export function asyncRouter() {
  const router = Router();

  for (const method of ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'all']) {
    const register = router[method].bind(router);
    router[method] = (...args) => register(...args.map(arg => (
      typeof arg === 'function' ? catchAsync(arg) : arg
    )));
  }

  return router;
}
