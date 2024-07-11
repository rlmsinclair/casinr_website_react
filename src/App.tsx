import { useState, useEffect } from 'react';
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { Buffer } from 'buffer';

if (typeof window !== 'undefined') {
  window.Buffer = Buffer;
}

interface Solana {
  isPhantom?: boolean;
  connect?: (args?: { onlyIfTrusted: boolean }) => Promise<{ publicKey: PublicKey }>;
  signAndSendTransaction?: (transaction: Transaction) => Promise<{ signature: string }>;
}

declare global {
  interface Window {
    solana?: Solana;
  }
}

const network = 'https://api.devnet.solana.com';

function App() {
  const [walletKey, setWalletKey] = useState<PublicKey | null>(null);
  const recipientAddress = "45hgDjZ2JR1RqmQiZfDgs1Rx5mJWj3RENqj3zJyFfU6p"
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const onLoad = async () => {
      await checkIfWalletIsConnected();
    };
    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  async function checkIfWalletIsConnected() {
    try {
      const { solana } = window;
      if (solana?.isPhantom) {
        console.log('Phantom wallet found!');
        const response = await solana.connect({ onlyIfTrusted: true });
        console.log('Connected with Public Key:', response.publicKey.toString());
        setWalletKey(response.publicKey);
      } else {
        console.log('Solana object not found! Get a Phantom Wallet 👻');
      }
    } catch (error) {
      console.error('Error checking if wallet is connected:', error);
    }
  }

  async function connectWallet() {
    try {
      const { solana } = window;
      if (solana) {
        const response = await solana.connect();
        console.log('Connected with Public Key:', response.publicKey.toString());
        setWalletKey(response.publicKey);
      }
    } catch (error) {
      console.error('Error connecting to wallet:', error);
    }
  }

  async function sendTransaction() {
    try {
      if (!walletKey) {
        setMessage('Please connect your wallet first.');
        return;
      }

      const connection = new Connection(network, 'confirmed');
      const recipient = new PublicKey(recipientAddress);
      const lamports = parseFloat(amount) * LAMPORTS_PER_SOL;

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: walletKey,
          toPubkey: recipient,
          lamports,
        })
      );

      transaction.recentBlockhash = blockhash;
      transaction.feePayer = walletKey;

      const { signature } = await window.solana!.signAndSendTransaction!(transaction);

      const confirmation = await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight
      });

      if (confirmation.value.err) {
        throw new Error('Transaction failed');
      }

      setMessage(`Transaction sent! Signature: ${signature}`);
    } catch (error) {
      console.error('Error sending transaction:', error);
      setMessage(`Error: ${error.message}`);
    }

    try {
    const response = await fetch('https://api.casinr.co.uk/api/play_game', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        betAmount: parseFloat(amount),
        publicKey: walletKey.toString(),
      }),
    });

    const result = await response.json();
    console.log(result);
    } catch (error) {
      console.error('Error playing game:', error);
    }
  }

  return (
    <div>
      <h1>50% chance to double your SOL coins!</h1>
      <h3>
        Instructions:
        Install the <a href="https://phantom.app/">Phantom Chrome extension</a>,
        open the extension, go to settings and enable Testnet mode.
        <br></br>
        To receive free SOL Devnet coins (unfortunately not worth anything), go to <a href="https://solfaucet.com/">Solfaucet</a>,
        enter your wallet address and press "DEVNET".
        <br></br>
        Now you can connect your Phantom wallet below, enter a number of coins to bet and click Send Transaction.
        Good luck!
      </h3>
      {!walletKey && (
        <button onClick={connectWallet}>Connect to Phantom Wallet</button>
      )}
      {walletKey && (
        <div>
          <p>Connected with: {walletKey.toString()}</p>
          <input
            type="number"
            step="0.000000001"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount in SOL"
          />
          <button onClick={sendTransaction}>Send Transaction</button>
          <p>{message}</p>
        </div>
      )}
    </div>
  );
}

export default App;