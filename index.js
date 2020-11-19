import fetch from 'node-fetch'
import BigNumber from 'bignumber.js'
import Web3 from 'web3'

const web3 = new Web3(new Web3.providers.HttpProvider('https://mainnet.infura.io/v3'))
const UNIT = new BigNumber('1000000000000000000')
const REWARD_PER_BLOCK = UNIT.multipliedBy(new BigNumber('30'))
const TOTAL_ALLOC_POINT = new BigNumber(14)

export default async function (pool, addr, blockNumber) {
  try {
    const pid = Number(pool)
    const address = addr.toLowerCase()
    const transactions = await getTransactions()
    const pools = getPools()
    let blocksProcessed = new Set()

    let users = new Map()
    users.set(0, new Map())
    users.set(1, new Map())
    users.set(2, new Map())
    users.set(3, new Map())
    users.set(4, new Map())

    transactions.forEach((transaction) =>
      processDeposit(transaction, pools, users, blocksProcessed)
    )

    return pendingReward(users.get(pid), pools.get(pid), address, blockNumber)
  } catch (err) {
    console.error(pool, err)
  }
  return -1
}

function objectToQuerystring(params) {
  return Object.keys(params)
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&')
}

async function getTransactions() {
  const params = {
    module: 'account',
    action: 'txlist',
    address: '0x143033f2587476662d098ccba8ef68a5c4bad581',
    startblock: '11194181',
    endblock: '999999999',
    to: '0x143033f2587476662d098ccba8ef68a5c4bad581',
    sort: 'asc',
    apikey: process.env.ETHERSCAN_API,
  }

  const response = await fetch('https://api.etherscan.io/api?' + objectToQuerystring(params))
  const json = await response.json()
  return json.result
}

function getPools() {
  const pools = new Map()
  pools.set(0, {
    id: 0,
    //lpToken: '0x1e9ed2a6ae58f49b3f847eb9f301849c4a20b7e3', gswap-eth
    total: new BigNumber(0),
    allocPoint: new BigNumber(3),
    lastRewardBlock: 11195050,
    accRewardPerShare: new BigNumber(0),
  })
  pools.set(1, {
    id: 1,
    //lpToken: '0xe79590c1d8cbf6f3217b734dae7abd1b06b68d48', gswap-shroom
    total: new BigNumber(0),
    allocPoint: new BigNumber(6),
    lastRewardBlock: 11195050,
    accRewardPerShare: new BigNumber(0),
  })
  pools.set(2, {
    id: 2,
    //lpToken: '0x7d611e4cf1c7b94561c4caa5602f329d108336e3', eth-shroom
    total: new BigNumber(0),
    allocPoint: new BigNumber(3),
    lastRewardBlock: 11195050,
    accRewardPerShare: new BigNumber(0),
  })
  pools.set(3, {
    id: 3,
    //lpToken: '0x065a489b2da5d239407c04f5bc8cf67e0f1df40f', uni-shroom
    total: new BigNumber(0),
    allocPoint: new BigNumber(1),
    lastRewardBlock: 11195050,
    accRewardPerShare: new BigNumber(0),
  })
  pools.set(4, {
    id: 4,
    //lpToken: '0xe77f9daf52e2eec41a1ac70fcae81a99fe056f0b', link-shroom
    total: new BigNumber(0),
    allocPoint: new BigNumber(1),
    lastRewardBlock: 11195050,
    accRewardPerShare: new BigNumber(0),
  })

  return pools
}

function parsePid(input) {
  let pid = web3.utils.hexToNumberString('0x' + input.substring(10, 74))
  return Number(pid)
}

function parseAmount(input) {
  let amount = web3.utils.hexToNumberString('0x' + input.substring(74))
  return new BigNumber(amount)
}

function pendingReward(usersInPool, pool, userAddress, blockNumber) {
  if (usersInPool === undefined) return new BigNumber(0)
  const user = usersInPool.get(userAddress)
  if (user === undefined || pool === undefined) return new BigNumber(0)

  let {accRewardPerShare, total} = pool

  if (blockNumber > pool.lastRewardBlock && total !== new BigNumber(0)) {
    const multiplier = new BigNumber(blockNumber - pool.lastRewardBlock)
    const reward = multiplier
      .multipliedBy(REWARD_PER_BLOCK)
      .multipliedBy(pool.allocPoint)
      .div(TOTAL_ALLOC_POINT)

    accRewardPerShare = accRewardPerShare.plus(reward.multipliedBy(1e12).div(total))
  }

  const z = user.pendingLocked.plus(
    user.amount.multipliedBy(accRewardPerShare).div(1e12).minus(user.rewardDebt)
  )

  return z.dp(0, BigNumber.ROUND_DOWN)
}

function processDeposit(transaction, pools, users, blocksProcessed) {
  const {blockNumber, hash, input, isError, from} = transaction
  const pid = parsePid(input)
  const amount = parseAmount(input)

  if (pid < 0 || pid > 5) return
  if (isError === '1') {
    return
  }

  //get user & get pool
  const pool = pools.get(pid)

  let user
  if (users.get(pid).has(from)) {
    user = users.get(pid).get(from)
  } else {
    user = {
      address: from,
      amount: new BigNumber(0),
      rewardDebt: new BigNumber(0),
      pendingLocked: new BigNumber(0),
    }
    users.get(pid).set(user.address, user)
  }

  //withdrawal //TODO, handle this and exclude them
  if ('0x94a8e803' === input.substring(0, 10)) {
    //simply just reset their balance for now
    user.rewardDebt = new BigNumber(0)
    user.amount = new BigNumber(0)
    user.pendingLocked = new BigNumber(0)
    return
  }

  //validate first -> deposit
  if ('0xe2bbb158' !== input.substring(0, 10)) {
    return
  }

  if (blocksProcessed.has(hash)) {
    return
  }

  //just in case clean them again
  if (from === '0x0000000000000000000000000000000000000000') {
    return
  }

  // update pool
  if (blockNumber > pool.lastRewardBlock) {
    if (pool.total === new BigNumber(0)) {
      pool.lastRewardBlock = blockNumber
    } else {
      const multiplier = new BigNumber(blockNumber - pool.lastRewardBlock)
      const reward = multiplier
        .multipliedBy(REWARD_PER_BLOCK)
        .multipliedBy(pool.allocPoint)
        .div(TOTAL_ALLOC_POINT)

      pool.accRewardPerShare = pool.accRewardPerShare.plus(
        reward.multipliedBy(1e12).div(pool.total)
      )
      pool.lastRewardBlock = blockNumber
    }
  }

  // ================

  //calculate due for user
  if (user.amount > 0) {
    const pending = user.amount
      .multipliedBy(pool.accRewardPerShare)
      .div(1e12)
      .minus(user.rewardDebt)
    user.pendingLocked = user.pendingLocked.plus(pending)
  }
  pool.total = pool.total.plus(amount)
  user.amount = user.amount.plus(amount)
  user.rewardDebt = user.amount.multipliedBy(pool.accRewardPerShare).div(1e12)

  pools.set(pool.id, pool)
  users.set(user.address, user)
  blocksProcessed.add(hash)
}
