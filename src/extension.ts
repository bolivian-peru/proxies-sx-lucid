import type { Extension, BuildContext } from '@lucid-agents/types';
import { ProxiesSxClient } from './client';
import type {
  ProxiesSxConfig,
  ProxySxRuntime,
  ProxyRequestOptions,
  X402ProxyResponse,
  SessionInfo,
  CountryInfo,
  PricingInfo,
  PaymentRequirement,
} from './types';

/**
 * Lucid Agents extension for Proxies.sx mobile proxies.
 *
 * Adds `proxy` to the agent runtime with methods to:
 * - Get pricing and available countries
 * - Get 402 payment requirements (amount, payTo address)
 * - Purchase proxy with a transaction hash
 * - Check session status
 *
 * Payment flow (bypasses facilitator — direct on-chain verification):
 * 1. Call `runtime.proxy.getPaymentRequirement()` to get cost + payTo address
 * 2. Use agent wallet to send USDC on Base or Solana to payTo
 * 3. Call `runtime.proxy.purchaseProxy(txHash)` with the tx hash
 *
 * @example
 * ```ts
 * import { createAgent } from '@lucid-agents/core';
 * import { wallets, walletsFromEnv } from '@lucid-agents/wallet';
 * import { proxiesSx } from '@proxies-sx/lucid-agents';
 *
 * const agent = await createAgent({ name: 'scraper', version: '1.0.0' })
 *   .use(wallets({ config: walletsFromEnv() }))
 *   .use(proxiesSx({ defaultCountry: 'US' }))
 *   .build();
 *
 * // 1. Get payment requirement
 * const req = await agent.proxy.getPaymentRequirement({ trafficGB: 1 });
 * const accept = req.accepts[0];
 *
 * // 2. Send USDC via agent wallet (you implement this with your wallet)
 * const txHash = await sendUSDC(accept.payTo, accept.maxAmountRequired, accept.asset);
 *
 * // 3. Get proxy credentials
 * const result = await agent.proxy.purchaseProxy(txHash, { country: 'US', trafficGB: 1 });
 * console.log(result.proxy.http);  // http://user:pass@server:port
 * console.log(result.proxy.socks5); // socks5://user:pass@server:port
 * ```
 */
export function proxiesSx(
  config?: ProxiesSxConfig,
): Extension<{ proxy: ProxySxRuntime }> {
  const client = new ProxiesSxClient(config?.baseUrl);

  const defaults = {
    country: config?.defaultCountry || 'US',
    trafficGB: config?.defaultTrafficGB || 1,
    durationSeconds: config?.defaultDurationSeconds || 3600,
    tier: config?.defaultTier || 'shared',
    network: config?.defaultNetwork || 'solana',
  } as const;

  return {
    name: 'proxies-sx',

    build(_ctx: BuildContext): { proxy: ProxySxRuntime } {
      const proxy: ProxySxRuntime = {
        async getPaymentRequirement(opts?: ProxyRequestOptions): Promise<PaymentRequirement> {
          return client.getPaymentRequirement(mergeDefaults(opts, defaults));
        },

        async purchaseProxy(txHash: string, opts?: ProxyRequestOptions): Promise<X402ProxyResponse> {
          return client.purchaseProxy(txHash, mergeDefaults(opts, defaults));
        },

        async getSession(sessionToken: string): Promise<SessionInfo> {
          return client.getSession(sessionToken);
        },

        async getCountries(tier?: 'shared' | 'private'): Promise<CountryInfo[]> {
          return client.getCountries(tier);
        },

        async getPricing(): Promise<PricingInfo> {
          return client.getPricing();
        },
      };

      return { proxy };
    },
  };
}

function mergeDefaults(
  opts: ProxyRequestOptions | undefined,
  defaults: {
    country: string;
    trafficGB: number;
    durationSeconds: number;
    tier: 'shared' | 'private';
    network: 'base' | 'solana';
  },
): ProxyRequestOptions {
  return {
    country: opts?.country || defaults.country,
    trafficGB: opts?.trafficGB || defaults.trafficGB,
    durationSeconds: opts?.durationSeconds || defaults.durationSeconds,
    tier: opts?.tier || defaults.tier,
    network: opts?.network || defaults.network,
    city: opts?.city,
    carrier: opts?.carrier,
  };
}
