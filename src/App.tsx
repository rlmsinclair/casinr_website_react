import { useState, useEffect } from 'react';
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  SYSVAR_CLOCK_PUBKEY,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import * as borsh from 'borsh';
import { Buffer } from 'buffer';

if (typeof window !== 'undefined') {
  window.Buffer = Buffer;
}

interface Solana {
  isPhantom?: boolean;
  connect?: (args?: { onlyIfTrusted: boolean }) => Promise<{ publicKey: PublicKey }>;
  signTransaction?: (transaction: Transaction) => Promise<Transaction>;
}

declare global {
  interface Window {
    solana?: Solana;
  }
}

const LAMPORTS_PER_SOL = 1000000000;
const MIN_BET = 0.01; // Minimum bet of 0.01 SOL
const MAX_BET = 10;   // Maximum bet of 10 SOL

const programId = new PublicKey('GedUe2bGFnc9UPhW7MwfQsfZ5VZqXi6vCjMEHS5uGNvr');
const [housePDA] = PublicKey.findProgramAddressSync(
  [Buffer.from("HOUSE")],
  programId
);
const network = 'https://solana-mainnet.g.alchemy.com/v2/L9j3YeIDh81Cnkf-QBUCinSQGnjNBOxt'; // Changed to devnet

function App() {
  const [betAmount, setBetAmount] = useState('');
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

  async function fetchGameResult(connection: Connection, signature: string) {
    await connection.confirmTransaction(signature, 'finalized');
    const tx = await connection.getTransaction(signature, {
      commitment: 'finalized',
    });

    if (!tx?.meta?.logMessages) {
      throw new Error('Transaction logs not found');
    }

    const winLog = tx.meta.logMessages.find(log => log.includes('You won!'));
    const loseLog = tx.meta.logMessages.find(log => log.includes('You lost!'));

    if (winLog) {
      return 'win';
    } else if (loseLog) {
      return 'lose';
    } else {
      throw new Error('Game result not found in transaction logs');
    }
  }

  async function playGame() {
    if (!walletKey) {
      console.log('Wallet not connected');
      return;
    }

    const betAmountFloat = parseFloat(betAmount);
    if (isNaN(betAmountFloat)) {
      setMessage('Please enter a valid bet amount.');
      return;
    }

    try {
      const connection = new Connection(network, 'finalized');

      // Check balance
      const balance = await connection.getBalance(walletKey);
      const balanceInSol = balance / LAMPORTS_PER_SOL;

      if (balanceInSol < betAmountFloat) {
        setMessage(`Insufficient balance. You have ${balanceInSol.toFixed(4)} SOL, but the bet requires ${betAmountFloat.toFixed(4)} SOL.`);
        return;
      }

      // Check bet limits
      if (betAmountFloat < MIN_BET || betAmountFloat > MAX_BET) {
        setMessage(`Bet amount must be between ${MIN_BET} and ${MAX_BET} SOL.`);
        return;
      }

      const gameData = {
        is_initialized: true,
        bet_amount: BigInt(Math.round(betAmountFloat * LAMPORTS_PER_SOL)),
      };
      const data = Buffer.from(borsh.serialize(
        { struct: { is_initialized: 'bool', bet_amount: 'u64' } },
        gameData
      ));

      const computeBudgetInstruction = ComputeBudgetProgram.setComputeUnitLimit({
        units: 300000
      });

      const gameInstruction = new TransactionInstruction({
        keys: [
          { pubkey: walletKey, isSigner: true, isWritable: true },
          { pubkey: housePDA, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
        ],
        programId,
        data,
      });

      const transaction = new Transaction().add(computeBudgetInstruction, gameInstruction);

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
      transaction.recentBlockhash = blockhash;
      transaction.lastValidBlockHeight = lastValidBlockHeight;
      transaction.feePayer = walletKey;

      const { solana } = window;
      if (!solana?.signTransaction) {
        throw new Error('Phantom wallet is not connected');
      }

      const signed = await solana.signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signed.serialize(), {
        skipPreflight: true,
        preflightCommitment: 'finalized',
      });

      console.log('Transaction sent:', signature);
      setMessage(`Transaction sent: ${signature}. Waiting for confirmation...`);

      const result = await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight
      });

      if (result.value.err) {
        throw new Error(`Transaction failed: ${result.value.err.toString()}`);
      }

      console.log('Transaction confirmed successfully');
      const gameResult = await fetchGameResult(connection, signature);
      setMessage(`Game result: You ${gameResult}!`);

    } catch (err) {
      console.error('Error:', err);
      if (err instanceof Error) {
        setMessage(`Error: ${err.message}`);
      } else {
        setMessage('An unknown error occurred.');
      }
    }
  }

  return (
    <div>
      <h1>Flip Game</h1>
      <p>House Account: {housePDA.toString()}</p>
      {!walletKey && (
        <button onClick={connectWallet}>Connect to Phantom Wallet</button>
      )}
      {walletKey && (
        <div>
          <p>Connected with: {walletKey.toString()}</p>
          <input
            type="number"
            step="0.01"
            min={MIN_BET}
            max={MAX_BET}
            value={betAmount}
            onChange={(e) => setBetAmount(e.target.value)}
            placeholder="Bet Amount in SOL"
          />
          <button onClick={playGame}>Play</button>
          <p>{message}</p>
        </div>
      )}
    </div>
  );
}

export default App;