# 💧 Liquidity Pools Scripts (ts-node + TypeScript)

A TypeScript-based project to create and test interactions with Ethereum liquidity pools (like Uniswap V3), using `ts-node`.

---

## 📁 Project Structure

```
.
├── ethereum
│   ├── output
│   │   ├── addLiquidity.log
│   │   ├── addLiquidityToShtLink.log
│   │   ├── alreadyPoolExisting.log
│   │   ├── createLiquidityPool.log
│   │   └── listAllPositions.log
│   ├── test
│   │   ├── listAllPositions.ts
│   │   ├── testAddLiquidity.ts
│   │   └── testCreateLiquidity.ts
│   ├── utils
│   │   └── utils.ts
│   └── write
│       ├── addLiquidity.ts
│       └── createUniswapV3Pool.ts
├── example.env
├── notes.md
├── package-lock.json
├── package.json
└── tsconfig.json
```

## 🚀 Getting Started

### 1. 📦 Install Dependencies
```bash
npm install
```

### 2. 🛠️ Setup Environment

Create a .env file using the provided example.env template:
```
cp example.env .env
```

## 🧪 Test Scripts

Each script logs output to `ethereum/output/`:

| Script | Description |
|--------|-------------|
| `testAddLiquidity.ts` | Add liquidity to an existing pool |
| `testCreateLiquidity.ts` | Create a new Uniswap V3 liquidity pool |
| `listAllPositions.ts` | List current LP positions |

Run using:
```bash
npx ts-node ethereum/test/<scriptName>.ts
```

Example:
```bash
npx ts-node ethereum/test/testAddLiquidity.ts > ethereum/output/addLiquidityToShtLink.log
```
