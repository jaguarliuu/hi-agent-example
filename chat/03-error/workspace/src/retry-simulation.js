// @anchor:retry-simulation
const DEFAULTS = {
  baseDelayMs: 500,
  bucketMs: 100,
  clients: 1000,
  maxDelayMs: 8000,
  retries: 3,
  seed: 42
};

const STRATEGIES = new Set(['immediate', 'backoff', 'jitter', 'all']);

function main() {
  const { strategy, options } = parseArgs(process.argv.slice(2));
  const strategies =
    strategy === 'all' ? ['immediate', 'backoff', 'jitter'] : [strategy];
  const result = Object.fromEntries(
    strategies.map((name) => [name, simulateStrategy(name, options)])
  );

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  printIntro(options);
  strategies.forEach((name) => printScenario(result[name]));
  if (strategy === 'all') {
    printComparison(result);
  }
}

function simulateStrategy(strategy, options) {
  const rng = createSeededRandom(options.seed);
  const buckets = new Map();

  for (let client = 0; client < options.clients; client += 1) {
    let nextAtMs = 0;

    for (let attempt = 1; attempt <= options.retries; attempt += 1) {
      const delayMs = calculateDelay(strategy, attempt, options, rng);
      nextAtMs += delayMs;
      const bucket = Math.floor(nextAtMs / options.bucketMs) * options.bucketMs;
      buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
    }
  }

  const timeline = Array.from(buckets.entries())
    .sort(([left], [right]) => left - right)
    .map(([atMs, requests]) => ({ atMs, requests }));
  const peak = Math.max(...timeline.map((entry) => entry.requests));

  return {
    strategy,
    totalRetryRequests: options.clients * options.retries,
    peakRequestsInBucket: peak,
    bucketMs: options.bucketMs,
    timeline
  };
}

function calculateDelay(strategy, attempt, options, rng) {
  if (strategy === 'immediate') {
    return 0;
  }

  const cap = Math.min(
    options.maxDelayMs,
    options.baseDelayMs * 2 ** (attempt - 1)
  );

  if (strategy === 'backoff') {
    return cap;
  }

  return Math.floor(rng() * cap);
}

function parseArgs(args) {
  const [rawStrategy = 'all', ...rest] = args;
  if (!STRATEGIES.has(rawStrategy)) {
    throw new Error(
      `Unknown strategy "${rawStrategy}". Use immediate, backoff, jitter, or all.`
    );
  }

  const options = { ...DEFAULTS, json: false };
  for (let index = 0; index < rest.length; index += 1) {
    const name = rest[index];
    if (name === '--json') {
      options.json = true;
      continue;
    }

    const value = Number(rest[index + 1]);
    if (!Number.isFinite(value)) {
      throw new Error(`Missing numeric value for ${name}`);
    }

    if (name === '--clients') options.clients = value;
    else if (name === '--retries') options.retries = value;
    else if (name === '--base') options.baseDelayMs = value;
    else if (name === '--max-delay') options.maxDelayMs = value;
    else if (name === '--bucket') options.bucketMs = value;
    else if (name === '--seed') options.seed = value;
    else throw new Error(`Unknown option "${name}"`);

    index += 1;
  }

  return { strategy: rawStrategy, options };
}

function printIntro(options) {
  console.log('\nHi-Agent retry simulation');
  console.log('This is a local simulation. It sends zero network requests.\n');
  console.log(`clients: ${options.clients}`);
  console.log(`retries per client: ${options.retries}`);
  console.log(`bucket size: ${options.bucketMs}ms`);
  console.log(`base delay: ${options.baseDelayMs}ms`);
  console.log(`max delay: ${options.maxDelayMs}ms\n`);
}

function printScenario(summary) {
  console.log(`=== ${labelFor(summary.strategy)} ===`);
  console.log(`total retry requests: ${summary.totalRetryRequests}`);
  console.log(
    `peak in one ${summary.bucketMs}ms bucket: ${summary.peakRequestsInBucket}`
  );
  summary.timeline.forEach((entry) => {
    const bar = '#'.repeat(
      Math.max(1, Math.round((entry.requests / summary.peakRequestsInBucket) * 34))
    );
    console.log(
      `${String(entry.atMs).padStart(5, ' ')}ms | ${String(
        entry.requests
      ).padStart(4, ' ')} | ${bar}`
    );
  });
  console.log('');
}

function printComparison(result) {
  console.log('=== takeaway ===');
  console.log(
    `immediate retry piles everything into one bucket: ${result.immediate.peakRequestsInBucket}`
  );
  console.log(
    `backoff slows later attempts but clients still retry together: ${result.backoff.peakRequestsInBucket}`
  );
  console.log(
    `jitter spreads the retries across time: ${result.jitter.peakRequestsInBucket}`
  );
  console.log('');
}

function labelFor(strategy) {
  if (strategy === 'immediate') return 'Immediate retry storm';
  if (strategy === 'backoff') return 'Exponential backoff only';
  return 'Exponential backoff + jitter';
}

function createSeededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
