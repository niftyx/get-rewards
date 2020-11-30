require('dotenv').config()
const Web3 = require('web3')
const getRewards = require('./getRewards')

const web3 = new Web3(
  new Web3.providers.HttpProvider('https://mainnet.infura.io/v3/' + process.env.INFURA_PROJECT_ID)
)

const POOL = 0          // The pool id you want to check
const ADDRESS = '0x...' // Your ethereum farming address

async function init() {
  const blockNumber = await web3.eth.getBlockNumber()
  const rewards = await getRewards(POOL, ADDRESS, blockNumber)
  console.log('Rewards = ' + rewards / Math.pow(10, 18).toFixed(4))
}

init()
