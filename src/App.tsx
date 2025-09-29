import { useState, useEffect } from 'react';
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
  TextField,
  Divider,
  Chip,
} from '@mui/material';
import {
  TrendingUp,
  Settings,
  Close,
  CallSplit,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';

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

interface Position {
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
  positions: Position[];
}

function App() {
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSD.P');
  const [currentPrice, setCurrentPrice] = useState(0);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([
    {
      id: '1',
      name: 'Account 1',
      apiKey: 'your-api-key-1',
      equity: 1250.75,
      positions: [
        { id: 'pos1', side: 'long', size: 0.5, entryPrice: 65420, pnl: 125.5 },
        { id: 'pos2', side: 'short', size: 0.2, entryPrice: 65800, pnl: -45.2 },
      ],
    },
    {
      id: '2',
      name: 'Account 2',
      apiKey: 'your-api-key-2',
      equity: 890.25,
      positions: [
        { id: 'pos3', side: 'long', size: 1.0, entryPrice: 65300, pnl: 89.75 },
      ],
    },
  ]);

  // Simulate price updates
  useEffect(() => {
    const prices = {
      'BTCUSD.P': 65487.25,
      'ETHUSD.P': 2634.18,
      'BNBUSDT.P': 584.95,
    };
    setCurrentPrice(prices[selectedSymbol as keyof typeof prices]);

    const interval = setInterval(() => {
      const basePrice = prices[selectedSymbol as keyof typeof prices];
      const variation = (Math.random() - 0.5) * 0.02; // ±1% variation
      setCurrentPrice(basePrice * (1 + variation));
    }, 2000);

    return () => clearInterval(interval);
  }, [selectedSymbol]);

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
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Current Price
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <SymbolIcon symbol={selectedSymbol} />
                  <Typography variant="h4" color="primary">
                    $
                    {currentPrice.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Global Password */}
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Global Password
                </Typography>
                <TextField
                  fullWidth
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password for all accounts"
                  InputProps={{
                    endAdornment: (
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    ),
                  }}
                />
              </CardContent>
            </Card>
          </Grid>

          {/* Accounts Container */}
          <Grid size={{ xs: 12 }}>
            <Typography variant="h5" sx={{ mb: 3 }}>
              Accounts
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
