import { describe, it, expect, vi, beforeEach } from 'vitest';
import { proxiesSx } from '../extension';
import { ProxiesSxClient } from '../client';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('proxiesSx extension', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('returns extension with correct name', () => {
    const ext = proxiesSx();
    expect(ext.name).toBe('proxies-sx');
  });

  it('builds runtime with proxy property', () => {
    const ext = proxiesSx();
    const result = ext.build({ meta: { name: 'test', version: '1.0.0' }, runtime: {} });
    expect(result).toHaveProperty('proxy');
    expect(result.proxy).toHaveProperty('getPaymentRequirement');
    expect(result.proxy).toHaveProperty('purchaseProxy');
    expect(result.proxy).toHaveProperty('getSession');
    expect(result.proxy).toHaveProperty('getCountries');
    expect(result.proxy).toHaveProperty('getPricing');
  });

  it('getPricing calls correct endpoint', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        shared: { tier: 'shared', portPriceMonthly: 0, trafficPricePerGB: 4, portPricePerHour: 0, portPricePerDay: 0 },
        networks: [{ network: 'base', chainId: 'eip155:8453', enabled: true, usdcAddress: 'asset', recipientAddress: 'recipient' }],
        minTrafficGB: 0.1, minDurationSeconds: 3600, maxDurationSeconds: 2592000,
      }),
    });

    const ext = proxiesSx();
    const { proxy } = ext.build({ meta: { name: 'test', version: '1.0.0' }, runtime: {} });
    const pricing = await proxy.getPricing();

    expect(mockFetch).toHaveBeenCalledWith('https://api.proxies.sx/v1/x402/pricing');
    expect(pricing.shared.trafficPricePerGB).toBe(4);
    expect(pricing.networks[0].chainId).toBe('eip155:8453');
    expect(pricing.maxDurationSeconds).toBe(2592000);
  });

  it('getCountries calls correct endpoint with tier', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([{ code: 'US', name: 'United States' }]),
    });

    const ext = proxiesSx();
    const { proxy } = ext.build({ meta: { name: 'test', version: '1.0.0' }, runtime: {} });
    await proxy.getCountries('shared');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.proxies.sx/v1/x402/countries?tier=shared',
    );
  });

  it('getPaymentRequirement applies defaults', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 402,
      json: () =>
        Promise.resolve({
          accepts: [{ network: 'solana', maxAmountRequired: '4000000', payTo: '6eUd...' }],
        }),
    });

    const ext = proxiesSx({ defaultCountry: 'DE', defaultTrafficGB: 2 });
    const { proxy } = ext.build({ meta: { name: 'test', version: '1.0.0' }, runtime: {} });
    await proxy.getPaymentRequirement();

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('country=DE');
    expect(calledUrl).toContain('traffic=2');
  });

  it('purchaseProxy sends Payment-Signature header', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          proxy: { http: 'http://user:pass@1.2.3.4:8080' },
          sessionId: 'sess_123',
        }),
    });

    const ext = proxiesSx();
    const { proxy } = ext.build({ meta: { name: 'test', version: '1.0.0' }, runtime: {} });
    await proxy.purchaseProxy('5abc...txhash', { country: 'US', trafficGB: 1 });

    const [url, opts] = mockFetch.mock.calls[0];
    expect(opts.headers['Payment-Signature']).toBe('5abc...txhash');
    expect(opts.method).toBe('GET');
  });

  it('purchaseProxy throws PaymentError on 402', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 402,
      ok: false,
      json: () =>
        Promise.resolve({
          accepts: [{ network: 'solana', maxAmountRequired: '8000000' }],
          error: 'Insufficient payment',
        }),
    });

    const ext = proxiesSx();
    const { proxy } = ext.build({ meta: { name: 'test', version: '1.0.0' }, runtime: {} });

    await expect(proxy.purchaseProxy('bad_tx')).rejects.toThrow('Payment insufficient');
  });

  it('uses custom baseUrl', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    });

    const ext = proxiesSx({ baseUrl: 'https://custom.api.com/v1/x402' });
    const { proxy } = ext.build({ meta: { name: 'test', version: '1.0.0' }, runtime: {} });
    await proxy.getPricing();

    expect(mockFetch).toHaveBeenCalledWith('https://custom.api.com/v1/x402/pricing');
  });
});

describe('ProxiesSxClient', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('getSession sends X-Session-Token header', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ sessionId: 'sess_abc' }),
    });

    const client = new ProxiesSxClient();
    await client.getSession('x402s_abc123');

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.proxies.sx/v1/x402/manage/session');
    expect(opts.headers['X-Session-Token']).toBe('x402s_abc123');
  });
});
