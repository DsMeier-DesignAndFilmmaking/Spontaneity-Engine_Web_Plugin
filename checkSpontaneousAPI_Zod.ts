#!/usr/bin/env ts-node

import { z } from 'zod';

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m',
};

const SuggestionSchema = z.object({
  title: z.string(),
  type: z.string(),
  distance: z.string(),
  startTime: z.string(),
  description: z.string(),
  cta: z.string(),
});

const ResponseSchema = z.array(SuggestionSchema);

const SAMPLE_BODY = {
  lat: 40.7484,
  lng: -73.9857,
  time: '2025-11-08T14:30:00Z',
  vibe: 'social',
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
  console.log(`${colors.green}✅${colors.reset} ${message}`);
}

function logFailure(message: string) {
  console.error(`${colors.red}❌${colors.reset} ${message}`);
}

async function run() {
  const endpoint = buildEndpoint();
  logInfo(`Validating spontaneous suggestions schema at: ${endpoint}`);

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
    logSuccess('Response body parsed as valid JSON');
  } catch (error) {
    logFailure(`Response is not valid JSON: ${(error as Error).message}`);
    process.exit(1);
    return;
  }

  try {
    ResponseSchema.parse(payload);
    logSuccess('Schema validation passed!');
    console.log(`${colors.green}All checks succeeded.${colors.reset}`);
    process.exit(0);
  } catch (error) {
    const zodError = error instanceof z.ZodError ? error.format() : (error as Error).message;
    logFailure('Validation failed');
    console.error(JSON.stringify(zodError, null, 2));
    process.exit(1);
  }
}

run().catch((error) => {
  logFailure(`Unexpected error: ${(error as Error).message}`);
  process.exit(1);
});

