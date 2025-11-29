const { Web3 } = require('web3');
const pool = require('../config/db');

/**
 * Crypto Wallet Service
 * Handles Ethereum transactions and balance tracking
 * Uses server-side wallet for automated purchases
 */

class CryptoWalletService {
  constructor() {
    this.web3 = null;
    this.initialized = false;
    this.init();
  }

  init() {
    try {
      // Connect to Ethereum network via Infura/Alchemy
      const rpcUrl = process.env.ETH_RPC_URL || 'https://mainnet.infura.io/v3/' + process.env.INFURA_PROJECT_ID;
      
      if (!process.env.ETH_RPC_URL && !process.env.INFURA_PROJECT_ID) {
        console.warn('⚠️  ETH_RPC_URL or INFURA_PROJECT_ID not configured. Crypto features disabled.');
        return;
      }

      this.web3 = new Web3(rpcUrl);
      this.initialized = true;
      console.log('✓ Web3 initialized for Ethereum network');
    } catch (error) {
      console.error('❌ Failed to initialize Web3:', error.message);
    }
  }

  /**
   * Get current ETH price in INR
   */
  async getEthPriceInINR() {
    try {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=inr'
      );
      const data = await response.json();
      return data.ethereum.inr;
    } catch (error) {
      console.error('Failed to fetch ETH price:', error);
      throw new Error('Unable to fetch current ETH price');
    }
  }

  /**
   * Get ETH balance for a wallet address
   */
  async getWalletBalance(walletAddress) {
    if (!this.initialized) {
      throw new Error('Web3 not initialized');
    }

    try {
      const balanceWei = await this.web3.eth.getBalance(walletAddress);
      const balanceEth = this.web3.utils.fromWei(balanceWei, 'ether');
      return parseFloat(balanceEth);
    } catch (error) {
      console.error('Failed to get wallet balance:', error);
      throw error;
    }
  }

  /**
   * Calculate ETH amount from INR
   */
  async calculateEthFromINR(amountINR) {
    const ethPrice = await this.getEthPriceInINR();
    const ethAmount = amountINR / ethPrice;
    return {
      ethAmount: parseFloat(ethAmount.toFixed(8)),
      ethPrice,
      inrAmount: amountINR
    };
  }

  /**
   * Send ETH from server wallet to user wallet
   * This simulates purchasing ETH with INR
   */
  async purchaseEth(userWalletAddress, amountINR) {
    if (!this.initialized) {
      throw new Error('Web3 not initialized');
    }

    const serverPrivateKey = process.env.ETH_SERVER_PRIVATE_KEY;
    const serverWalletAddress = process.env.ETH_SERVER_WALLET_ADDRESS;

    if (!serverPrivateKey || !serverWalletAddress) {
      throw new Error('Server wallet not configured');
    }

    try {
      // Calculate ETH amount
      const { ethAmount, ethPrice } = await this.calculateEthFromINR(amountINR);
      const ethAmountWei = this.web3.utils.toWei(ethAmount.toString(), 'ether');

      // Check server wallet balance
      const serverBalance = await this.getWalletBalance(serverWalletAddress);
      if (serverBalance < ethAmount) {
        throw new Error('Insufficient ETH in server wallet');
      }

      // Create and sign transaction
      const account = this.web3.eth.accounts.privateKeyToAccount(serverPrivateKey);
      this.web3.eth.accounts.wallet.add(account);

      const gasPrice = await this.web3.eth.getGasPrice();
      const nonce = await this.web3.eth.getTransactionCount(serverWalletAddress);

      const tx = {
        from: serverWalletAddress,
        to: userWalletAddress,
        value: ethAmountWei,
        gas: 21000,
        gasPrice: gasPrice,
        nonce: nonce
      };

      // Send transaction
      const receipt = await this.web3.eth.sendTransaction(tx);

      return {
        success: true,
        transactionHash: receipt.transactionHash,
        ethAmount,
        ethPrice,
        inrAmount: amountINR,
        gasUsed: receipt.gasUsed
      };
    } catch (error) {
      console.error('ETH purchase failed:', error);
      throw error;
    }
  }

  /**
   * Update user's ETH balance in database
   */
  async updateUserEthBalance(userId, walletAddress) {
    const client = await pool.connect();
    try {
      // Get current ETH balance from blockchain
      const ethBalance = await this.getWalletBalance(walletAddress);
      
      // Get current ETH price in INR
      const ethPrice = await this.getEthPriceInINR();
      const ethBalanceInr = ethBalance * ethPrice;

      // Update database
      const result = await client.query(
        `UPDATE users 
         SET eth_balance = $1, 
             eth_balance_inr = $2, 
             last_eth_sync = NOW(),
             updated_at = NOW()
         WHERE id = $3
         RETURNING eth_balance, eth_balance_inr`,
        [ethBalance, ethBalanceInr, userId]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      return {
        ethBalance: parseFloat(result.rows[0].eth_balance),
        ethBalanceInr: parseFloat(result.rows[0].eth_balance_inr),
        ethPrice
      };
    } finally {
      client.release();
    }
  }

  /**
   * Set user's Ethereum wallet address
   */
  async setUserWalletAddress(userId, walletAddress) {
    // Validate wallet address format
    if (!this.web3 || !this.web3.utils.isAddress(walletAddress)) {
      throw new Error('Invalid Ethereum wallet address');
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        `UPDATE users 
         SET eth_wallet_address = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING eth_wallet_address`,
        [walletAddress, userId]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      return { walletAddress: result.rows[0].eth_wallet_address };
    } finally {
      client.release();
    }
  }

  /**
   * Get user's crypto details from database
   */
  async getUserCryptoDetails(userId) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT eth_wallet_address, eth_balance, eth_balance_inr, last_eth_sync
         FROM users WHERE id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = result.rows[0];
      return {
        walletAddress: user.eth_wallet_address,
        ethBalance: parseFloat(user.eth_balance || 0),
        ethBalanceInr: parseFloat(user.eth_balance_inr || 0),
        lastSync: user.last_eth_sync
      };
    } finally {
      client.release();
    }
  }
}

module.exports = new CryptoWalletService();
