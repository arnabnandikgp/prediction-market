# Prediction Market

A decentralized prediction market built on Solana using the Anchor framework. This project allows users to create and participate in prediction markets where they can bet on binary outcomes and collect rewards based on the resolution.

## 🚀 Features

- **Market Creation**: Create prediction markets with custom names, descriptions, and expiration dates
- **Binary Betting**: Place bets on binary outcomes (Yes/No scenarios)
- **Conditional Tokens**: Uses conditional tokens to represent market positions
- **Automated Market Making**: Built-in AMM functionality for liquidity provision
- **Market Resolution**: Admin-controlled market resolution with reward distribution
- **Permission System**: Role-based access control for market administration

## 🏗️ Architecture

### Core Components

- **Market Program**: Main program handling market operations, vault management, and conditional token minting
- **Oracle Adapter Contract**: Handles external data feeds for binary outcome market resolution (e.g., will BTC price go up or down after a stipulated time)
- **Secondary Market Integration**: Token conversion between YES/NO positions happens via Raydium CP-AMM, handled by separate backend code with dedicated client-side implementation

### Key Data Structures

- **MarketConfig**: Stores market metadata and configuration
- **VaultState**: Manages collateral and conditional token balances
- **Permission**: Handles access control for admin functions

## 🔄 How It Works

### 1. **Buying Into a Market (buy_bet)**
When you call `buy_bet` with collateral:
- Your collateral is deposited into the vault
- You receive equal amounts of **BOTH** YES tokens (CT1) and NO tokens (CT2)
- Example: Deposit 100 USDC → Receive 100 CT1 + 100 CT2

### 2. **Trading Positions (Secondary Market)**
To take a directional position (e.g., only YES or only NO):
- Trade your unwanted tokens on the **Raydium CP-AMM** secondary market
- Example: Sell your 100 CT2 (NO) tokens to buy more CT1 (YES) tokens
- This secondary market logic is handled by separate backend and client code

### 3. **Market Resolution (resolve_market)**
Based on binary questions (e.g., "Will BTC price be above $100k at 12:00 UTC?"):
- admin calls the **oracle_adapter_contract** after the expiration time which in turn calles the `resolve_market` with the result.
- Oracle determines which token (CT1 or CT2) is the winning token
- Only winning token holders can redeem collateral

### 4. **Collecting Rewards (get_reward)**
After market resolution:
- Winning token holders redeem their tokens for collateral at 1:1 ratio
- Example: If CT1 wins and you hold 150 CT1 → Redeem for 150 USDC

## 📋 Prerequisites

- [Rust](https://rustup.rs/) (latest stable version)
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools) (v1.18+)
- [Anchor Framework](https://www.anchor-lang.com/docs/installation) (v0.31.1)
- [Node.js](https://nodejs.org/) (v16+)
- [Yarn](https://yarnpkg.com/) package manager

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd prediction-market
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the programs**
   ```bash
   anchor build
   ```

## 🧪 Testing

Run the test suite:
```bash
anchor test
```

## 📖 Usage

### Creating a Market

```typescript
// Create a new prediction market
const marketConfig = await program.methods
  .createMarketConfig(
    1, // index
    "Will Bitcoin reach $100k?", // name
    "Binary prediction on Bitcoin price", // description
    new anchor.BN(Date.now() + 86400000) // expiration (24 hours)
  )
  .rpc();
```

### Placing a Bet

```typescript
// Buy bet: Deposits collateral and mints equal amounts of BOTH YES and NO tokens (CT1 and CT2)
// This creates a complete set of conditional tokens representing both possible outcomes
const buyTx = await program.methods
  .buyBet(new anchor.BN(1000000)) // collateral amount - mints equal amount of both tokens
  .accounts({
    bettor: user.publicKey,
    // ... other required accounts
  })
  .rpc();

// Note: To convert between YES and NO tokens or to trade them, 
// use the secondary market via Raydium CP-AMM (handled separately)
```

### Collecting Rewards

```typescript
// Collect rewards after market resolution
const rewardTx = await program.methods
  .getReward(new anchor.BN(1000000)) // reward amount
  .accounts({
    bettor: user.publicKey,
    // ... other required accounts
  })
  .rpc();
```

## 🔧 Program Instructions

### Core Functions

- `create_market_config`: Initialize a new prediction market for binary outcomes
- `initialize`: Set up market vault and conditional tokens (CT1/CT2 representing YES/NO)
- `buy_bet`: Deposit collateral and mint equal amounts of BOTH YES and NO tokens
- `sell_bet`: Burn equal amounts of both tokens to redeem collateral (exit a complete position)
- `get_reward`: Collect rewards after market resolution using winning tokens
- `resolve_market`: Admin function to resolve binary outcome markets (e.g., did BTC price go up or down after the stipulated time). Works with oracle_adapter_contract for external data feeds.

### Admin Functions

- `create_permissioned_pda`: Create admin permission account
- `update_market_config`: Modify market parameters
- `close_permissioned_pda`: Clean up admin accounts

## 🏛️ Program IDs

- **Market Program**: `9iCxo1nJnDCtZTyKqFKc5PCFmfiezNnXCnycCrYq1GVL`
- **AMM Program**: `8ymbn5nw6fKBEeWoSo1dfMZH45jrotvsmv4UCZnFFUfa`
- **Oracle Adapter**: `CKGRJrwnWayKCAUzYvhF67eHkyD45uKFd8p8dYaXQ742`
- **Prediction Market**: `6rhwmqAZGHZhePX15dDRjrAtXNx4GcLS2XM1cVXmHBe`

## 🔒 Security Features

- **Access Control**: Role-based permissions for admin functions
- **Math Safety**: Overflow protection for all calculations
- **Account Validation**: Comprehensive account ownership checks
- **Market Resolution**: Controlled resolution process with proper validation

## 📁 Project Structure

```
prediction-market/
├── programs/
│   ├── market_program/              # Main market logic
│   │   ├── src/
│   │   │   ├── instructions/        # Market operations (buy_bet, sell_bet, etc.)
│   │   │   ├── states/              # VaultState, MarketConfig, Permission
│   │   │   ├── utils/               # Helper functions
│   │   │   ├── error.rs             # Custom error codes
│   │   │   └── lib.rs               # Program entry point
│   │   └── Cargo.toml
│   └── oracle_adapter_contract/     # Binary outcome oracle integration
│       ├── src/
│       │   ├── instructions/        # Oracle data feed handling
│       │   ├── states/              # Oracle state management
│       │   ├── errors.rs            # Oracle-specific errors
│       │   └── lib.rs               # Oracle program entry point
│       └── Cargo.toml
├── tests/                           # Test suite
│   ├── buy-bet.test.ts
│   ├── sell-bet.test.ts
│   ├── get-reward.test.ts
│   └── utils/                       # Test utilities
├── migrations/                      # Deployment scripts
├── target/                          # Build artifacts
│   ├── deploy/                      # Compiled programs
│   ├── idl/                         # Interface definitions
│   └── types/                       # TypeScript types
└── app/                             # Frontend application

Note: Secondary market trading (YES ↔ NO token conversion) is handled 
via Raydium CP-AMM integration (separate backend/client implementation).
```

## 🚨 Error Handling

The program includes comprehensive error handling with custom error codes:

- `MarketNotResolved`: Market hasn't been resolved yet
- `WrongWinningToken`: User doesn't hold winning tokens
- `InsufficientVault`: Not enough collateral in vault
- `MathOverflow`: Arithmetic overflow protection
- `InvalidOwner`: Account ownership validation failed

## 🔄 Development Workflow

1. **Make changes** to the Rust programs
2. **Build** with `anchor build`
3. **Test** with `anchor test`
4. **Deploy** with `anchor deploy`
5. **Update frontend** if needed

## 📝 License

This project is licensed under the GNU General Public License v2.0 (GPL-2).

