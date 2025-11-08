#!/usr/bin/env ts-node

export {};

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m',
};

const SAMPLE_BODY = {
  lat: 40.7484,
  lng: -73.9857,
  time: '2025-11-08T14:30:00Z',
  vibe: 'social',
};

const REQUIRED_KEYS: Record<string, 'string' | 'number'> = {
  title: 'string',
  type: 'string',
  distance: 'number',
  startTime: 'string',
  description: 'string',
  cta: 'string',
};

function buildEndpoint(): string {
  const envUrl = process.env.API_URL?.trim();
  if (envUrl) {
    const cleaned = envUrl.replace(/\/+$/, '');
    if (/\/spontaneous-suggestions$/.test(cleaned)) {
      return cleaned;
    }
    if (/\/api$/.test(cleaned)) {
      return `${cleaned}/spontaneous-suggestions`;
    }
    return `${cleaned}/api/spontaneous-suggestions`;
  }
  return 'http://localhost:3000/api/spontaneous-suggestions';
}

function logInfo(message: string) {
  console.log(`${colors.cyan}ℹ${colors.reset} ${message}`);
}

function logSuccess(message: string) {
  console.log(`${colors.green}✅ Passed:${colors.reset} ${message}`);
}

function logFailure(message: string) {
  console.error(`${colors.red}❌ Failed:${colors.reset} ${message}`);
}

async function run() {
  const endpoint = buildEndpoint();
  logInfo(`Checking spontaneous suggestions endpoint: ${endpoint}`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(SAMPLE_BODY),
      signal: controller.signal,
    });
  } catch (error) {
    logFailure(`Network error reaching endpoint: ${(error as Error).message}`);
    process.exit(1);
    return;
  } finally {
    clearTimeout(timeout);
  }

  if (response.status !== 200) {
    logFailure(`Expected status 200 but received ${response.status}`);
    process.exit(1);
    return;
  }

  logSuccess('Endpoint returned 200 OK');

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    logFailure(`Response body is not valid JSON: ${(error as Error).message}`);
    process.exit(1);
    return;
  }

  logSuccess('Response body parsed as valid JSON');

  if (!Array.isArray(payload)) {
    logFailure('Expected response to be an array');
    process.exit(1);
    return;
  }

  logSuccess('Response is an array');

  for (let index = 0; index < payload.length; index += 1) {
    const item = payload[index] as Record<string, unknown>;
    for (const [key, type] of Object.entries(REQUIRED_KEYS)) {
      if (!(key in item)) {
        logFailure(`Item at index ${index} is missing required key "${key}"`);
        process.exit(1);
        return;
      }
      if (typeof item[key] !== type) {
        logFailure(
          `Item at index ${index} has invalid type for key "${key}": expected ${type}, received ${typeof item[key]}`
        );
        process.exit(1);
        return;
      }
    }
  }

  logSuccess('All items include required keys with expected types');
  console.log(`${colors.green}All checks passed successfully.${colors.reset}`);
  process.exit(0);
}

run().catch((error) => {
  logFailure(`Unexpected error: ${(error as Error).message}`);
  process.exit(1);
});

