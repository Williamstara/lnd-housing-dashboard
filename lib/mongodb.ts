import { MongoClient, type Db } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;

let clientPromise: Promise<MongoClient> | undefined;

// Every collection here is filtered by nationsID (the multi-tenant scope)
// on nearly every query — without an index, each of those reads is a full
// collection scan. On a pay-per-request Atlas plan that's the single
// biggest cost/latency lever, and it only gets worse as data grows. Each
// entry leads with nationsID, then whatever that collection's queries most
// often filter or sort by next (see the corresponding lib/*.ts for the
// actual query shapes this is derived from).
const INDEX_SPECS: Array<{
  collection: string;
  key: Record<string, 1 | -1>;
  unique?: boolean;
}> = [
  { collection: "apartments", key: { nationsID: 1, status: 1, ledigFrom: 1 } },
  { collection: "apartments", key: { nationsID: 1, lagenhetsnummer: 1 } },
  { collection: "rentalobjects", key: { nationsID: 1, lagenhetsnummer: 1 } },
  { collection: "rentalobjects", key: { nationsID: 1, fastighet: 1, lagenhetsnummer: 1 } },
  { collection: "tenants", key: { nationsID: 1, lagenhetsnummer: 1 } },
  { collection: "tenants", key: { nationsID: 1, fastighet: 1 } },
  { collection: "andrahandsgaster", key: { nationsID: 1, lagenhetsnummer: 1 } },
  { collection: "fastigheter", key: { nationsID: 1 } },
  { collection: "todos", key: { nationsID: 1, klar: 1, klarDatum: 1 } },
  { collection: "uppsagningar", key: { nationsID: 1, bekraftelsedatum: 1 } },
  { collection: "besiktningar", key: { nationsID: 1, status: 1, besiktningsdatum: 1 } },
  { collection: "mail-templates", key: { nationsID: 1 } },
  { collection: "floor-plans", key: { nationsID: 1, aptName: 1 } },
  { collection: "missed-rent", key: { nationsID: 1, apartmentId: 1 } },
  { collection: "nations", key: { nationsID: 1 }, unique: true },
  { collection: "gmail-tokens", key: { userId: 1 }, unique: true },
];

let ensureIndexesPromise: Promise<void> | undefined;

// createIndex is idempotent (a no-op if the index already exists), but
// there's no reason to round-trip through all of them on every request —
// cached the same way the client connection itself is, so this only
// actually runs once per cold start.
function ensureIndexes(db: Db): Promise<void> {
  if (!ensureIndexesPromise) {
    const promise = Promise.all(
      INDEX_SPECS.map((spec) =>
        db.collection(spec.collection).createIndex(spec.key, spec.unique ? { unique: true } : {})
      )
    ).then(() => undefined);
    // Index creation is a performance optimization, not a correctness
    // requirement — if it fails (e.g. a restricted DB user), queries should
    // still work, just unindexed, rather than the whole app going down.
    // Reset the cache on failure so the next request tries again.
    promise.catch(() => {
      if (ensureIndexesPromise === promise) {
        ensureIndexesPromise = undefined;
      }
    });
    ensureIndexesPromise = promise;
  }
  return ensureIndexesPromise;
}

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
  const db = client.db(dbName);
  try {
    await ensureIndexes(db);
  } catch {
    // See ensureIndexes: swallow so a query never breaks over an index
    // problem — worst case this request runs unindexed.
  }
  return db;
}
