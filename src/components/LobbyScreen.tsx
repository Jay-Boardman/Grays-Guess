/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Users, Phone, Wifi, Sparkles, User, KeyRound } from 'lucide-react';
import { audio } from './AudioEngine';
import { haptics } from './Haptics';

interface LobbyScreenProps {
  onSelectLocal: () => void;
  onJoinMultiplayer: (roomId: string, name: string, isHost: boolean) => void;
  savedName1: string;
  savedName2: string;
}

export default function LobbyScreen({
  onSelectLocal,
  onJoinMultiplayer,
  savedName1,
  savedName2,
}: LobbyScreenProps) {
  const [mode, setMode] = useState<'selection' | 'multiplayer_form'>('selection');
  const [playerName, setPlayerName] = useState(() => savedName1 || 'Player');
  const [roomCode, setRoomCode] = useState('');
  const [formType, setFormType] = useState<'host' | 'join'>('host');
  const [error, setError] = useState('');

  const handleSelectLocal = () => {
    audio.playConfirm();
    haptics.vibrateMedium();
    onSelectLocal();
  };

  const handleStartMultiplayerSetup = (type: 'host' | 'join') => {
    audio.playTap();
    haptics.vibrateLight();
    setFormType(type);
    setMode('multiplayer_form');
    if (type === 'host') {
      // Pre-fill a random 4 digit room code
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      setRoomCode(code);
    } else {
      setRoomCode('');
    }
  };

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!roomCode.trim() || roomCode.length < 4) {
      setError('Enter a valid 4-digit room code');
      return;
    }

    audio.playConfirm();
    haptics.vibrateSuccess();
    onJoinMultiplayer(roomCode.trim(), playerName.trim(), formType === 'host');
  };

  return (
    <div className="w-full h-full max-w-md mx-auto px-4 py-4 sm:py-6 flex flex-col justify-between overflow-y-auto text-[#e2e8f0] custom-scrollbar" id="lobby-screen-root">
      {/* Brand Header */}
      <div className="text-center space-y-3">
        <motion.div
          initial={{ rotate: -10, scale: 0.9 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="inline-flex items-center justify-center p-4 bg-white/5 border border-cyan-500/20 rounded-3xl shadow-lg glow-box-p1 mb-1"
          id="logo-icon-container"
        >
          <KeyRound className="w-10 h-10 text-cyan-400 animate-pulse" />
        </motion.div>
        <h1 className="text-4xl font-black tracking-tighter uppercase italic text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-400 to-fuchsia-500" id="lobby-title">
          DUO GUESS
        </h1>
        <p className="text-xs font-mono tracking-widest uppercase opacity-60">
          The Cyber Secret Duel
        </p>
      </div>

      {mode === 'selection' ? (
        <div className="space-y-5 my-8">
          {/* Option 1: Online Cyber Duel (New feature!) */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleStartMultiplayerSetup('host')}
            className="w-full p-5 glass rounded-3xl text-left border border-cyan-500/30 glow-box-p1 cursor-pointer transition-all flex items-start gap-4"
            type="button"
          >
            <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-2xl">
              <Wifi className="w-6 h-6 animate-pulse" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-black uppercase tracking-wider text-white text-base">Host Cyber Duel</span>
                <span className="text-[10px] bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 px-2 py-0.5 rounded-full font-mono uppercase tracking-widest">Two Phones</span>
              </div>
              <p className="text-xs text-gray-400">
                Play on separate phones! Host a room, share the code, and guess in real-time.
              </p>
            </div>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleStartMultiplayerSetup('join')}
            className="w-full p-5 glass rounded-3xl text-left border border-fuchsia-500/30 glow-box-p2 cursor-pointer transition-all flex items-start gap-4"
            type="button"
          >
            <div className="p-3 bg-fuchsia-500/10 border border-fuchsia-500/30 text-fuchsia-400 rounded-2xl">
              <Users className="w-6 h-6" />
            </div>
            <div className="flex-1 space-y-1">
              <span className="font-black uppercase tracking-wider text-white text-base block">Join Cyber Duel</span>
              <p className="text-xs text-gray-400">
                Have an invitation code? Join your opponent's room instantly.
              </p>
            </div>
          </motion.button>

          <div className="relative py-2 text-center">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
            <span className="relative bg-[#070514] px-3 font-mono text-[9px] text-gray-500 uppercase tracking-widest">Or Play Locally</span>
          </div>

          {/* Option 2: Local Pass & Play */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSelectLocal}
            className="w-full p-5 glass rounded-3xl text-left border border-white/10 hover:border-white/20 hover:bg-white/5 cursor-pointer transition-all flex items-start gap-4"
            type="button"
          >
            <div className="p-3 bg-white/5 border border-white/10 text-gray-400 rounded-2xl">
              <Phone className="w-6 h-6" />
            </div>
            <div className="flex-1 space-y-1">
              <span className="font-black uppercase tracking-wider text-white text-base block">Pass & Play Mode</span>
              <p className="text-xs text-gray-400">
                No internet? Swap a single phone back and forth to hide secrets.
              </p>
            </div>
          </motion.button>
        </div>
      ) : (
        <motion.form
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleConnect}
          className="space-y-5 my-6 glass p-6 rounded-3xl border border-white/10"
        >
          <h2 className="text-xs font-bold uppercase tracking-widest text-cyan-400 flex items-center gap-1.5 pb-2 border-b border-white/5">
            <User className="w-4 h-4" /> {formType === 'host' ? 'Host Details' : 'Join Details'}
          </h2>

          <div className="space-y-4">
            <div>
              <label htmlFor="player-name" className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-1.5">
                Your Nickname
              </label>
              <input
                id="player-name"
                type="text"
                maxLength={14}
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter nickname"
                className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400 text-white text-sm outline-none transition-all"
              />
            </div>

            <div>
              <label htmlFor="room-code" className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-1.5">
                Room Duel Code
              </label>
              <input
                id="room-code"
                type="tel"
                maxLength={4}
                disabled={formType === 'host'}
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter 4-digit code"
                className="w-full h-12 px-4 bg-white/5 disabled:opacity-75 disabled:text-cyan-300 border border-white/10 rounded-xl focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400 text-white font-mono text-center text-lg tracking-widest outline-none transition-all"
              />
            </div>
          </div>

          {error && (
            <div className="text-xs text-rose-400 text-center font-semibold uppercase tracking-wider">
              ⚠ {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                audio.playTap();
                setMode('selection');
              }}
              className="flex-1 h-12 bg-white/5 border border-white/10 text-xs font-bold rounded-xl uppercase tracking-wider transition-all cursor-pointer hover:bg-white/10 text-gray-300"
            >
              Back
            </button>
            <button
              type="submit"
              className="flex-1 h-12 bg-gradient-to-r from-cyan-500 to-fuchsia-600 hover:from-cyan-400 hover:to-fuchsia-500 text-white text-xs font-black rounded-xl uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-cyan-500/10"
            >
              {formType === 'host' ? 'Create Duel' : 'Enter Duel'}
            </button>
          </div>
        </motion.form>
      )}

      {/* Cyber Credits footer */}
      <footer className="text-center font-mono text-[9px] text-gray-600 tracking-wider">
        SECURE REAL-TIME TRANSMISSION • PORT 3000
      </footer>
    </div>
  );
}
