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
      console.error(
        '❌ Config file not found at /config.json - status:',
        response.status,
      );
      throw new Error(`Config file not found: ${response.status}`);
    }
    const config: Config = await response.json();

    return config;
  } catch (error) {
    console.error('❌ Error loading config:', error);
    throw error; // Don't use fallback - fail instead
  }
};

// Save configuration to localStorage as backup
export const saveConfigToStorage = (config: Config): void => {
  try {
    localStorage.setItem('bitget-hedger-config', JSON.stringify(config));
  } catch (error) {
    console.error('Error saving config to localStorage:', error);
  }
};

// Load configuration from localStorage as backup
export const loadConfigFromStorage = (): Config | null => {
  try {
    const stored = localStorage.getItem('bitget-hedger-config');
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Error loading config from localStorage:', error);
    return null;
  }
};

// Save configuration back to config.json (for development purposes)
export const saveConfig = async (config: Config): Promise<boolean> => {
  try {
    // In a real production app, this would need a backend endpoint
    // For development, we can't write directly to files from browser

    localStorage.setItem('bitget-config', JSON.stringify(config));
    return true;
  } catch (error) {
    console.error('Error saving config:', error);
    return false;
  }
};
