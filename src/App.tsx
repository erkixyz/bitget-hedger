import { useState, useEffect } from 'react';
import { loadConfig, type Config } from './utils/config';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Grid,
  Paper,
  IconButton,
  Container,
  FormControl,
  Select,
  MenuItem,
  Divider,
  Chip,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Settings,
  Close,
  CallSplit,
  AccountBalanceWallet,
  Refresh,
  Cancel,
  Schedule,
} from '@mui/icons-material';

// Interfaces for Bitget API responses
interface AccountData {
  marginCoin: string;
  locked: string;
  available: string;
  equity: string;
  usdtEquity: string;
  unrealizedPL: string | null;
  crossRiskRate: string;
}

interface Position {
  symbol: string;
  marginCoin: string;
  holdSide: string;
  total: string;
  available: string;
  averageOpenPrice: string;
  unrealizedPL: string;
  leverage: number;
  marketPrice: string;
}

interface Order {
  orderId: string;
  symbol: string;
  marginCoin: string;
  size: string;
  price: string;
  side: string;
  orderType: string;
  state: string;
  leverage: string;
  cTime: string;
  filledQty: string;
}

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

// Legacy interfaces for mock data - keeping for compatibility
interface MockPosition {
  id: string;
  side: 'long' | 'short';
  size: number;
  entryPrice: number;
  pnl: number;
}

interface Account {
  id: string;
  name: string;
  apiKey: string;
  equity: number;
  positions: MockPosition[];
}

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

  // Bitget account data
  const [accountData, setAccountData] = useState<AccountData | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [accountLoading, setAccountLoading] = useState(false);

  const [accounts, setAccounts] = useState<Account[]>([]);

  // Update accounts when config is loaded
  useEffect(() => {
    if (config) {
      const configAccounts: Account[] = config.accounts
        .filter((acc) => acc.enabled)
        .map((acc) => ({
          id: acc.id,
          name: acc.name,
          apiKey: acc.apiKey,
          equity: acc.equity,
          positions: [
            // Mock positions for demo - in real app these would come from API
            {
              id: `pos${acc.id}-1`,
              side: 'long' as const,
              size: 0.5,
              entryPrice: 65420,
              pnl: 125.5,
            },
            {
              id: `pos${acc.id}-2`,
              side: 'short' as const,
              size: 0.2,
              entryPrice: 65800,
              pnl: -45.2,
            },
          ],
        }));
      setAccounts(configAccounts);
    }
  }, [config]);

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
    setAccountLoading(true);
    try {
      // For demo purposes, using mock data that matches Bitget API structure
      // In real implementation, this would make authenticated API calls

      // Mock account data based on Bitget API response format
      const mockAccountData: AccountData = {
        marginCoin: 'USDT',
        locked: '150.25',
        available: '2849.75',
        equity: '3000.00',
        usdtEquity: '3000.00',
        unrealizedPL: '25.50',
        crossRiskRate: '0.02',
      };

      // Mock positions data
      const mockPositions: Position[] = [
        {
          symbol: 'BTCUSDT_UMCBL',
          marginCoin: 'USDT',
          holdSide: 'long',
          total: '0.5',
          available: '0.5',
          averageOpenPrice: '65420.5',
          unrealizedPL: '125.50',
          leverage: 10,
          marketPrice: '65671.0',
        },
        {
          symbol: 'ETHUSDT_UMCBL',
          marginCoin: 'USDT',
          holdSide: 'short',
          total: '2.0',
          available: '2.0',
          averageOpenPrice: '3820.25',
          unrealizedPL: '-45.25',
          leverage: 5,
          marketPrice: '3797.50',
        },
      ];

      // Mock orders data based on Bitget API response format
      const mockOrders: Order[] = [
        {
          orderId: '1044911928892862465',
          symbol: 'BTCUSDT_UMCBL',
          marginCoin: 'USDT',
          size: '0.1',
          price: '64500.00',
          side: 'open_long',
          orderType: 'limit',
          state: 'new',
          leverage: '10',
          cTime: '1693968404408',
          filledQty: '0',
        },
        {
          orderId: '1044911928892862466',
          symbol: 'ETHUSDT_UMCBL',
          marginCoin: 'USDT',
          size: '1.0',
          price: '3750.00',
          side: 'open_short',
          orderType: 'limit',
          state: 'new',
          leverage: '5',
          cTime: '1693968504408',
          filledQty: '0',
        },
        {
          orderId: '1044911928892862467',
          symbol: 'BTCUSDT_UMCBL',
          marginCoin: 'USDT',
          size: '0.05',
          price: '66000.00',
          side: 'close_long',
          orderType: 'limit',
          state: 'new',
          leverage: '10',
          cTime: '1693968604408',
          filledQty: '0',
        },
      ];

      setAccountData(mockAccountData);
      setPositions(mockPositions);
      setOrders(mockOrders);
    } catch (error) {
      console.error('Error fetching account data:', error);
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

  // Load account data on component mount
  useEffect(() => {
    fetchAccountData();
  }, []);

  // Cancel order function
  const handleCancelOrder = async (orderId: string) => {
    try {
      // In real implementation, this would make API call to cancel order
      // For demo purposes, just remove from local state
      setOrders((prev) => prev.filter((order) => order.orderId !== orderId));
      console.log('Order cancelled:', orderId);
    } catch (error) {
      console.error('Error cancelling order:', error);
    }
  };

  const handleClosePosition = (accountId: string, positionId: string) => {
    setAccounts((prev) =>
      prev.map((account) =>
        account.id === accountId
          ? {
              ...account,
              positions: account.positions.filter(
                (pos) => pos.id !== positionId,
              ),
            }
          : account,
      ),
    );
  };

  const handlePartialClose = (accountId: string, positionId: string) => {
    setAccounts((prev) =>
      prev.map((account) =>
        account.id === accountId
          ? {
              ...account,
              positions: account.positions.map((pos) =>
                pos.id === positionId ? { ...pos, size: pos.size / 2 } : pos,
              ),
            }
          : account,
      ),
    );
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
                      🔑 Global password:{' '}
                      <strong>
                        {config.globalPassword ? '***configured***' : 'Not set'}
                      </strong>
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      🔄 Refresh interval:{' '}
                      <strong>{config.settings.refreshInterval}ms</strong>
                    </Typography>
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

                {accountData ? (
                  <>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 1 }}
                    >
                      Equity:{' '}
                      <strong>
                        $
                        {parseFloat(accountData.equity).toLocaleString(
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
                        {parseFloat(accountData.available).toLocaleString(
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
                        {parseFloat(accountData.locked).toLocaleString(
                          'en-US',
                          { minimumFractionDigits: 2 },
                        )}
                      </strong>
                    </Typography>
                    {accountData.unrealizedPL && (
                      <Typography
                        variant="body2"
                        color={
                          parseFloat(accountData.unrealizedPL) >= 0
                            ? 'success.main'
                            : 'error.main'
                        }
                        sx={{ mb: 1 }}
                      >
                        Unrealized P&L:{' '}
                        <strong>
                          ${parseFloat(accountData.unrealizedPL).toFixed(2)}
                        </strong>
                      </Typography>
                    )}
                    <Typography variant="body2" color="text.secondary">
                      Risk Rate:{' '}
                      <strong>
                        {(parseFloat(accountData.crossRiskRate) * 100).toFixed(
                          2,
                        )}
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
                                {order.leverage}x leverage
                              </Typography>
                            </Box>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleCancelOrder(order.orderId)}
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

          {/* Legacy Accounts Container */}
          <Grid size={{ xs: 12 }}>
            <Typography variant="h5" sx={{ mb: 3 }}>
              Mock Accounts (Demo)
            </Typography>
            <Grid container spacing={2}>
              {accounts.map((account) => (
                <Grid key={account.id} size={{ xs: 12, md: 6 }}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 2 }}>
                        {account.name}
                      </Typography>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 1 }}
                      >
                        Equity:{' '}
                        <strong>
                          $
                          {account.equity.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                          })}
                        </strong>
                      </Typography>

                      <Divider sx={{ my: 2 }} />

                      <Typography variant="subtitle1" sx={{ mb: 2 }}>
                        Positions ({account.positions.length})
                      </Typography>

                      {account.positions.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                          No open positions
                        </Typography>
                      ) : (
                        account.positions.map((position) => (
                          <Paper
                            key={position.id}
                            sx={{ p: 2, mb: 1, bgcolor: 'grey.50' }}
                          >
                            <Box
                              sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                mb: 1,
                              }}
                            >
                              <Box>
                                <Chip
                                  label={position.side.toUpperCase()}
                                  size="small"
                                  color={
                                    position.side === 'long'
                                      ? 'success'
                                      : 'error'
                                  }
                                  sx={{ mb: 1 }}
                                />
                                <Typography variant="body2">
                                  Size: {position.size} | Entry: $
                                  {position.entryPrice.toLocaleString()}
                                </Typography>
                                <Typography
                                  variant="body2"
                                  color={
                                    position.pnl >= 0
                                      ? 'success.main'
                                      : 'error.main'
                                  }
                                  sx={{ fontWeight: 'bold' }}
                                >
                                  PnL: ${position.pnl.toFixed(2)}
                                </Typography>
                              </Box>

                              <Box
                                sx={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: 1,
                                }}
                              >
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="error"
                                  onClick={() =>
                                    handleClosePosition(account.id, position.id)
                                  }
                                  startIcon={<Close />}
                                >
                                  Close
                                </Button>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() =>
                                    handlePartialClose(account.id, position.id)
                                  }
                                  startIcon={<CallSplit />}
                                >
                                  Partial
                                </Button>
                              </Box>
                            </Box>
                          </Paper>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

export default App;
