import { Pool } from "pg";

export type QueryExecutor = {
  query: (text: string, params?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>;
};

let sharedPool: Pool | null = null;
let testExecutor: QueryExecutor | null = null;

export function getQueryExecutor(): QueryExecutor {
  if (testExecutor) {
    return testExecutor;
  }

  if (sharedPool) {
    return sharedPool;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set – cannot establish database connection");
  }

  sharedPool = new Pool({ connectionString });
  return sharedPool;
}

export function setQueryExecutorForTests(executor: QueryExecutor | null) {
  testExecutor = executor;
  if (!executor && sharedPool) {
    void sharedPool.end();
    sharedPool = null;
  }
}

export async function closePool(): Promise<void> {
  if (sharedPool) {
    await sharedPool.end();
    sharedPool = null;
  }
}
