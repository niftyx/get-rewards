# Get GSWAP Rewards

This repo contains the logic used for calculating the GSWAP farming rewards. 

## Prerequisites

- Install NodeJS ≥ 10.22.0
- Free Infura [API Key](https://infura.io/dashboard/ethereum)

## Instructions

1. Install NodeJS 10.22.0 / NPM
2. Run `npm i`
3. Add your infura API Key to `.env`
4. Open `index.js` and set the pool ID for the corresponding pool in `POOL`, and your wallet address in `ADDRESS`. Pool IDs:

   - GSWAP-ETH: 0
   - GSWAP-SHROOM: 1
   - ETH-SHROOM: 2
   - UNI-SHROOM: 3
   - LINK-SHROOM: 4

5. Run `node index.js` to check the rewards number
