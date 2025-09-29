# Bitget Hedger

A React-based trading dashboard for managing Bitget futures trading accounts with hedging capabilities.

## Features

- 📊 Real-time price monitoring for multiple cryptocurrency pairs
- 💰 Account balance and equity tracking
- 📋 Position management with P&L display
- 📝 Open orders monitoring and cancellation
- 🔐 Secure configuration management
- 🔄 Multi-account support

## Setup

### 1. Clone the repository
```bash
git clone <repository-url>
cd bitget-hedger
npm install
```

### 2. Configuration Setup

The application uses a configuration file to manage API keys and sensitive data securely.

1. Copy the example configuration:
```bash
cp config.example.json config.json
```

2. Edit `config.json` with your Bitget API credentials:
```json
{
  "globalPassword": "your-secure-password",
  "accounts": [
    {
      "id": "1",
      "name": "My Trading Account",
      "apiKey": "your-bitget-api-key",
      "apiSecret": "your-bitget-api-secret",
      "passphrase": "your-bitget-passphrase",
      "equity": 0,
      "enabled": true
    }
  ],
  "settings": {
    "apiBaseUrl": "https://api.bitget.com",
    "refreshInterval": 2000,
    "defaultSymbol": "BTCUSD.P"
  }
}
```

### 3. Bitget API Setup

1. Log in to [Bitget](https://www.bitget.com/)
2. Go to API Management section
3. Create a new API key with required permissions:
   - **Read-Only**: For fetching account data and positions
   - **Trade**: For placing and canceling orders (if needed)
4. Copy the API Key, Secret Key, and Passphrase to your `config.json`peScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
