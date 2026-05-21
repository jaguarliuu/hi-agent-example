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
  const attemptBuckets = Array.from({ length: options.retries }, () => new Map());

  for (let client = 0; client < options.clients; client += 1) {
    let nextAtMs = 0;

    for (let attempt = 1; attempt <= options.retries; attempt += 1) {
      const delayMs = calculateDelay(strategy, attempt, options, rng);
      nextAtMs += delayMs;
      const bucket = Math.floor(nextAtMs / options.bucketMs) * options.bucketMs;
      buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
      const currentAttempt = attemptBuckets[attempt - 1];
      currentAttempt.set(bucket, (currentAttempt.get(bucket) ?? 0) + 1);
    }
  }

  const timeline = toTimeline(buckets);
  const attempts = attemptBuckets.map((attemptBucket, index) => ({
    attempt: index + 1,
    timeline: toTimeline(attemptBucket)
  }));
  const peak = Math.max(...timeline.map((entry) => entry.requests));

  return {
    strategy,
    totalRetryRequests: options.clients * options.retries,
    peakRequestsInBucket: peak,
    bucketMs: options.bucketMs,
    attempts,
    timeline
  };
}

function toTimeline(buckets) {
  return Array.from(buckets.entries())
    .sort(([left], [right]) => left - right)
    .map(([atMs, requests]) => ({ atMs, requests }));
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
      `未知策略 "${rawStrategy}"。请使用 immediate、backoff、jitter 或 all。`
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
      throw new Error(`参数 ${name} 缺少数字值`);
    }

    if (name === '--clients') options.clients = value;
    else if (name === '--retries') options.retries = value;
    else if (name === '--base') options.baseDelayMs = value;
    else if (name === '--max-delay') options.maxDelayMs = value;
    else if (name === '--bucket') options.bucketMs = value;
    else if (name === '--seed') options.seed = value;
    else throw new Error(`未知参数 "${name}"`);

    index += 1;
  }

  return { strategy: rawStrategy, options };
}

function printIntro(options) {
  console.log('\nHi-Agent 重试风暴模拟');
  console.log('这只是本地时间轴模拟，不会发起任何网络请求。\n');
  console.log('场景设定');
  console.log(`- 同时失败的 Agent 数量：${options.clients}`);
  console.log(`- 每个 Agent 最多重试：${options.retries} 次`);
  console.log(`- 统计窗口：每 ${options.bucketMs}ms 归为一个时间桶`);
  console.log(`- 指数退避基准：${options.baseDelayMs}ms`);
  console.log(`- 最大等待上限：${options.maxDelayMs}ms\n`);
}

function printScenario(summary) {
  console.log(`=== ${labelFor(summary.strategy)} ===`);
  console.log(descriptionFor(summary.strategy));
  console.log(`总重试请求数：${summary.totalRetryRequests}`);
  console.log(
    `峰值：${summary.peakRequestsInBucket} 次请求 / ${summary.bucketMs}ms`
  );
  console.log(riskFor(summary.strategy, summary));
  console.log('');

  summary.attempts.forEach((attempt) => {
    console.log(`第 ${attempt.attempt} 次重试的时间分布`);
    printTimeline(attempt.timeline, peakOf(attempt.timeline));
  });

  console.log('合并后，上游实际看到的压力');
  printTimeline(summary.timeline, summary.peakRequestsInBucket);
  console.log('');
}

function printComparison(result) {
  console.log('=== 策略对比 ===');
  console.log('策略 | 峰值 | 时间形状 | 直观判断');
  console.log(
    `立即重试 | ${result.immediate.peakRequestsInBucket} / ${result.immediate.bucketMs}ms | 全部堆在 0ms | 最危险，会把临时故障放大成尖峰`
  );
  console.log(
    `只有指数退避 | ${result.backoff.peakRequestsInBucket} / ${result.backoff.bucketMs}ms | 变成几个固定尖峰 | 请求慢下来了，但大家还是一起重试`
  );
  console.log(
    `指数退避 + 随机抖动 | ${result.jitter.peakRequestsInBucket} / ${result.jitter.bucketMs}ms | 分散到多个时间桶 | 峰值被削平，上游更容易恢复`
  );
  console.log('');
  console.log('=== 结论 ===');
  console.log(
    '危险不只来自“总请求数变多”，更来自“同一瞬间的请求尖峰”。'
  );
  console.log(
    '指数退避负责让后续重试越来越慢，随机抖动负责把一批客户端打散。'
  );
  console.log('');
}

function labelFor(strategy) {
  if (strategy === 'immediate') return '立即重试：所有客户端同时再次发起';
  if (strategy === 'backoff') return '只有指数退避：慢下来，但仍然排队撞上去';
  return '指数退避 + 随机抖动：慢下来，并且分散开';
}

function descriptionFor(strategy) {
  if (strategy === 'immediate') {
    return '失败后不等待，所有 Agent 的每一次重试都会挤到同一个时间点。';
  }
  if (strategy === 'backoff') {
    return '每次失败后等待更久，但所有 Agent 算出来的等待时间完全一样。';
  }
  return '每次失败后先计算退避窗口，再在窗口内随机选择具体等待时间。';
}

function riskFor(strategy, summary) {
  if (strategy === 'immediate') {
    return `危险点：${summary.peakRequestsInBucket} 次重试会同时压到上游。`;
  }
  if (strategy === 'backoff') {
    return `改善点：峰值降到 ${summary.peakRequestsInBucket}，但固定时间点仍然会出现整齐尖峰。`;
  }
  return `改善点：峰值降到 ${summary.peakRequestsInBucket}，压力被摊开到更长时间线上。`;
}

function printTimeline(timeline, peak) {
  timeline.forEach((entry) => {
    const bar = '#'.repeat(
      Math.max(1, Math.round((entry.requests / peak) * 34))
    );
    console.log(
      `${String(entry.atMs).padStart(5, ' ')}ms | ${String(
        entry.requests
      ).padStart(4, ' ')} | ${bar}`
    );
  });
  console.log('');
}

function peakOf(timeline) {
  return Math.max(...timeline.map((entry) => entry.requests));
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
