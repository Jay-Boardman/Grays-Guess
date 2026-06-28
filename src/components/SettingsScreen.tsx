/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import { Settings, Volume2, VolumeX, Smartphone, Trophy, User, ArrowRight, RotateCcw, ArrowLeft } from 'lucide-react';
import { GameConfig, GameStats } from '../types';
import { audio } from './AudioEngine';
import { haptics } from './Haptics';

interface SettingsScreenProps {
  initialConfig: GameConfig;
  stats: GameStats;
  onSave: (config: GameConfig) => void;
  onResetStats: () => void;
  isMultiplayer?: boolean;
  onBack?: () => void;
}

export default function SettingsScreen({
  initialConfig,
  stats,
  onSave,
  onResetStats,
  isMultiplayer = false,
  onBack,
}: SettingsScreenProps) {
  const [maxNumber, setMaxNumber] = useState(initialConfig.maxNumber);
  const [player1Name, setPlayer1Name] = useState(initialConfig.player1Name);
  const [player2Name, setPlayer2Name] = useState(initialConfig.player2Name);
  const [soundEnabled, setSoundEnabled] = useState(initialConfig.soundEnabled);
  const [hapticsEnabled, setHapticsEnabled] = useState(initialConfig.hapticsEnabled);

  const presets = [50, 100, 250, 500, 1000];

  const handleStartGame = () => {
    haptics.vibrateSuccess();
    audio.playConfirm();

    // Clamp or default inputs
    const finalMax = Math.max(5, isNaN(maxNumber) ? 100 : maxNumber);
    const p1 = player1Name.trim() || 'Player 1';
    const p2 = player2Name.trim() || 'Player 2';

    onSave({
      maxNumber: finalMax,
      player1Name: p1,
      player2Name: p2,
      soundEnabled,
      hapticsEnabled,
    });
  };

  const toggleSound = () => {
    const val = !soundEnabled;
    setSoundEnabled(val);
    audio.setEnabled(val);
    if (val) {
      audio.playTap();
    }
  };

  const toggleHaptics = () => {
    const val = !hapticsEnabled;
    setHapticsEnabled(val);
    haptics.setEnabled(val);
    if (val) {
      haptics.vibrateLight();
    }
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 py-6 flex flex-col min-h-[90vh] justify-between text-[#e2e8f0]" id="settings-screen-root">
      {/* Header and Logo */}
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3.5 bg-white/5 border border-cyan-500/20 rounded-2xl shadow-lg glow-box-p1 mb-2" id="logo-badge">
            <Settings className="w-8 h-8 text-cyan-400 animate-spin-slow" />
          </div>
          <h1 className="text-3xl font-black tracking-tighter uppercase italic text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500" id="title-main">
            DUO GUESS
          </h1>
          <p className="text-xs font-mono tracking-widest uppercase opacity-60">
            {isMultiplayer ? 'Cyber Duel Room Config' : 'A Local Cyber Guessing Duel'}
          </p>
        </div>

        {/* Player Name Settings */}
        {!isMultiplayer && (
          <div className="glass p-5 rounded-3xl space-y-4" id="section-players">
            <h2 className="text-xs font-bold uppercase tracking-widest text-cyan-400 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Players Configuration
            </h2>
            
            <div className="space-y-3">
              <div>
                <label htmlFor="p1-input" className="block text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1">
                  Player 1 Name
                </label>
                <div className="relative">
                  <input
                    id="p1-input"
                    type="text"
                    maxLength={15}
                    value={player1Name}
                    onChange={(e) => setPlayer1Name(e.target.value)}
                    placeholder="Player 1"
                    className="w-full h-11 pl-4 pr-10 bg-white/5 border border-white/10 rounded-xl focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400 text-white text-sm outline-none transition-all"
                  />
                  <span className="absolute right-3.5 top-4 w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(0,242,255,0.7)]" />
                </div>
              </div>

              <div>
                <label htmlFor="p2-input" className="block text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1">
                  Player 2 Name
                </label>
                <div className="relative">
                  <input
                    id="p2-input"
                    type="text"
                    maxLength={15}
                    value={player2Name}
                    onChange={(e) => setPlayer2Name(e.target.value)}
                    placeholder="Player 2"
                    className="w-full h-11 pl-4 pr-10 bg-white/5 border border-white/10 rounded-xl focus:ring-1 focus:ring-fuchsia-400 focus:border-fuchsia-400 text-white text-sm outline-none transition-all"
                  />
                  <span className="absolute right-3.5 top-4 w-3 h-3 rounded-full bg-fuchsia-500 shadow-[0_0_10px_rgba(255,0,234,0.7)]" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Range Settings */}
        <div className="glass p-5 rounded-3xl space-y-4" id="section-range">
          <div>
            <div className="flex justify-between items-baseline mb-2">
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">
                Limit (0 to Max)
              </h2>
              <span className="text-xl font-black font-mono tracking-wider text-cyan-400">
                0 — {maxNumber}
              </span>
            </div>
            
            <input
              id="range-slider"
              type="range"
              min={10}
              max={2000}
              step={10}
              value={maxNumber}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setMaxNumber(val);
                haptics.vibrateLight();
              }}
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-white/10 rounded-lg appearance-none"
            />
          </div>

          {/* Quick presets */}
          <div className="flex flex-wrap gap-2 justify-between pt-1" id="presets-container">
            {presets.map((p) => (
              <button
                key={p}
                id={`preset-${p}`}
                onClick={() => {
                  setMaxNumber(p);
                  audio.playTap();
                  haptics.vibrateMedium();
                }}
                className={`flex-1 min-w-[50px] py-1.5 text-xs font-mono font-bold rounded-lg transition-all border
                  ${
                    maxNumber === p
                      ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 border-transparent text-white'
                      : 'bg-white/5 border-white/5 text-gray-300 hover:bg-white/10'
                  }
                `}
                type="button"
              >
                0-{p}
              </button>
            ))}
          </div>
        </div>

        {/* Sounds & Haptics */}
        <div className="glass p-4 rounded-3xl grid grid-cols-2 gap-3" id="section-feedback">
          <button
            id="btn-toggle-sound"
            onClick={toggleSound}
            className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all cursor-pointer
              ${
                soundEnabled
                  ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400'
                  : 'border-white/5 bg-white/5 text-gray-500'
              }
            `}
            type="button"
          >
            {soundEnabled ? <Volume2 className="w-5 h-5 flex-shrink-0" /> : <VolumeX className="w-5 h-5 flex-shrink-0" />}
            <div className="leading-tight">
              <div className="text-xs font-bold">Sound Cues</div>
              <div className="text-[10px] opacity-75">{soundEnabled ? 'Enabled' : 'Muted'}</div>
            </div>
          </button>

          <button
            id="btn-toggle-haptics"
            onClick={toggleHaptics}
            className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all cursor-pointer
              ${
                hapticsEnabled
                  ? 'border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-400'
                  : 'border-white/5 bg-white/5 text-gray-500'
              }
            `}
            type="button"
          >
            <Smartphone className="w-5 h-5 flex-shrink-0" />
            <div className="leading-tight">
              <div className="text-xs font-bold">Vibration</div>
              <div className="text-[10px] opacity-75">{hapticsEnabled ? 'On Tap' : 'Off'}</div>
            </div>
          </button>
        </div>

        {/* Stats Summary */}
        {stats.totalGames > 0 && (
          <div className="bg-black/40 p-4 rounded-2xl space-y-2 text-xs text-gray-400 border border-white/10" id="section-stats">
            <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-widest text-cyan-400">
              <span className="flex items-center gap-1"><Trophy className="w-3.5 h-3.5" /> Stats History</span>
              <button
                id="btn-reset-stats"
                onClick={() => {
                  audio.playDelete();
                  onResetStats();
                }}
                className="hover:text-red-400 font-mono text-[9px] transition-colors flex items-center gap-0.5 cursor-pointer"
                type="button"
              >
                <RotateCcw className="w-2.5 h-2.5" /> Reset
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1 text-center font-semibold">
              <div className="glass py-2 px-1 rounded-xl">
                <div className="text-gray-400 text-[9px] uppercase font-mono tracking-wider">Games</div>
                <div className="text-sm font-bold text-white font-mono">{stats.totalGames}</div>
              </div>
              <div className="glass py-2 px-1 rounded-xl border-cyan-500/10">
                <div className="text-cyan-400 text-[9px] uppercase font-mono tracking-wider">{player1Name.split(' ')[0]}</div>
                <div className="text-sm font-bold text-cyan-300 font-mono">{stats.player1Wins}</div>
              </div>
              <div className="glass py-2 px-1 rounded-xl border-fuchsia-500/10">
                <div className="text-fuchsia-400 text-[9px] uppercase font-mono tracking-wider">{player2Name.split(' ')[0]}</div>
                <div className="text-sm font-bold text-fuchsia-300 font-mono">{stats.player2Wins}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Button */}
      <div className="pt-6 space-y-3">
        <motion.button
          id="btn-save-settings"
          whileTap={{ scale: 0.97 }}
          onClick={handleStartGame}
          className="w-full h-14 bg-gradient-to-r from-cyan-500 to-fuchsia-600 hover:from-cyan-400 hover:to-fuchsia-500 text-white font-black rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/10 cursor-pointer text-base uppercase tracking-wider"
          type="button"
        >
          <span>{isMultiplayer ? 'Lock & Set Duel Limits' : 'Pick Secret Numbers'}</span>
          <ArrowRight className="w-5 h-5" />
        </motion.button>

        {onBack && (
          <motion.button
            id="btn-back-settings"
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              audio.playTap();
              haptics.vibrateLight();
              onBack();
            }}
            className="w-full h-11 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 hover:text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer text-xs uppercase tracking-wider"
            type="button"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Main Menu</span>
          </motion.button>
        )}
      </div>
    </div>
  );
}
