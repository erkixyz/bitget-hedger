import { useState, useEffect, useCallback } from 'react';
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
  Cancel,
  Schedule,
  Close,
  Clear,
  Dashboard,
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

// Helper function to convert display symbols to API symbols
const getApiSymbol = (displaySymbol: string): string => {
  const symbolMap: { [key: string]: string } = {
    'BTCUSD.P': 'BTCUSDT',
    'ETHUSD.P': 'ETHUSDT',
    'BNBUSDT.P': 'BNBUSDT',
  };
  return symbolMap[displaySymbol] || displaySymbol;
};

// Helper function to format numbers with space thousand separators
const formatNumber = (num: number, decimals: number = 2): string => {
  return num.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

function App() {
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSD.P');
  const [currentPrice, setCurrentPrice] = useState(0);
  const [priceData, setPriceData] = useState<{ [key: string]: PriceData }>({});
  const [wsConnected, setWsConnected] = useState(false);

  // Configuration
  const [config, setConfig] = useState<Config | null>(null);

  // Bitget account data for all accounts
  const [accountsData, setAccountsData] = useState<{
    [accountId: string]: {
      account: BitgetAccount;
      balance: BitgetAccountBalance | null;
      positions: BitgetPosition[];
      orders: BitgetOrder[];
      loading: boolean;
      error?: string;
    };
  }>({});

  // Real-time price data using WebSocket
  useEffect(() => {
    const symbols = [
      { api: 'BTCUSDT', display: 'BTCUSD.P' },
      { api: 'ETHUSDT', display: 'ETHUSD.P' },
      { api: 'BNBUSDT', display: 'BNBUSDT.P' },
    ];

    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let pingTimer: ReturnType<typeof setInterval> | null = null;

    const connectWebSocket = () => {
      try {
        // Bitget WebSocket endpoint for futures market data
        ws = new WebSocket('wss://ws.bitget.com/v2/ws/public');

        ws.onopen = () => {
          setWsConnected(true);

          // Subscribe to ticker channels using Bitget v2 format
          symbols.forEach((symbol) => {
            const subscription = {
              op: 'subscribe',
              args: [
                {
                  instType: 'USDT-FUTURES',
                  channel: 'ticker',
                  instId: symbol.api,
                },
              ],
            };

            ws?.send(JSON.stringify(subscription));
          });

          // Setup ping to keep connection alive
          pingTimer = setInterval(() => {
            if (ws?.readyState === WebSocket.OPEN) {
              ws.send('ping');
            }
          }, 30000);
        };

        ws.onmessage = (event) => {
          try {
            if (event.data === 'pong') return; // Handle pong response

            const data = JSON.parse(event.data);

            // Handle different Bitget response types
            if (data.event === 'error') {
              console.error('❌ WebSocket subscription error:', data);
              return;
            }

            if (data.event === 'subscribe') {
              return;
            }

            // Handle ticker data - Bitget v2 API format
            if (
              data.arg &&
              data.arg.channel === 'ticker' &&
              data.data &&
              Array.isArray(data.data)
            ) {
              const instId = data.arg.instId;
              const tickerData = data.data[0];

              // Find matching symbol
              const symbolInfo = symbols.find((s) => s.api === instId);
              if (!symbolInfo) {
                return;
              }

              const price = parseFloat(
                tickerData.lastPr || tickerData.last || tickerData.close || '0',
              );
              const change24h = parseFloat(
                tickerData.changeUtc24h ||
                  tickerData.chgUTC ||
                  tickerData.change24h ||
                  '0',
              );
              const volume24h = parseFloat(
                tickerData.volCcy24h ||
                  tickerData.baseVolume ||
                  tickerData.vol ||
                  '0',
              );

              setPriceData((prev) => ({
                ...prev,
                [symbolInfo.display]: {
                  symbol: symbolInfo.display,
                  price,
                  change24h,
                  volume24h,
                  lastUpdate: Date.now(),
                },
              }));

              // Update current price if this is the selected symbol
              if (symbolInfo.display === selectedSymbol) {
                setCurrentPrice(price);
              }
            }
          } catch (error) {
            console.error(
              '❌ Error parsing WebSocket message:',
              error,
              event.data,
            );
          }
        };

        ws.onclose = () => {
          setWsConnected(false);

          if (pingTimer) {
            clearInterval(pingTimer);
            pingTimer = null;
          }

          // Attempt to reconnect after 5 seconds
          reconnectTimer = setTimeout(() => {
            connectWebSocket();
          }, 3000);
        };

        ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          setWsConnected(false);
        };
      } catch (error) {
        console.error('❌ Error creating WebSocket:', error);
        setWsConnected(false);
      }
    };

    // Initial connection
    connectWebSocket();

    // Cleanup function
    return () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      if (pingTimer) {
        clearInterval(pingTimer);
      }
      if (ws) {
        ws.close();
      }
    };
  }, [selectedSymbol]);

  // Update current price when symbol changes
  useEffect(() => {
    const symbolPriceData = priceData[selectedSymbol];
    if (symbolPriceData) {
      setCurrentPrice(symbolPriceData.price);
    }
  }, [selectedSymbol, priceData]);

  // Fetch account data from Bitget API for all accounts
  const fetchAccountData = useCallback(async () => {
    if (!config || config.accounts.length === 0) return;

    const enabledAccounts = config.accounts.filter((acc) => acc.enabled);
    if (enabledAccounts.length === 0) return;

    // Set loading state for all accounts
    setAccountsData((prev) => {
      const newData = { ...prev };
      enabledAccounts.forEach((account) => {
        newData[account.id] = {
          ...newData[account.id],
          account: {
            id: account.id,
            name: account.name,
            apiKey: account.apiKey,
            apiSecret: account.apiSecret,
            passphrase: account.passphrase,
            enabled: account.enabled,
          },
          loading: true,
          balance: null,
          positions: [],
          orders: [],
        };
      });
      return newData;
    });

    // Fetch data for each account
    for (const account of enabledAccounts) {
      try {
        const bitgetAccount: BitgetAccount = {
          id: account.id,
          name: account.name,
          apiKey: account.apiKey,
          apiSecret: account.apiSecret,
          passphrase: account.passphrase,
          enabled: account.enabled,
        };

        // Fetch account balance
        const balanceArray = await getAccountBalance(bitgetAccount);
        const balance = balanceArray.length > 0 ? balanceArray[0] : null;

        // Fetch positions
        const positionsData = await getPositions(bitgetAccount);

        // Fetch orders
        const ordersData = await getOrders(bitgetAccount);

        // Update account data
        setAccountsData((prev) => ({
          ...prev,
          [account.id]: {
            ...prev[account.id],
            balance,
            positions: positionsData,
            orders: ordersData,
            loading: false,
          },
        }));
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : 'Unknown error';

        // Set error state for this account
        setAccountsData((prev) => ({
          ...prev,
          [account.id]: {
            ...prev[account.id],
            loading: false,
            error: errorMsg,
          },
        }));

        console.error(
          `❌ Error fetching data for account ${account.name}:`,
          errorMsg,
        );
      }
    }
  }, [config]);

  // Refresh account data when symbol changes
  useEffect(() => {
    if (config) {
      fetchAccountData();
    }
  }, [selectedSymbol, config, fetchAccountData]);

  // Load configuration on component mount
  useEffect(() => {
    const initConfig = async () => {
      try {
        const loadedConfig = await loadConfig();
        if (loadedConfig) {
          setConfig(loadedConfig);
          setSelectedSymbol(loadedConfig.settings.defaultSymbol);
        }
      } catch (error) {
        console.error('Failed to load configuration:', error);
      }
    };

    initConfig();
  }, []);

  // Load account data when config changes and set up auto-refresh
  useEffect(() => {
    if (config) {
      fetchAccountData();

      // Set up auto-refresh for account data every 30 seconds
      const accountInterval = setInterval(() => {
        fetchAccountData();
      }, 30000);

      return () => {
        clearInterval(accountInterval);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  // Cancel order function
  const handleCancelOrder = async (order: BitgetOrder, accountId: string) => {
    const accountData = accountsData[accountId];
    if (!accountData) return;

    try {
      await cancelOrder(accountData.account, order.orderId, order.symbol);
      // Remove order from local state
      setAccountsData((prev) => ({
        ...prev,
        [accountId]: {
          ...prev[accountId],
          orders: prev[accountId].orders.filter(
            (o) => o.orderId !== order.orderId,
          ),
        },
      }));
    } catch (error) {
      console.error('❌ Error cancelling order:', error);
      // Optionally show error message to user
    }
  };

  // Batch cancel all orders for all accounts
  const handleCancelAllOrders = async () => {
    const enabledAccounts = Object.values(accountsData).filter(
      (data) => data.account.enabled,
    );

    for (const accountData of enabledAccounts) {
      for (const order of accountData.orders) {
        try {
          await cancelOrder(accountData.account, order.orderId, order.symbol);
        } catch (error) {
          console.error(`❌ Failed to cancel order ${order.orderId}:`, error);
        }
      }
    }

    // Refresh data after batch cancel
    fetchAccountData();
  };

  // Calculate summary data across all accounts
  const getSummaryData = () => {
    const enabledAccounts = Object.values(accountsData).filter(
      (data) => data.account.enabled,
    );

    let totalBalance = 0;
    let totalPnL = 0;
    let totalPositions = 0;
    let totalOrders = 0;
    let totalLongPositions = 0;
    let totalShortPositions = 0;

    enabledAccounts.forEach((accountData) => {
      // Balance
      if (accountData.balance) {
        totalBalance += parseFloat(accountData.balance.usdtEquity || '0');
      }

      // Positions
      accountData.positions.forEach((position) => {
        totalPositions++;
        totalPnL += parseFloat(position.unrealizedPL || '0');

        if (position.holdSide === 'long') {
          totalLongPositions++;
        } else {
          totalShortPositions++;
        }
      });

      // Orders
      totalOrders += accountData.orders.length;
    });

    return {
      totalBalance,
      totalPnL,
      totalPositions,
      totalOrders,
      totalLongPositions,
      totalShortPositions,
      accountsCount: enabledAccounts.length,
    };
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static">
        <Container maxWidth="lg">
          <Toolbar>
            <TrendingUp sx={{ mr: 2 }} />
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Bitget Hedger{' '}
              {config &&
                `(${config.accounts.filter((acc) => acc.enabled).length})`}
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

          {/* Overall Summary Block */}
          <Grid size={{ xs: 12 }}>
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
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Dashboard sx={{ mr: 1 }} />
                    <Typography variant="h6">Portfolio Overview</Typography>
                  </Box>
                </Box>

                {(() => {
                  const summary = getSummaryData();
                  return (
                    <>
                      <Grid container spacing={3}>
                        <Grid size={{ xs: 6, md: 3 }}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography
                              variant="h5"
                              sx={{ fontWeight: 'bold' }}
                            >
                              ${formatNumber(summary.totalBalance)}
                            </Typography>
                            <Typography variant="body2">
                              Total Balance
                            </Typography>
                          </Box>
                        </Grid>

                        <Grid size={{ xs: 6, md: 3 }}>
                          <Box
                            sx={{ textAlign: 'center', position: 'relative' }}
                          >
                            <Typography
                              variant="h5"
                              sx={{
                                fontWeight: 'bold',
                                color:
                                  summary.totalPnL >= 0 ? '#4caf50' : '#f44336',
                              }}
                            >
                              {summary.totalPnL >= 0 ? '+' : ''}$
                              {formatNumber(Math.abs(summary.totalPnL))}
                            </Typography>
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 1,
                              }}
                            >
                              <Typography variant="body2">Total P&L</Typography>
                              <IconButton
                                size="small"
                                color="error"
                                disabled={
                                  summary.totalPositions === 0 &&
                                  summary.totalOrders === 0
                                }
                                title="Close All Positions & Cancel All Orders"
                                sx={{ p: 0.25 }}
                              >
                                <Close fontSize="inherit" />
                              </IconButton>
                            </Box>
                          </Box>
                        </Grid>

                        <Grid size={{ xs: 6, md: 3 }}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography
                              variant="h5"
                              sx={{ fontWeight: 'bold' }}
                            >
                              {summary.totalPositions}
                            </Typography>
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 1,
                              }}
                            >
                              <Typography variant="body2">
                                Positions ({summary.totalLongPositions}L/
                                {summary.totalShortPositions}S)
                              </Typography>
                              <IconButton
                                size="small"
                                color="error"
                                disabled={summary.totalPositions === 0}
                                title="Close All Positions"
                                sx={{ p: 0.25 }}
                              >
                                <Close fontSize="inherit" />
                              </IconButton>
                            </Box>
                          </Box>
                        </Grid>

                        <Grid size={{ xs: 6, md: 3 }}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography
                              variant="h5"
                              sx={{ fontWeight: 'bold' }}
                            >
                              {summary.totalOrders}
                            </Typography>
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 1,
                              }}
                            >
                              <Typography variant="body2">
                                Open Orders
                              </Typography>
                              <IconButton
                                size="small"
                                color="warning"
                                onClick={handleCancelAllOrders}
                                disabled={summary.totalOrders === 0}
                                title="Cancel All Orders"
                                sx={{ p: 0.25 }}
                              >
                                <Clear fontSize="inherit" />
                              </IconButton>
                            </Box>
                          </Box>
                        </Grid>
                      </Grid>
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          </Grid>

          {/* Account Sections - one for each enabled account */}
          {Object.values(accountsData).map((accountData) => (
            <Grid key={accountData.account.id} size={{ xs: 12 }}>
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
                    <Typography variant="h6">
                      {accountData.account.name} - Account Overview
                    </Typography>
                  </Box>

                  <Grid container spacing={3}>
                    {/* Account Balance */}
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Box sx={{ mb: 2 }}>
                        <Typography
                          variant="h6"
                          sx={{ mb: 1, display: 'flex', alignItems: 'center' }}
                        >
                          <AccountBalanceWallet sx={{ mr: 1 }} />
                          Balance
                        </Typography>
                        {accountData.loading ? (
                          <Typography variant="body2" color="text.secondary">
                            Loading...
                          </Typography>
                        ) : accountData.error ? (
                          <Typography variant="body2" color="error.main">
                            Error: {accountData.error}
                          </Typography>
                        ) : accountData.balance ? (
                          <>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ mb: 0.5 }}
                            >
                              Equity:{' '}
                              <strong>
                                $
                                {parseFloat(
                                  accountData.balance.equity,
                                ).toLocaleString('en-US', {
                                  minimumFractionDigits: 2,
                                })}
                              </strong>
                            </Typography>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ mb: 0.5 }}
                            >
                              Available:{' '}
                              <strong>
                                $
                                {parseFloat(
                                  accountData.balance.available,
                                ).toLocaleString('en-US', {
                                  minimumFractionDigits: 2,
                                })}
                              </strong>
                            </Typography>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ mb: 0.5 }}
                            >
                              Locked:{' '}
                              <strong>
                                $
                                {parseFloat(
                                  accountData.balance.locked,
                                ).toLocaleString('en-US', {
                                  minimumFractionDigits: 2,
                                })}
                              </strong>
                            </Typography>
                            {accountData.balance.unrealizedPL && (
                              <Typography
                                variant="body2"
                                color={
                                  parseFloat(
                                    accountData.balance.unrealizedPL,
                                  ) >= 0
                                    ? 'success.main'
                                    : 'error.main'
                                }
                                sx={{ fontWeight: 'bold' }}
                              >
                                Unrealized P&L: $
                                {parseFloat(
                                  accountData.balance.unrealizedPL,
                                ).toFixed(2)}
                              </Typography>
                            )}
                          </>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            No balance data
                          </Typography>
                        )}
                      </Box>
                    </Grid>

                    {/* Positions */}
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="h6" sx={{ mb: 1 }}>
                          Positions for {selectedSymbol}
                        </Typography>
                        {(() => {
                          if (accountData.loading) {
                            return (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                Loading...
                              </Typography>
                            );
                          }

                          const selectedApiSymbol =
                            getApiSymbol(selectedSymbol);
                          const filteredPositions =
                            accountData.positions.filter(
                              (position) =>
                                position.symbol === selectedApiSymbol &&
                                position.total &&
                                parseFloat(position.total) !== 0,
                            );

                          return filteredPositions.length > 0 ? (
                            filteredPositions.map((position, index) => (
                              <Paper
                                key={index}
                                sx={{ p: 1.5, mb: 1, bgcolor: 'grey.50' }}
                              >
                                <Box
                                  sx={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                  }}
                                >
                                  <Box>
                                    <Chip
                                      label={position.holdSide.toUpperCase()}
                                      color={
                                        position.holdSide === 'long'
                                          ? 'success'
                                          : 'error'
                                      }
                                      size="small"
                                      sx={{ mb: 0.5 }}
                                    />
                                    <Typography
                                      variant="caption"
                                      display="block"
                                      color="text.secondary"
                                    >
                                      Size: {position.total}
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      display="block"
                                      color="text.secondary"
                                    >
                                      Avg: $
                                      {parseFloat(
                                        position.averageOpenPrice,
                                      ).toFixed(2)}
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
                                      $
                                      {parseFloat(
                                        position.unrealizedPL,
                                      ).toFixed(2)}
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
                            ))
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              No positions for {selectedSymbol}
                            </Typography>
                          );
                        })()}
                      </Box>
                    </Grid>

                    {/* Orders */}
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Box sx={{ mb: 2 }}>
                        <Typography
                          variant="h6"
                          sx={{ mb: 1, display: 'flex', alignItems: 'center' }}
                        >
                          <Schedule sx={{ mr: 1 }} />
                          Orders for {selectedSymbol}
                        </Typography>
                        {(() => {
                          if (accountData.loading) {
                            return (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                Loading...
                              </Typography>
                            );
                          }

                          const selectedApiSymbol =
                            getApiSymbol(selectedSymbol);
                          const filteredOrders = accountData.orders.filter(
                            (order) => order.symbol === selectedApiSymbol,
                          );

                          return filteredOrders.length > 0 ? (
                            filteredOrders.map((order, index) => (
                              <Paper
                                key={index}
                                sx={{ p: 1.5, mb: 1, bgcolor: 'grey.50' }}
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
                                      {order.orderType.toUpperCase()}
                                    </Typography>
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
                                      sx={{ mb: 0.5 }}
                                    />
                                    <Typography
                                      variant="caption"
                                      display="block"
                                      color="text.secondary"
                                    >
                                      Size: {order.size} @ $
                                      {parseFloat(order.price).toFixed(2)}
                                    </Typography>
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
                                    </Box>
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() =>
                                        handleCancelOrder(
                                          order,
                                          accountData.account.id,
                                        )
                                      }
                                    >
                                      <Cancel fontSize="small" />
                                    </IconButton>
                                  </Box>
                                </Box>
                              </Paper>
                            ))
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              No orders for {selectedSymbol}
                            </Typography>
                          );
                        })()}
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}

export default App;
