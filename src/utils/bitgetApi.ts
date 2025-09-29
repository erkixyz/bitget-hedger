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

  console.log('🔏 Signature Debug:', {
    timestamp,
    method: normalizedMethod,
    requestPath: normalizedPath,
    queryString: normalizedQuery,
    body: normalizedBody,
    fullMessage: message,
    messageLength: message.length,
    secretKey: secretKey.substring(0, 10) + '...',
  });

  const signature = CryptoJS.enc.Base64.stringify(
    CryptoJS.HmacSHA256(message, secretKey),
  );
  console.log('🔏 Generated signature:', signature);

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

  // Debug logging
  console.log('🔐 API Request Debug:', {
    accountId: account.id,
    accountName: account.name,
    method,
    requestPath,
    queryString,
    timestamp,
    apiKey: account.apiKey, // Show full API key for debugging
    apiSecret: account.apiSecret.substring(0, 10) + '...',
    passphrase: account.passphrase,
    signature: signature.substring(0, 20) + '...',
    fullSignature: signature, // Show full signature for debugging
    signatureMessage: `${timestamp}${method.toUpperCase()}${requestPath}${queryString}${body}`,
  });

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
  console.log('📡 Making API request:', {
    accountName: account.name,
    fullUrl,
    method,
    requestBody,
    headers: headers, // Show all headers for debugging
    timestamp: new Date().toISOString(),
  });

  const response = await fetch(fullUrl, {
    method,
    headers,
    body: method === 'POST' ? requestBody : undefined,
  });

  console.log('📨 API Response:', { status: response.status, ok: response.ok });

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
  console.log('✅ API Success:', {
    code: result.code,
    dataLength: result.data?.length,
  });
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
      console.warn(`⚠️ Orders API Error for ${account.name}: ${response.msg}`);
      return []; // Return empty array if orders endpoint fails
    }

    return response.data;
  } catch (error) {
    console.warn(`⚠️ Orders API failed for ${account.name}:`, error);
    return []; // Return empty array if orders endpoint fails
  }
}

// Cancel order
export async function cancelOrder(
  account: BitgetAccount,
  orderId: string,
): Promise<boolean> {
  const response = await makeApiRequest<{ orderId: string }>(
    account,
    'POST',
    '/api/mix/v1/order/cancel-order',
    {},
    {
      orderId,
      productType: 'umcbl',
    },
  );

  if (response.code !== '00000') {
    throw new Error(`API Error: ${response.msg}`);
  }

  return true;
}

// Get ticker price
export async function getTickerPrice(
  symbol: string,
): Promise<{ symbol: string; lastPr: string }> {
  const response = await fetch(`/api/mix/v1/market/ticker?symbol=${symbol}`);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const result = await response.json();

  if (result.code !== '00000') {
    throw new Error(`API Error: ${result.msg}`);
  }

  return result.data;
}
