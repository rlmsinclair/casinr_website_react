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

const network = 'https://quaint-newest-snowflake.solana-mainnet.quiknode.pro/6efa683091a868f50d6c8d3a6bea48556683a2d9/';

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
        if (solana.connect) {
          const response = await solana.connect({ onlyIfTrusted: true });
          console.log('Connected with Public Key:', response.publicKey.toString());
          setWalletKey(response.publicKey);
        }
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
      if (solana && solana.connect) {
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

      const {blockhash, lastValidBlockHeight} = await connection.getLatestBlockhash();

      const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: walletKey,
            toPubkey: recipient,
            lamports,
          })
      );

      transaction.recentBlockhash = blockhash;
      transaction.feePayer = walletKey;

      const {signature} = await window.solana!.signAndSendTransaction!(transaction);

      const confirmation = await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight
      });

      if (confirmation.value.err) {
        throw new Error('Transaction failed');
      }

      setMessage(`Transaction sent! Signature: ${signature}`);

    if (walletKey) {
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
    } catch (error) {
      console.error('Error sending transaction:', error);
      setMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return (
    <div>
      <h1>50% chance to double your SOL coins!</h1>
      <h3>
        Instructions:
        Install the <a href="https://phantom.app/">Phantom Chrome extension</a>
        <br></br>
        Buy some SOL.
        <br></br>
        Now you can connect your Phantom wallet below, enter a number of coins to bet and click Send Transaction.
        <br></br>
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