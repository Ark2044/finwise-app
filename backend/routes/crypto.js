const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { generalLimiter, paymentLimiter } = require('../middleware/rateLimiter');
const { logTransaction, logError } = require('../middleware/auditLogger');
const cryptoWallet = require('../services/cryptoWallet');
const openservAgent = require('../services/openservAgent');
const pool = require('../config/db');

/**
 * OpenServ.ai webhook callback endpoint (NO AUTH - uses signature verification)
 */
router.post('/webhook/openserv', async (req, res) => {
  try {
    // Verify webhook signature
    const signature = req.headers['x-openserv-signature'];
    const expectedSecret = process.env.OPENSERV_WEBHOOK_SECRET;
    
    if (expectedSecret && signature !== expectedSecret) {
      console.warn('Invalid OpenServ webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const result = await openservAgent.handleWebhookCallback(req.body);
    res.json(result);
  } catch (error) {
    console.error('OpenServ webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Apply authentication to all other routes
router.use(authenticateToken);

/**
 * Get user's crypto balances and wallet info
 */
router.get('/balance', generalLimiter, async (req, res) => {
  try {
    const details = await cryptoWallet.getUserCryptoDetails(req.user.userId);
    
    // Get current ETH price
    let currentPrice = null;
    try {
      currentPrice = await cryptoWallet.getEthPriceInINR();
    } catch (e) {
      console.warn('Could not fetch current ETH price');
    }

    res.json({
      ...details,
      currentEthPrice: currentPrice,
      liveValueInr: currentPrice ? details.ethBalance * currentPrice : details.ethBalanceInr
    });
  } catch (error) {
    console.error('Crypto balance fetch error:', error);
    logError(error, req);
    res.status(500).json({ error: 'Failed to fetch crypto balance' });
  }
});

/**
 * Set user's Ethereum wallet address (MetaMask address)
 */
router.post('/wallet/address', generalLimiter, async (req, res) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    const result = await cryptoWallet.setUserWalletAddress(req.user.userId, walletAddress);

    logTransaction('ETH_WALLET_SET', {
      userId: req.user.userId,
      walletAddress: walletAddress
    }, req);

    res.json({
      success: true,
      message: 'Ethereum wallet address saved',
      walletAddress: result.walletAddress
    });
  } catch (error) {
    console.error('Set wallet address error:', error);
    logError(error, req);
    res.status(400).json({ error: error.message || 'Failed to set wallet address' });
  }
});

/**
 * Sync ETH balance from blockchain
 */
router.post('/balance/sync', generalLimiter, async (req, res) => {
  try {
    const details = await cryptoWallet.getUserCryptoDetails(req.user.userId);

    if (!details.walletAddress) {
      return res.status(400).json({ error: 'No Ethereum wallet address configured' });
    }

    const updated = await cryptoWallet.updateUserEthBalance(req.user.userId, details.walletAddress);

    logTransaction('ETH_BALANCE_SYNC', {
      userId: req.user.userId,
      ethBalance: updated.ethBalance,
      ethBalanceInr: updated.ethBalanceInr
    }, req);

    res.json({
      success: true,
      ...updated
    });
  } catch (error) {
    console.error('Sync balance error:', error);
    logError(error, req);
    res.status(500).json({ error: 'Failed to sync balance from blockchain' });
  }
});

/**
 * Get current ETH price
 */
router.get('/price', generalLimiter, async (req, res) => {
  try {
    const price = await cryptoWallet.getEthPriceInINR();
    res.json({
      currency: 'ETH',
      priceInr: price,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Price fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch ETH price' });
  }
});

/**
 * Calculate ETH amount for given INR
 */
router.get('/calculate', generalLimiter, async (req, res) => {
  try {
    const amountINR = parseFloat(req.query.amount);

    if (!amountINR || amountINR <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const calculation = await cryptoWallet.calculateEthFromINR(amountINR);
    res.json(calculation);
  } catch (error) {
    console.error('Calculation error:', error);
    res.status(500).json({ error: 'Failed to calculate ETH amount' });
  }
});

/**
 * Manual ETH purchase (for testing or direct purchase)
 */
router.post('/purchase', paymentLimiter, async (req, res) => {
  try {
    const { amountINR } = req.body;

    if (!amountINR || amountINR <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    // Get user's wallet address
    const details = await cryptoWallet.getUserCryptoDetails(req.user.userId);

    if (!details.walletAddress) {
      return res.status(400).json({ error: 'Please configure your Ethereum wallet address first' });
    }

    // Execute the workflow
    const result = await openservAgent.executeWorkflowLocally({
      userId: req.user.userId,
      amountINR,
      walletAddress: details.walletAddress,
      previousBalance: 0,
      newBalance: amountINR
    });

    logTransaction('ETH_PURCHASE', {
      userId: req.user.userId,
      amountINR,
      ethAmount: result.ethPurchased,
      txHash: result.transactionHash
    }, req);

    res.json(result);
  } catch (error) {
    console.error('ETH purchase error:', error);
    logError(error, req);
    res.status(500).json({ error: error.message || 'ETH purchase failed' });
  }
});

/**
 * Get crypto transaction history
 */
router.get('/transactions', generalLimiter, async (req, res) => {
  const client = await pool.connect();
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = parseInt(req.query.offset) || 0;

    const result = await client.query(
      `SELECT id, transaction_type, amount_inr, amount_eth, eth_price, 
              tx_hash, status, created_at, completed_at
       FROM crypto_transactions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.userId, limit, offset]
    );

    res.json({
      transactions: result.rows,
      pagination: {
        limit,
        offset,
        hasMore: result.rows.length === limit
      }
    });
  } catch (error) {
    console.error('Transaction history error:', error);
    logError(error, req);
    res.status(500).json({ error: 'Failed to fetch transaction history' });
  } finally {
    client.release();
  }
});

module.exports = router;
