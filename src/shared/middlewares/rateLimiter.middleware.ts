// import rateLimit from 'express-rate-limit';
// import RedisStore from 'rate-limit-redis';
// import Redis from 'ioredis';

// const redisClient = new Redis({
//   host: process.env.REDIS_HOST || 'localhost',
//   port: parseInt(process.env.REDIS_PORT || '6379'),
//   password: process.env.REDIS_PASSWORD,
//   db: 0
// });

// interface RateLimiterOptions {
//   windowMs: number;
//   max: number;
//   message?: string;
// }

// export const rateLimiterMiddleware = (options: RateLimiterOptions) => {
//   return rateLimit({
//     windowMs: options.windowMs,
//     max: options.max,
//     message: options.message || 'Trop de requêtes, veuillez réessayer plus tard',
//     standardHeaders: true,
//     legacyHeaders: false,
//     store: new RedisStore({
//       client: redisClient,
//       prefix: 'rl:',
//     }),
//     skip: (req) => {
//       // Skip rate limiting for whitelisted IPs (optional)
//       const whitelistedIPs = (process.env.WHITELISTED_IPS || '').split(',');
//       return whitelistedIPs.includes(req.ip);
//     }
//   });
// };