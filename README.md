# @proxies-sx/lucid-agents

[Lucid Agents](https://github.com/daydreamsai/lucid-agents) extension for **Proxies.sx** mobile proxies — real 4G/5G mobile IPs with x402 USDC micropayments.

## What is this?

This extension adds `.proxy` to your Lucid agent runtime, giving any AI agent the ability to autonomously acquire mobile proxy connections by paying with USDC on Base or Solana.

**No accounts. No API keys. Just pay and connect.**

| Feature | Detail |
|---------|--------|
| IPs | Real 4G/5G mobile carrier IPs |
| Countries | Read the current [dedicated-port inventory](https://api.proxies.sx/v1/x402/countries) with `getCountries()`. |
| Protocols | HTTP + SOCKS5 |
| Pricing | Read the [dedicated-port pricing](https://api.proxies.sx/v1/x402/pricing) and check the quote for your request. |
| Payment | USDC on Base or Solana |
| Minimum traffic | `minTrafficGB` in the pricing response |

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

// Store the returned proxy credentials and session token privately.
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
  defaultTier: 'shared',         // Dedicated-port tier
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
const available = countries.filter(country => country.availableDevices > 0);
```

### `agent.proxy.getPricing()`

Read pricing for the dedicated-port API. Version 1.0.0 returns the live JSON response directly. Its published TypeScript declarations use older field names. In JavaScript:

```js
const pricing = await agent.proxy.getPricing();
console.log(pricing.shared.trafficPricePerGB);
console.log(pricing.minTrafficGB);
```

The [live response](https://api.proxies.sx/v1/x402/pricing) has a `shared` rate and a list of network objects.

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
- **Country selection** — use a country with available devices for regional testing
- **Real device fingerprints** — genuine mobile carrier ASNs
- **IP rotation** — rotate to a new IP via API call

## Links

- [Proxies.sx Agents](https://agents.proxies.sx) — Service landing page
- [x402 Protocol](https://x402.org) — HTTP 402 payment standard
- [Lucid Agents](https://github.com/daydreamsai/lucid-agents) — Agent framework
- [Dedicated-port API guide](https://agents.proxies.sx/marketplace/skill.md)

## License

MIT
