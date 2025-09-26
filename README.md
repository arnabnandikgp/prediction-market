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

- **Market Program**: Main program handling market operations
- **Oracle Adapter**: Handles external data feeds for market resolution
- **AMM Program**: Automated market maker for token swaps
- **Prediction Market**: Orchestrates the overall system

### Key Data Structures

- **MarketConfig**: Stores market metadata and configuration
- **VaultState**: Manages collateral and conditional token balances
- **Permission**: Handles access control for admin functions

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
   yarn install
   ```

3. **Build the programs**
   ```bash
   anchor build
   ```

4. **Start local validator** (in a separate terminal)
   ```bash
   solana-test-validator
   ```

5. **Deploy to localnet**
   ```bash
   anchor deploy
   ```

## 🧪 Testing

Run the test suite:
```bash
anchor test
```

Or run specific tests:
```bash
yarn test
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
// Buy a bet (Yes position)
const buyTx = await program.methods
  .buyBet(new anchor.BN(1000000)) // bet amount in lamports
  .accounts({
    bettor: user.publicKey,
    // ... other required accounts
  })
  .rpc();
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

- `create_market_config`: Initialize a new prediction market
- `initialize`: Set up market vault and conditional tokens
- `buy_bet`: Purchase conditional tokens (place a bet)
- `sell_bet`: Sell conditional tokens (exit a position)
- `get_reward`: Collect rewards after market resolution
- `resolve_market`: Admin function to resolve the market

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
│   ├── market_program/          # Main market logic
│   ├── oracle_adapter/          # External data integration
│   ├── amm_program/             # Automated market maker
│   └── prediction_market/       # System orchestration
├── tests/                       # Test suite
├── migrations/                  # Deployment scripts
└── app/                         # Frontend application
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

This project is licensed under the ISC License.

**Note**: This is a development version. Use at your own risk and ensure proper testing before deploying to mainnet.
