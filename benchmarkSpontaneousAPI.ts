#!/usr/bin/env ts-node

export {};

type EndpointResult = {
  name: string;
  url: string;
  responseTimes: number[];
  statuses: number[];
};

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

const SAMPLE_BODY = {
  lat: 40.7484,
  lng: -73.9857,
  time: '2025-11-08T14:30:00Z',
  vibe: 'social',
};

function buildEndpoints(): { name: string; url: string }[] {
  const endpoints = [{ name: 'Local', url: 'http://localhost:3000/api/spontaneous-suggestions' }];
  const envUrl = process.env.API_URL?.trim();
  if (envUrl) {
    const cleaned = envUrl.replace(/\/+$/, '');
    const prodUrl = cleaned.endsWith('/spontaneous-suggestions')
      ? cleaned
      : `${cleaned}/spontaneous-suggestions`;
    endpoints.push({ name: 'Production', url: prodUrl });
  }
  return endpoints;
}

function logInfo(message: string) {
  console.log(`${colors.cyan}ℹ${colors.reset} ${message}`);
}

function colorForSuccessRate(rate: number): string {
  if (rate >= 0.99) return colors.green;
  if (rate >= 0.95) return colors.yellow;
  return colors.red;
}

function colorForAverage(avg: number): string {
  if (avg <= 1000) return colors.green;
  return colors.yellow;
}

function colorForAvailability(status: 'UP' | 'DOWN'): string {
  return status === 'UP' ? colors.green : colors.red;
}

function verdictFor(rate: number, avg: number): string {
  if (rate >= 0.99 && avg <= 500) return `${colors.green}✅ API ready for production${colors.reset}`;
  if (rate >= 0.95) return `${colors.yellow}⚠️ API needs optimization${colors.reset}`;
  return `${colors.red}❌ API unstable${colors.reset}`;
}

async function benchmarkEndpoint(name: string, url: string): Promise<EndpointResult> {
  const result: EndpointResult = { name, url, responseTimes: [], statuses: [] };
  for (let i = 1; i <= 10; i += 1) {
    const start = performance.now();
    let status = 0;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(SAMPLE_BODY),
      });
      status = response.status;
    } catch {
      status = 0;
    }
    const duration = performance.now() - start;
    result.responseTimes.push(duration);
    result.statuses.push(status);
    const color = status === 200 ? colors.green : colors.red;
    console.log(
      `${color}${name} #${i}: ${status || 'ERR'} in ${duration.toFixed(2)} ms${colors.reset}`
    );
  }
  return result;
}

function summarizeEndpoint(result: EndpointResult) {
  const { name, responseTimes, statuses } = result;
  const successes = statuses.filter((status) => status === 200).length;
  const successRate = successes / statuses.length;
  const average = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
  const fastest = Math.min(...responseTimes);
  const slowest = Math.max(...responseTimes);
  const availability = successRate >= 0.99 ? 'UP' : 'DOWN';

  console.log('');
  logInfo(`Summary for ${name} (${result.url})`);
  console.log(
    `  Average response: ${colorForAverage(average)}${average.toFixed(2)} ms${colors.reset}`
  );
  console.log(`  Fastest response: ${colors.green}${fastest.toFixed(2)} ms${colors.reset}`);
  console.log(`  Slowest response: ${colors.yellow}${slowest.toFixed(2)} ms${colors.reset}`);
  console.log(
    `  Success rate: ${colorForSuccessRate(successRate)}${(successRate * 100).toFixed(2)} %${colors.reset}`
  );
  console.log(
    `  Availability: ${colorForAvailability(availability)}${availability}${colors.reset}`
  );
  console.log(`  Verdict: ${verdictFor(successRate, average)}`);
  console.log('');
}

(async function run() {
  const endpoints = buildEndpoints();
  if (endpoints.length === 0) {
    console.error(`${colors.red}No endpoints configured for benchmarking.${colors.reset}`);
    process.exit(1);
  }

  for (const endpoint of endpoints) {
    logInfo(`Benchmarking ${endpoint.name} endpoint: ${endpoint.url}`);
    const result = await benchmarkEndpoint(endpoint.name, endpoint.url);
    summarizeEndpoint(result);
  }
})();

