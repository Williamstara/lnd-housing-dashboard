import { MongoClient, type Db } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;

let clientPromise: Promise<MongoClient> | undefined;

function connect(): Promise<MongoClient> {
  if (!uri) {
    throw new Error("Missing MONGODB_URI environment variable");
  }
  // The driver defaults to a 100-socket pool per client and keeps idle
  // sockets open indefinitely. On serverless, every concurrent instance
  // gets its own client, so that default multiplies fast and trips Atlas's
  // connection-count warnings. Capping the pool and recycling idle sockets
  // only limits how many TCP connections stay open — reads/writes (and the
  // revalidatePath-driven UI refreshes) still go through the shared pool
  // exactly as before.
  return new MongoClient(uri, { maxPoolSize: 10, maxIdleTimeMS: 30_000 }).connect();
}

function getClientPromise(): Promise<MongoClient> {
  // Reuse the client across hot-reloads in dev and across invocations in
  // serverless environments instead of opening a new connection per request.
  const globalWithMongo = globalThis as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (process.env.NODE_ENV === "development") {
    if (!globalWithMongo._mongoClientPromise) {
      const promise = connect();
      // Drop the cached promise on failure so the next request retries
      // instead of forever replaying a stale connection error.
      promise.catch(() => {
        if (globalWithMongo._mongoClientPromise === promise) {
          globalWithMongo._mongoClientPromise = undefined;
        }
      });
      globalWithMongo._mongoClientPromise = promise;
    }
    return globalWithMongo._mongoClientPromise;
  }

  if (!clientPromise) {
    const promise = connect();
    promise.catch(() => {
      if (clientPromise === promise) {
        clientPromise = undefined;
      }
    });
    clientPromise = promise;
  }
  return clientPromise;
}

export async function getDb(): Promise<Db> {
  if (!dbName) {
    throw new Error("Missing MONGODB_DB environment variable");
  }
  const client = await getClientPromise();
  return client.db(dbName);
}
