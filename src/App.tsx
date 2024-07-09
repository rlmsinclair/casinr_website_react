import { useState, useEffect } from 'react';
import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { Buffer } from 'buffer';

// Assign Buffer to the window object
window.Buffer = Buffer;

interface Solana {
  isPhantom: boolean;
  connect: (args?: { onlyIfTrusted: boolean }) => Promise<{ publicKey: PublicKey }>;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
}

declare global {
  interface Window {
    solana?: Solana;
  }
}

const programId = new PublicKey('7Ex4bDdEjX2opspj5UnoQmTYZ6gAmbWaLCSEpbpQoQ7i');
const network = 'https://ssc-dao.genesysgo.net';
const opts = { preflightCommitment: 'processed' as const };

function App() {
  const [betAmount, setBetAmount] = useState(0);
  const [message, setMessage] = useState('');
  const [walletKey, setWalletKey] = useState<PublicKey | null>(null);

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
      if (solana && solana.isPhantom) {
        console.log('Phantom wallet found!');
        const response = await solana.connect({ onlyIfTrusted: true });
        console.log('Connected with Public Key:', response.publicKey.toString());
        setWalletKey(response.publicKey);
      } else {
        alert('Solana object not found! Get a Phantom Wallet 👻');
      }
    } catch (error) {
      console.error(error);
    }
  }

  async function connectWallet() {
    const { solana } = window;
    if (solana) {
      const response = await solana.connect();
      console.log('Connected with Public Key:', response.publicKey.toString());
      setWalletKey(response.publicKey);
    }
  }

  async function playGame() {
    if (!walletKey) return;
    try {
      const connection = new Connection(network, opts.preflightCommitment);
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: walletKey,
          toPubkey: programId,
          lamports: betAmount,
        })
      );
      const { blockhash } = await connection.getRecentBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = walletKey;

      const { solana } = window;
      if (solana) {
        const signed = await solana.signTransaction(transaction);
        const txid = await connection.sendRawTransaction(signed.serialize());

        try {
          await connection.confirmTransaction(txid);
          console.log('Transaction signature', txid);
          setMessage('Transaction processed successfully!');
        } catch (confirmError) {
          console.log('Error confirming transaction:', confirmError);
          setMessage('Error confirming transaction. Please check the console for details.');
        }
      } else {
        throw new Error('Solana object not found!');
      }
    } catch (err) {
      console.log('Error processing transaction:', err);
      setMessage('Error processing transaction. Please check the console for details.');
    }
  }

  return (
    <div>
      <h1>Flip Game</h1>
      {!walletKey && (
        <button onClick={connectWallet}>Connect to Phantom Wallet</button>
      )}
      {walletKey && (
        <div>
          <p>Connected with: {walletKey.toString()}</p>
          <input
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(Number(e.target.value))}
            placeholder="Bet Amount"
          />
          <button onClick={playGame}>Play</button>
          <p>{message}</p>
        </div>
      )}
    </div>
  );
}

export default App;