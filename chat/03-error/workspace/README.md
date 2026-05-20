# Retry Storm Simulation

这个 workspace 不会发起任何网络请求。它只是在内存里模拟一批 Agent
请求同时失败之后，不同重试策略会把重试请求安排到哪些时间点。

```bash
npm run storm
npm run backoff
npm run jitter
npm run all
```
