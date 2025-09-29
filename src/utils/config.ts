// Configuration types
export interface ConfigAccount {
  id: string;
  name: string;
  apiKey: string;
  apiSecret: string;
  passphrase: string;
  equity: number;
  enabled: boolean;
}

export interface Config {
  globalPassword: string;
  accounts: ConfigAccount[];
  settings: {
    apiBaseUrl: string;
    refreshInterval: number;
    defaultSymbol: string;
  };
}

// Load configuration from config.json
export const loadConfig = async (): Promise<Config | null> => {
  try {
    const response = await fetch('/config.json');
    if (!response.ok) {
      console.warn('Config file not found, using fallback configuration');
      return getFallbackConfig();
    }
    const config: Config = await response.json();
    return config;
  } catch (error) {
    console.error('Error loading config:', error);
    return getFallbackConfig();
  }
};

// Fallback configuration when config.json is not available
const getFallbackConfig = (): Config => ({
  globalPassword: '',
  accounts: [
    {
      id: '1',
      name: 'Demo Account 1',
      apiKey: 'demo-api-key-1',
      apiSecret: 'demo-api-secret-1',
      passphrase: 'demo-passphrase-1',
      equity: 1250.75,
      enabled: true,
    },
    {
      id: '2',
      name: 'Demo Account 2',
      apiKey: 'demo-api-key-2',
      apiSecret: 'demo-api-secret-2',
      passphrase: 'demo-passphrase-2',
      equity: 890.25,
      enabled: true,
    },
  ],
  settings: {
    apiBaseUrl: 'https://api.bitget.com',
    refreshInterval: 2000,
    defaultSymbol: 'BTCUSD.P',
  },
});

// Save configuration back to config.json (for development purposes)
export const saveConfig = async (config: Config): Promise<boolean> => {
  try {
    // In a real production app, this would need a backend endpoint
    // For development, we can't write directly to files from browser
    console.log('Configuration to save:', config);
    localStorage.setItem('bitget-config', JSON.stringify(config));
    return true;
  } catch (error) {
    console.error('Error saving config:', error);
    return false;
  }
};

// Load from localStorage as fallback
export const loadConfigFromStorage = (): Config | null => {
  try {
    const stored = localStorage.getItem('bitget-config');
    if (stored) {
      return JSON.parse(stored);
    }
    return null;
  } catch (error) {
    console.error('Error loading config from storage:', error);
    return null;
  }
};
