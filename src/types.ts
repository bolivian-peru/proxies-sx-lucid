/** Proxy credentials returned after successful x402 payment */
export interface ProxyCredentials {
  http: string;
  socks5: string;
  server: string;
  httpPort: number;
  socksPort: number;
  username: string;
  password: string;
  expiresAt: string;
}

/** Full response from POST /v1/x402/proxy */
export interface X402ProxyResponse {
  proxy: ProxyCredentials;
  rotationUrl: string;
  sessionId: string;
  portId: string;
  traffic: {
    allocatedGB: number;
    usedGB: number;
    remainingGB: number;
  };
  payment: {
    txHash: string;
    network: string;
    amountUSDC: number;
    walletAddress: string;
  };
  location: {
    country: string;
    countryCode: string;
    city?: string;
    carrier?: string;
  };
  management: {
    sessionToken: string;
    statusEndpoint: string;
    sessionEndpoint: string;
    replaceEndpoint: string;
    topupEndpoint: string;
    authMethod: string;
  };
}

/** Session details from GET /v1/x402/manage/session */
export interface SessionInfo {
  sessionId: string;
  walletAddress: string;
  network: string;
  tier: string;
  status: string;
  traffic: {
    allocatedGB: number;
    usedGB: number;
    remainingGB: number;
  };
  ports: Array<{
    portId: string;
    status: string;
    server: string;
    httpPort: number;
    socksPort: number;
  }>;
  expiresAt: string;
  createdAt: string;
}

/** Pricing info from GET /v1/x402/pricing */
export interface PricingInfo {
  shared: { portPerMonth: number; trafficPerGB: number };
  private: { portPerMonth: number; trafficPerGB: number };
  currency: string;
  networks: string[];
  minTrafficGB: number;
  minDurationSeconds: number;
}

/** Available country */
export interface CountryInfo {
  code: string;
  name: string;
  availableDevices: number;
  tier: string;
}

/** 402 Payment Required response */
export interface PaymentRequirement {
  accepts: Array<{
    scheme: string;
    network: string;
    maxAmountRequired: string;
    resource: string;
    description: string;
    payTo: string;
    asset: string;
    extra?: Record<string, unknown>;
  }>;
  error?: string;
}

/** Options for requesting a proxy */
export interface ProxyRequestOptions {
  country?: string;
  city?: string;
  carrier?: string;
  trafficGB?: number;
  durationSeconds?: number;
  tier?: 'shared' | 'private';
  network?: 'base' | 'solana';
}

/** Extension configuration */
export interface ProxiesSxConfig {
  baseUrl?: string;
  defaultCountry?: string;
  defaultTrafficGB?: number;
  defaultDurationSeconds?: number;
  defaultTier?: 'shared' | 'private';
  defaultNetwork?: 'base' | 'solana';
}

/** Runtime slice added to AgentRuntime */
export interface ProxySxRuntime {
  /** Step 1: Get the USDC cost and payTo address for a proxy request */
  getPaymentRequirement(opts?: ProxyRequestOptions): Promise<PaymentRequirement>;
  /** Step 2: After sending USDC, pass the txHash to get proxy credentials */
  purchaseProxy(txHash: string, opts?: ProxyRequestOptions): Promise<X402ProxyResponse>;
  /** Check session status using the session token from purchase response */
  getSession(sessionToken: string): Promise<SessionInfo>;
  /** List available countries */
  getCountries(tier?: 'shared' | 'private'): Promise<CountryInfo[]>;
  /** Get pricing info */
  getPricing(): Promise<PricingInfo>;
}
