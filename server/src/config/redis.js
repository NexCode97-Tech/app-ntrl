/**
 * Redis — opcional.
 * Si REDIS_URL no está configurado, todos los clientes son stubs no-op.
 * Esto permite correr la app sin Redis (SSE en memoria, sin pub/sub distribuido).
 */

const REDIS_URL = process.env.REDIS_URL;

function createNoopClient(name) {
  return {
    publish:   () => Promise.resolve(0),
    subscribe: () => Promise.resolve(),
    on:        () => {},
    connect:   () => Promise.resolve(),
    quit:      () => Promise.resolve(),
    get:       () => Promise.resolve(null),
    set:       () => Promise.resolve("OK"),
    del:       () => Promise.resolve(0),
    _isNoop:   true,
  };
}

let redis    = createNoopClient("main");
let redisPub = createNoopClient("pub");
let redisSub = createNoopClient("sub");

export { redis, redisPub, redisSub };

export async function connectRedis() {
  if (!REDIS_URL) {
    console.log("Redis no configurado — SSE funcionará en modo memoria (single-instance).");
    return;
  }

  const { default: Redis } = await import("ioredis");

  function createClient(name) {
    const client = new Redis(REDIS_URL, {
      lazyConnect:          true,
      maxRetriesPerRequest: 1,
      retryStrategy: (times) => {
        if (times > 5) return null; // dejar de reintentar después de 5 intentos
        return Math.min(times * 1000, 5000);
      },
      enableOfflineQueue: false,
    });

    client.on("connect",      () => console.log(`Redis [${name}] conectado`));
    client.on("error",        (err) => console.error(`Redis [${name}] error:`, err.message));
    client.on("reconnecting", () => console.warn(`Redis [${name}] reconectando...`));

    return client;
  }

  redis    = createClient("main");
  redisPub = createClient("pub");
  redisSub = createClient("sub");

  await Promise.all([redis.connect(), redisPub.connect(), redisSub.connect()]);
}
