# @proxies-sx/lucid-agents

[Lucid Agents](https://github.com/daydreamsai/lucid-agents) extension for **Proxies.sx** mobile proxies — real 4G/5G mobile IPs with x402 USDC micropayments.

## What is this?

This extension adds `.proxy` to your Lucid agent runtime, giving any AI agent the ability to autonomously acquire mobile proxy connections by paying with USDC on Base or Solana.

**No accounts. No API keys. Just pay and connect.**

| Feature | Detail |
|---------|--------|
| IPs | Real 4G/5G mobile carrier IPs |
| Countries | US, DE, GB, FR, ES, PL |
| Protocols | HTTP + SOCKS5 |
| Pricing | $4/GB |
| Payment | USDC on Base or Solana |
| Settlement | ~2s Base, ~400ms Solana |
| Min purchase | $0.40 (0.1 GB) |

## Install

```bash
npm install @proxies-sx/lucid-agents @lucid-agents/types
```

## Quick Start

```typescript
import { createAgent } from '@lucid-agents/core';
import { wallets, walletsFromEnv } from '@lucid-agents/wallet';
import { proxiesSx } from '@proxies-sx/lucid-agents';

const agent = await createAgent({
  name: 'my-scraper',
  version: '1.0.0',
  description: 'Web scraper with mobile proxies',
})
  .use(wallets({ config: walletsFromEnv() }))
  .use(proxiesSx({ defaultCountry: 'US' }))
  .build();

// Step 1: Get payment requirement (cost + payTo address)
const req = await agent.proxy.getPaymentRequirement({
  country: 'US',
  trafficGB: 1,
  durationSeconds: 3600,
  tier: 'shared',
  network: 'solana',
});

const accept = req.accepts[0];
console.log(`Cost: ${accept.maxAmountRequired} micro-USDC`);
console.log(`Pay to: ${accept.payTo}`);
console.log(`Network: ${accept.network}`);

// Step 2: Send USDC with your agent's wallet
// (implement with @lucid-agents/wallet or viem/web3)
const txHash = await sendUSDCToAddress(
  accept.payTo,
  accept.maxAmountRequired,
  accept.network,
);

// Step 3: Get proxy credentials
const result = await agent.proxy.purchaseProxy(txHash, {
  country: 'US',
  trafficGB: 1,
});

console.log(result.proxy.http);     // http://user:pass@server:port
console.log(result.proxy.socks5);   // socks5://user:pass@server:port
console.log(result.proxy.expiresAt);
console.log(result.management.sessionToken); // For session management
```

## Payment Flow

This extension bypasses the Daydreams/Coinbase facilitator entirely. Your agent sends USDC directly on-chain, and our backend verifies the transaction.

```
Agent                          Proxies.sx API              Blockchain
  |                                  |                        |
  |-- getPaymentRequirement() ------>|                        |
  |<-- 402 { payTo, amount } --------|                        |
  |                                  |                        |
  |-- sendUSDC(payTo, amount) ------------------------------>|
  |<-- txHash ------------------------------------------------|
  |                                  |                        |
  |-- purchaseProxy(txHash) -------->|                        |
  |                                  |-- verify tx ---------->|
  |                                  |<-- confirmed ----------|
  |<-- { proxy credentials } --------|                        |
```

**No facilitator. No intermediary. Direct verification.**

## Configuration

```typescript
proxiesSx({
  baseUrl: 'https://api.proxies.sx/v1/x402', // Default
  defaultCountry: 'US',          // Default country code
  defaultTrafficGB: 1,           // Default traffic allocation
  defaultDurationSeconds: 3600,  // Default session duration (1 hour)
  defaultTier: 'shared',         // 'shared' or 'private' — both $4/GB
  defaultNetwork: 'solana',      // 'base' or 'solana'
})
```

## API Reference

### `agent.proxy.getPaymentRequirement(opts?)`

Returns the x402 payment requirement — how much USDC to send and where.

```typescript
const req = await agent.proxy.getPaymentRequirement({
  country: 'DE',     // Optional, defaults to config
  trafficGB: 2,      // Optional
  tier: 'shared',    // Optional
  network: 'solana', // Optional
});
// req.accepts[0].payTo → wallet address
// req.accepts[0].maxAmountRequired → amount in micro-USDC (string)
```

### `agent.proxy.purchaseProxy(txHash, opts?)`

After sending USDC, call this with the transaction hash to get proxy credentials.

```typescript
const result = await agent.proxy.purchaseProxy('5xYz...abc', {
  country: 'US',
  trafficGB: 1,
});
// result.proxy.http → HTTP proxy URL
// result.proxy.socks5 → SOCKS5 proxy URL
// result.management.sessionToken → for session management
// result.rotationUrl → GET to rotate IP
```

### `agent.proxy.getSession(sessionToken)`

Check session status (traffic usage, expiry, port status).

```typescript
const session = await agent.proxy.getSession('x402s_abc123');
// session.traffic.remainingGB
// session.status
```

### `agent.proxy.getCountries(tier?)`

List available countries with device counts.

```typescript
const countries = await agent.proxy.getCountries('shared');
// [{ code: 'US', name: 'United States', availableDevices: 45 }, ...]
```

### `agent.proxy.getPricing()`

Get current pricing info.

```typescript
const pricing = await agent.proxy.getPricing();
// pricing.shared.trafficPerGB → 4
// (all traffic is $4/GB — the response carries no separate private price)
```

## Standalone Client

You can also use the HTTP client directly without Lucid Agents:

```typescript
import { ProxiesSxClient } from '@proxies-sx/lucid-agents';

const client = new ProxiesSxClient();
const pricing = await client.getPricing();
const countries = await client.getCountries();
const requirement = await client.getPaymentRequirement({ country: 'US', trafficGB: 1 });
const proxy = await client.purchaseProxy('tx_hash_here', { country: 'US', trafficGB: 1 });
```

## Why Mobile Proxies?

Mobile IPs are the gold standard for web access:
- **Never blocked** — websites can't ban carrier IP ranges without blocking real users
- **Real device fingerprints** — genuine mobile carrier ASNs
- **IP rotation** — rotate to a new IP via API call

## Links

- [Proxies.sx Agents](https://agents.proxies.sx) — Service landing page
- [x402 Protocol](https://x402.org) — HTTP 402 payment standard
- [Lucid Agents](https://github.com/daydreamsai/lucid-agents) — Agent framework
- [API Docs](https://api.proxies.sx/api) — Swagger documentation

## License

MIT
