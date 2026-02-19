import type {
  X402ProxyResponse,
  SessionInfo,
  PricingInfo,
  CountryInfo,
  PaymentRequirement,
  ProxyRequestOptions,
} from './types';

const DEFAULT_BASE_URL = 'https://api.proxies.sx/v1/x402';

export class ProxiesSxClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = (baseUrl || DEFAULT_BASE_URL).replace(/\/$/, '');
  }

  /** Get pricing info (no auth required) */
  async getPricing(): Promise<PricingInfo> {
    const res = await fetch(`${this.baseUrl}/pricing`);
    if (!res.ok) throw new Error(`Pricing request failed: ${res.status}`);
    return res.json();
  }

  /** Get available countries (no auth required) */
  async getCountries(tier?: 'shared' | 'private'): Promise<CountryInfo[]> {
    const params = tier ? `?tier=${tier}` : '';
    const res = await fetch(`${this.baseUrl}/countries${params}`);
    if (!res.ok) throw new Error(`Countries request failed: ${res.status}`);
    return res.json();
  }

  /**
   * Get 402 payment requirement without paying.
   * Calls the proxy endpoint without Payment-Signature to get the 402 response.
   */
  async getPaymentRequirement(opts: ProxyRequestOptions = {}): Promise<PaymentRequirement> {
    const params = this.buildProxyParams(opts);
    const res = await fetch(`${this.baseUrl}/proxy?${params}`);

    if (res.status === 402) {
      return res.json();
    }
    throw new Error(`Expected 402, got ${res.status}`);
  }

  /**
   * Purchase a proxy with a pre-signed transaction hash.
   * The agent wallet must have already sent USDC to the payTo address.
   */
  async purchaseProxy(
    txHash: string,
    opts: ProxyRequestOptions = {},
  ): Promise<X402ProxyResponse> {
    const params = this.buildProxyParams(opts);
    const res = await fetch(`${this.baseUrl}/proxy?${params}`, {
      method: 'GET',
      headers: {
        'Payment-Signature': txHash,
      },
    });

    if (res.status === 402) {
      const requirement = await res.json();
      throw new PaymentError('Payment insufficient or invalid', requirement);
    }
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Proxy purchase failed (${res.status}): ${body}`);
    }
    return res.json();
  }

  /** Get session details via session token */
  async getSession(sessionToken: string): Promise<SessionInfo> {
    const res = await fetch(`${this.baseUrl}/manage/session`, {
      headers: { 'X-Session-Token': sessionToken },
    });
    if (!res.ok) throw new Error(`Session request failed: ${res.status}`);
    return res.json();
  }

  private buildProxyParams(opts: ProxyRequestOptions): string {
    const params = new URLSearchParams();
    if (opts.country) params.set('country', opts.country);
    if (opts.city) params.set('city', opts.city);
    if (opts.carrier) params.set('carrier', opts.carrier);
    if (opts.trafficGB) params.set('traffic', String(opts.trafficGB));
    if (opts.durationSeconds) params.set('duration', String(opts.durationSeconds));
    if (opts.tier) params.set('tier', opts.tier);
    if (opts.network) params.set('network', opts.network);
    return params.toString();
  }
}

export class PaymentError extends Error {
  constructor(
    message: string,
    public readonly requirement: PaymentRequirement,
  ) {
    super(message);
    this.name = 'PaymentError';
  }
}
