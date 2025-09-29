import CryptoJS from 'crypto-js';

// Bitget API account interface
export interface BitgetAccount {
  id: string;
  name: string;
  apiKey: string;
  apiSecret: string;
  passphrase: string;
  enabled: boolean;
}

// API response interfaces
export interface BitgetAccountBalance {
  marginCoin: string;
  locked: string;
  available: string;
  crossMaxAvailable: string;
  equity: string;
  usdtEquity: string;
  btcEquity: string;
  crossRiskRate: string;
  crossMarginLeverage: string;
  fixedMaxAvailable: string;
  maxTransferOut: string;
  accountId: string;
  unrealizedPL: string;
  bonus: string;
}

export interface BitgetPosition {
  marginCoin: string;
  symbol: string;
  holdSide: string;
  openDelegateCount: string;
  margin: string;
  available: string;
  locked: string;
  total: string;
  leverage: string;
  achievedProfits: string;
  averageOpenPrice: string;
  marginMode: string;
  holdMode: string;
  unrealizedPL: string;
  liquidationPrice: string;
  keepMarginRate: string;
  marketPrice: string;
  cTime: string;
}

export interface BitgetOrder {
  userId: string;
  symbol: string;
  orderId: string;
  clientOid: string;
  price: string;
  size: string;
  orderType: string;
  side: string;
  status: string;
  priceAvg: string;
  baseVolume: string;
  quoteVolume: string;
  enterPointSource: string;
  feeDetail: string;
  orderSource: string;
  cTime: string;
  uTime: string;
}

// Generate signature for Bitget API
function generateSignature(
  method: string,
  requestPath: string,
  queryString: string,
  body: string,
  timestamp: string,
  secretKey: string,
): string {
  // Bitget signature format: timestamp + method + requestPath + queryString + body
  // Ensure proper formatting
  const normalizedMethod = method.toUpperCase();
  const normalizedPath = requestPath;
  const normalizedQuery = queryString || '';
  const normalizedBody = body || '';

  const message =
    timestamp +
    normalizedMethod +
    normalizedPath +
    normalizedQuery +
    normalizedBody;

  const signature = CryptoJS.enc.Base64.stringify(
    CryptoJS.HmacSHA256(message, secretKey),
  );

  return signature;
}

// Create headers for Bitget API request
function createHeaders(
  method: string,
  requestPath: string,
  queryString: string,
  body: string,
  account: BitgetAccount,
): Record<string, string> {
  const timestamp = Date.now().toString();
  const signature = generateSignature(
    method,
    requestPath,
    queryString,
    body,
    timestamp,
    account.apiSecret,
  );

  const headers = {
    'ACCESS-KEY': account.apiKey,
    'ACCESS-SIGN': signature,
    'ACCESS-TIMESTAMP': timestamp,
    'ACCESS-PASSPHRASE': account.passphrase,
    'Content-Type': 'application/json',
    locale: 'en-US',
  };

  return headers;
}

// Base API request function
async function makeApiRequest<T>(
  account: BitgetAccount,
  method: 'GET' | 'POST',
  endpoint: string,
  params?: Record<string, string | number>,
  body?: Record<string, unknown>,
): Promise<{ code: string; msg: string; data: T }> {
  const baseUrl = ''; // Use proxy instead of direct API calls
  const requestPath = endpoint;

  let queryString = '';
  if (params && Object.keys(params).length > 0) {
    queryString =
      '?' +
      new URLSearchParams(
        Object.entries(params).map(([k, v]) => [k, String(v)]),
      ).toString();
  }

  const requestBody = method === 'POST' && body ? JSON.stringify(body) : '';
  const headers = createHeaders(
    method,
    requestPath,
    queryString,
    requestBody,
    account,
  );

  const fullUrl = baseUrl + requestPath + queryString;
  const response = await fetch(fullUrl, {
    method,
    headers,
    body: method === 'POST' ? requestBody : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ API Error Details:', {
      account: account.name,
      apiKey: account.apiKey,
      url: fullUrl,
      status: response.status,
      statusText: response.statusText,
      errorBody: errorText,
      requestHeaders: headers,
    });
    throw new Error(
      `HTTP error! status: ${response.status}, body: ${errorText}`,
    );
  }

  const result = await response.json();
  return result;
}

// Get account balance
export async function getAccountBalance(
  account: BitgetAccount,
): Promise<BitgetAccountBalance[]> {
  const response = await makeApiRequest<BitgetAccountBalance[]>(
    account,
    'GET',
    '/api/mix/v1/account/accounts',
    { productType: 'umcbl' },
  );

  if (response.code !== '00000') {
    throw new Error(`API Error: ${response.msg}`);
  }

  return response.data;
}

// Get positions
export async function getPositions(
  account: BitgetAccount,
): Promise<BitgetPosition[]> {
  const response = await makeApiRequest<BitgetPosition[]>(
    account,
    'GET',
    '/api/mix/v1/position/allPosition',
    { productType: 'umcbl' },
  );

  if (response.code !== '00000') {
    throw new Error(`API Error: ${response.msg}`);
  }

  return response.data;
}

// Get orders
export async function getOrders(
  account: BitgetAccount,
): Promise<BitgetOrder[]> {
  try {
    // Try different orders endpoint or add required parameters
    const response = await makeApiRequest<BitgetOrder[]>(
      account,
      'GET',
      '/api/mix/v1/order/marginCoinCurrent',
      { productType: 'umcbl', marginCoin: 'USDT' },
    );

    if (response.code !== '00000') {
      return []; // Return empty array if orders endpoint fails
    }

    return response.data;
  } catch {
    return []; // Return empty array if orders endpoint fails
  }
}

// Cancel order
export async function cancelOrder(
  account: BitgetAccount,
  orderId: string,
  symbol: string,
  marginCoin: string = 'USDT',
): Promise<boolean> {
  const response = await makeApiRequest<{ orderId: string }>(
    account,
    'POST',
    '/api/mix/v1/order/cancel-order',
    {},
    {
      orderId,
      symbol,
      productType: 'umcbl',
      marginCoin,
    },
  );

  if (response.code !== '00000') {
    throw new Error(`API Error: ${response.msg}`);
  }

  return true;
}
