import { useState, useEffect } from 'react';
import { loadConfig, type Config } from './utils/config';
import {
  getAccountBalance,
  getPositions,
  getOrders,
  cancelOrder,
  type BitgetAccount,
  type BitgetAccountBalance,
  type BitgetPosition,
  type BitgetOrder,
} from './utils/bitgetApi';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Paper,
  IconButton,
  Container,
  FormControl,
  Select,
  MenuItem,
  Chip,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Settings,
  AccountBalanceWallet,
  Refresh,
  Cancel,
  Schedule,
} from '@mui/icons-material';

// Helper interfaces for UI components

// Symbol icons (using simple colored circles for crypto symbols)
const SymbolIcon = ({ symbol }: { symbol: string }) => {
  const getColor = () => {
    switch (symbol) {
      case 'BTCUSD.P':
        return '#f7931a';
      case 'ETHUSD.P':
        return '#627eea';
      case 'BNBUSDT.P':
        return '#f3ba2f';
      default:
        return '#757575';
    }
  };

  return (
    <Box
      sx={{
        width: 24,
        height: 24,
        borderRadius: '50%',
        bgcolor: getColor(),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '10px',
        fontWeight: 'bold',
        mr: 1,
      }}
    >
      {symbol.slice(0, 3)}
    </Box>
  );
};

interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  lastUpdate: number;
}

function App() {
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSD.P');
  const [currentPrice, setCurrentPrice] = useState(0);
  const [priceData, setPriceData] = useState<{ [key: string]: PriceData }>({});
  const [wsConnected, setWsConnected] = useState(false);

  // Configuration
  const [config, setConfig] = useState<Config | null>(null);
  const [configLoading, setConfigLoading] = useState(true);

  // Bitget account data (using first enabled account)
  const [accountBalance, setAccountBalance] =
    useState<BitgetAccountBalance | null>(null);
  const [positions, setPositions] = useState<BitgetPosition[]>([]);
  const [orders, setOrders] = useState<BitgetOrder[]>([]);
  const [accountLoading, setAccountLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [currentAccount, setCurrentAccount] = useState<BitgetAccount | null>(
    null,
  );

  // Fetch real-time price data using REST API
  useEffect(() => {
    const symbols = [
      { api: 'BTCUSDT_UMCBL', display: 'BTCUSD.P' },
      { api: 'ETHUSDT_UMCBL', display: 'ETHUSD.P' },
      { api: 'BNBUSDT_UMCBL', display: 'BNBUSDT.P' },
    ];

    const fetchPrices = async () => {
      try {
        setWsConnected(true);

        for (const symbol of symbols) {
          try {
            const response = await fetch(
              `https://api.bitget.com/api/mix/v1/market/ticker?symbol=${symbol.api}`,
            );

            if (response.ok) {
              const data = await response.json();

              if (data.code === '00000' && data.data) {
                const ticker = data.data;
                const price = parseFloat(ticker.last);
                const change24h = parseFloat(ticker.priceChangePercent) * 100;
                const volume24h = parseFloat(ticker.baseVolume || '0');

                setPriceData((prev) => ({
                  ...prev,
                  [symbol.display]: {
                    symbol: symbol.display,
                    price,
                    change24h,
                    volume24h,
                    lastUpdate: Date.now(),
                  },
                }));

                // Update current price if this is the selected symbol
                if (symbol.display === selectedSymbol) {
                  setCurrentPrice(price);
                }
              }
            }
          } catch (error) {
            console.error(`Error fetching ${symbol.display} price:`, error);
          }
        }
      } catch (error) {
        console.error('Error in price fetching:', error);
        setWsConnected(false);
      }
    };

    // Initial fetch
    fetchPrices();

    // Set up interval for regular updates (every 2 seconds)
    const interval = setInterval(fetchPrices, 2000);

    return () => {
      clearInterval(interval);
    };
  }, [selectedSymbol]);

  // Update current price when symbol changes
  useEffect(() => {
    const symbolPriceData = priceData[selectedSymbol];
    if (symbolPriceData) {
      setCurrentPrice(symbolPriceData.price);
    }
  }, [selectedSymbol, priceData]);

  // Fetch account data from Bitget API
  const fetchAccountData = async () => {
    if (!config || config.accounts.length === 0) return;

    // Use first enabled account
    const firstAccount = config.accounts.find((acc) => acc.enabled);
    if (!firstAccount) return;

    setAccountLoading(true);
    setApiError(null);

    try {
      const bitgetAccount: BitgetAccount = {
        id: firstAccount.id,
        name: firstAccount.name,
        apiKey: firstAccount.apiKey,
        apiSecret: firstAccount.apiSecret,
        passphrase: firstAccount.passphrase,
        enabled: firstAccount.enabled,
      };

      setCurrentAccount(bitgetAccount);

      // Fetch account balance
      const balanceArray = await getAccountBalance(bitgetAccount);
      const balance = balanceArray.length > 0 ? balanceArray[0] : null;
      setAccountBalance(balance);

      // Fetch positions
      const positionsData = await getPositions(bitgetAccount);
      setPositions(positionsData);

      // Fetch orders
      const ordersData = await getOrders(bitgetAccount);
      setOrders(ordersData);

      console.log(
        `✅ Successfully loaded data for account: ${firstAccount.name}`,
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setApiError(errorMsg);
      console.error(
        `❌ Error fetching data for account ${firstAccount.name}:`,
        errorMsg,
      );
    } finally {
      setAccountLoading(false);
    }
  };

  // Load configuration on component mount
  useEffect(() => {
    const initConfig = async () => {
      setConfigLoading(true);
      try {
        const loadedConfig = await loadConfig();
        if (loadedConfig) {
          setConfig(loadedConfig);
          setSelectedSymbol(loadedConfig.settings.defaultSymbol);
        }
      } catch (error) {
        console.error('Failed to load configuration:', error);
      } finally {
        setConfigLoading(false);
      }
    };

    initConfig();
  }, []);

  // Load account data when config changes and set up auto-refresh
  useEffect(() => {
    if (config) {
      fetchAccountData();

      // Set up auto-refresh for account data every 10 seconds
      const accountInterval = setInterval(fetchAccountData, 10000);

      return () => {
        clearInterval(accountInterval);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  // Cancel order function
  const handleCancelOrder = async (order: BitgetOrder) => {
    if (!currentAccount) return;

    try {
      await cancelOrder(currentAccount, order.orderId, order.symbol);
      // Remove order from local state
      setOrders((prev) => prev.filter((o) => o.orderId !== order.orderId));
      console.log('✅ Order cancelled successfully:', order.orderId);
    } catch (error) {
      console.error('❌ Error cancelling order:', error);
      // Optionally show error message to user
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static">
        <Container maxWidth="lg">
          <Toolbar>
            <TrendingUp sx={{ mr: 2 }} />
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Bitget Hedger
            </Typography>
            <IconButton color="inherit">
              <Settings />
            </IconButton>
          </Toolbar>
        </Container>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Grid container spacing={3}>
          {/* Symbol Selection */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Symbol Selection
                </Typography>
                <FormControl fullWidth>
                  <Select
                    value={selectedSymbol}
                    onChange={(e) => setSelectedSymbol(e.target.value)}
                    sx={{ mb: 2 }}
                  >
                    <MenuItem value="BTCUSD.P">
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <SymbolIcon symbol="BTCUSD.P" />
                        BTCUSD.P
                      </Box>
                    </MenuItem>
                    <MenuItem value="ETHUSD.P">
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <SymbolIcon symbol="ETHUSD.P" />
                        ETHUSD.P
                      </Box>
                    </MenuItem>
                    <MenuItem value="BNBUSDT.P">
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <SymbolIcon symbol="BNBUSDT.P" />
                        BNBUSDT.P
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>
              </CardContent>
            </Card>
          </Grid>

          {/* Current Price */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 2,
                  }}
                >
                  <Typography variant="h6">Current Price</Typography>
                  <Chip
                    label={wsConnected ? 'LIVE' : 'OFFLINE'}
                    color={wsConnected ? 'success' : 'error'}
                    size="small"
                  />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <SymbolIcon symbol={selectedSymbol} />
                  <Typography variant="h4" color="primary">
                    $
                    {currentPrice.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Typography>
                </Box>
                {priceData[selectedSymbol] && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    <Chip
                      label={`${
                        priceData[selectedSymbol].change24h >= 0 ? '+' : ''
                      }${priceData[selectedSymbol].change24h.toFixed(2)}%`}
                      color={
                        priceData[selectedSymbol].change24h >= 0
                          ? 'success'
                          : 'error'
                      }
                      size="small"
                      icon={
                        priceData[selectedSymbol].change24h >= 0 ? (
                          <TrendingUp />
                        ) : (
                          <TrendingDown />
                        )
                      }
                    />
                    <Typography
                      variant="caption"
                      sx={{ ml: 2, color: 'text.secondary' }}
                    >
                      24h Change
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Configuration Status */}
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 2,
                  }}
                >
                  <Typography variant="h6">Configuration</Typography>
                  {configLoading && (
                    <Typography variant="caption" color="text.secondary">
                      Loading config...
                    </Typography>
                  )}
                </Box>

                {config ? (
                  <Box>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 1 }}
                    >
                      ✅ Configuration loaded successfully
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 1 }}
                    >
                      📁 Accounts found:{' '}
                      <strong>{config.accounts.length}</strong>
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 1 }}
                    >
                      🔑 Account credentials:{' '}
                      <strong>
                        {config.accounts.every(
                          (acc) =>
                            acc.apiKey && acc.apiSecret && acc.passphrase,
                        )
                          ? '***all configured***'
                          : 'Missing credentials'}
                      </strong>
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      🔄 Refresh interval:{' '}
                      <strong>{config.settings.refreshInterval}ms</strong>
                    </Typography>
                    {apiError && (
                      <Typography
                        variant="body2"
                        color="error.main"
                        sx={{ mt: 1, fontWeight: 'bold' }}
                      >
                        ❌ API Error: {apiError}
                      </Typography>
                    )}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    {configLoading
                      ? 'Loading configuration...'
                      : '❌ No configuration found'}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Account Overview */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 2,
                  }}
                >
                  <Typography variant="h6">Account Overview</Typography>
                  <IconButton
                    size="small"
                    onClick={fetchAccountData}
                    disabled={accountLoading}
                  >
                    <Refresh />
                  </IconButton>
                </Box>

                {accountBalance ? (
                  <>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 1 }}
                    >
                      Equity:{' '}
                      <strong>
                        $
                        {parseFloat(accountBalance.equity).toLocaleString(
                          'en-US',
                          { minimumFractionDigits: 2 },
                        )}
                      </strong>
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 1 }}
                    >
                      Available:{' '}
                      <strong>
                        $
                        {parseFloat(accountBalance.available).toLocaleString(
                          'en-US',
                          { minimumFractionDigits: 2 },
                        )}
                      </strong>
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 1 }}
                    >
                      Locked:{' '}
                      <strong>
                        $
                        {parseFloat(accountBalance.locked).toLocaleString(
                          'en-US',
                          { minimumFractionDigits: 2 },
                        )}
                      </strong>
                    </Typography>
                    {accountBalance.unrealizedPL && (
                      <Typography
                        variant="body2"
                        color={
                          parseFloat(accountBalance.unrealizedPL) >= 0
                            ? 'success.main'
                            : 'error.main'
                        }
                        sx={{ mb: 1 }}
                      >
                        Unrealized P&L:{' '}
                        <strong>
                          ${parseFloat(accountBalance.unrealizedPL).toFixed(2)}
                        </strong>
                      </Typography>
                    )}
                    <Typography variant="body2" color="text.secondary">
                      Risk Rate:{' '}
                      <strong>
                        {(
                          parseFloat(accountBalance.crossRiskRate) * 100
                        ).toFixed(2)}
                        %
                      </strong>
                    </Typography>
                  </>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    {accountLoading
                      ? 'Loading account data...'
                      : 'No account data available'}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Positions Overview */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <AccountBalanceWallet sx={{ mr: 1 }} />
                  <Typography variant="h6">Open Positions</Typography>
                </Box>

                {positions.length > 0 ? (
                  <>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 2 }}
                    >
                      Total Positions: <strong>{positions.length}</strong>
                    </Typography>
                    {positions.map((position, index) => (
                      <Paper
                        key={index}
                        sx={{ p: 2, mb: 1, bgcolor: 'grey.50' }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <Box>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 'bold' }}
                            >
                              {position.symbol.replace('_UMCBL', '')}
                            </Typography>
                            <Chip
                              label={position.holdSide.toUpperCase()}
                              color={
                                position.holdSide === 'long'
                                  ? 'success'
                                  : 'error'
                              }
                              size="small"
                              sx={{ mr: 1 }}
                            />
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Size: {position.total} | Avg: $
                              {parseFloat(position.averageOpenPrice).toFixed(2)}
                            </Typography>
                          </Box>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography
                              variant="body2"
                              color={
                                parseFloat(position.unrealizedPL) >= 0
                                  ? 'success.main'
                                  : 'error.main'
                              }
                              sx={{ fontWeight: 'bold' }}
                            >
                              ${parseFloat(position.unrealizedPL).toFixed(2)}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {position.leverage}x
                            </Typography>
                          </Box>
                        </Box>
                      </Paper>
                    ))}
                  </>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No open positions
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Open Orders */}
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Schedule sx={{ mr: 1 }} />
                  <Typography variant="h6">Open Orders</Typography>
                </Box>

                {orders.length > 0 ? (
                  <>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 2 }}
                    >
                      Active Orders: <strong>{orders.length}</strong>
                    </Typography>
                    {orders.map((order, index) => (
                      <Paper
                        key={index}
                        sx={{ p: 2, mb: 1, bgcolor: 'grey.50' }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <Box>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 'bold' }}
                            >
                              {order.symbol.replace('_UMCBL', '')} •{' '}
                              {order.orderType.toUpperCase()}
                            </Typography>
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                mt: 0.5,
                              }}
                            >
                              <Chip
                                label={order.side
                                  .replace('_', ' ')
                                  .toUpperCase()}
                                color={
                                  order.side.includes('long')
                                    ? 'success'
                                    : 'error'
                                }
                                size="small"
                              />
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                Size: {order.size} @ $
                                {parseFloat(order.price).toFixed(2)}
                              </Typography>
                            </Box>
                          </Box>
                          <Box
                            sx={{
                              textAlign: 'right',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                            }}
                          >
                            <Box>
                              <Typography
                                variant="body2"
                                sx={{ fontWeight: 'bold' }}
                              >
                                $
                                {(
                                  parseFloat(order.size) *
                                  parseFloat(order.price)
                                ).toFixed(2)}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {order.orderType} order
                              </Typography>
                            </Box>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleCancelOrder(order)}
                            >
                              <Cancel fontSize="small" />
                            </IconButton>
                          </Box>
                        </Box>
                      </Paper>
                    ))}
                  </>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No open orders
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

export default App;
