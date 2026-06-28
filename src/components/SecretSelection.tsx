/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { KeyRound, Eye, EyeOff, Lock } from 'lucide-react';
import NumericKeypad from './NumericKeypad';
import { audio } from './AudioEngine';
import { haptics } from './Haptics';

interface SecretSelectionProps {
  playerName: string;
  playerColor: 'blue' | 'rose';
  maxNumber: number;
  onConfirm: (secret: number) => void;
  onBack: () => void;
}

export default function SecretSelection({
  playerName,
  playerColor,
  maxNumber,
  onConfirm,
  onBack,
}: SecretSelectionProps) {
  const [valStr, setValStr] = useState('');
  const [reveal, setReveal] = useState(false);

  const parsedVal = parseInt(valStr, 10);
  const isValid = !isNaN(parsedVal) && parsedVal >= 0 && parsedVal <= maxNumber;

  const handleSubmit = () => {
    if (isValid) {
      onConfirm(parsedVal);
    } else {
      haptics.vibrateError();
      audio.playError();
    }
  };

  const colorClasses =
    playerColor === 'blue'
      ? {
          badgeBg: 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 glow-box-p1',
          focusRing: 'focus:ring-cyan-500',
          textAccent: 'neon-p1',
          gradientBg: 'from-cyan-500/10 to-transparent',
          dotBg: 'bg-cyan-400 shadow-[0_0_10px_rgba(0,242,255,0.8)]',
        }
      : {
          badgeBg: 'bg-fuchsia-500/10 border border-fuchsia-500/30 text-fuchsia-400 glow-box-p2',
          focusRing: 'focus:ring-fuchsia-500',
          textAccent: 'neon-p2',
          gradientBg: 'from-fuchsia-500/10 to-transparent',
          dotBg: 'bg-fuchsia-400 shadow-[0_0_10px_rgba(255,0,234,0.8)]',
        };

  return (
    <div className="w-full max-w-md mx-auto px-4 py-6 flex flex-col min-h-[90vh] justify-between text-[#e2e8f0]" id="secret-selection-root">
      {/* Header Info */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <button
            id="btn-secret-back"
            onClick={() => {
              audio.playDelete();
              haptics.vibrateLight();
              onBack();
            }}
            className="text-xs font-semibold text-gray-400 hover:text-white transition-colors py-1.5 px-3 bg-white/5 border border-white/10 rounded-lg cursor-pointer"
            type="button"
          >
            ← Change Settings
          </button>
          <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-500 flex items-center gap-1">
            <Lock className="w-3 h-3 text-fuchsia-500" /> Secret Hider Mode
          </div>
        </div>

        <div className="text-center space-y-2">
          <div className={`inline-flex items-center justify-center p-3.5 rounded-2xl mb-2 ${colorClasses.badgeBg}`} id="player-avatar-badge">
            <KeyRound className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white uppercase italic">
            <span className={colorClasses.textAccent}>{playerName}</span>, set your secret
          </h1>
          <p className="text-sm text-gray-400 max-w-xs mx-auto">
            Pick a secret number from <span className="font-bold text-white">0</span> to <span className="font-bold text-white">{maxNumber}</span>. Keep it hidden!
          </p>
        </div>

        {/* Dynamic Display Area with Shroud */}
        <div className="relative overflow-hidden glass p-6 rounded-3xl flex flex-col items-center justify-center min-h-[120px] space-y-2" id="secret-shroud-container">
          {/* Subtle gradient behind */}
          <div className={`absolute inset-0 bg-gradient-to-b ${colorClasses.gradientBg} opacity-50 pointer-events-none`} />

          <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold font-mono">
            Your Secret Number
          </div>

          <div className="flex items-center gap-3 relative z-10">
            {valStr === '' ? (
              <span className="text-4xl font-black text-gray-700 animate-pulse">
                ?
              </span>
            ) : reveal ? (
              <motion.span
                id="revealed-number"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`text-5xl font-black font-mono tracking-wider ${colorClasses.textAccent}`}
              >
                {valStr}
              </motion.span>
            ) : (
              <div className="flex gap-2 py-2.5 items-center">
                {valStr.split('').map((_, i) => (
                  <motion.div
                    key={i}
                    id={`dot-${i}`}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={`w-3.5 h-3.5 rounded-full ${colorClasses.dotBg}`}
                  />
                ))}
              </div>
            )}

            {valStr !== '' && (
              <button
                id="btn-toggle-reveal"
                onClick={() => {
                  audio.playTap();
                  haptics.vibrateLight();
                  setReveal(!reveal);
                }}
                className="p-2 text-gray-500 hover:text-white transition-colors focus:outline-none cursor-pointer"
                type="button"
                aria-label={reveal ? "Hide number" : "Show number"}
              >
                {reveal ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            )}
          </div>

          <div className="text-[11px] font-medium text-gray-400 pt-1 font-mono">
            {isValid ? (
              <span className="text-emerald-400 font-semibold uppercase tracking-wider">Valid Selection ✓</span>
            ) : valStr !== '' ? (
              <span className="text-rose-400 font-semibold uppercase tracking-wider">Must be 0 to {maxNumber}</span>
            ) : (
              <span className="opacity-60">Enter digits on the keypad</span>
            )}
          </div>
        </div>
      </div>

      {/* Touch Custom Keypad */}
      <div className="pt-6">
        <NumericKeypad
          value={valStr}
          onChange={(newVal) => {
            setValStr(newVal);
            // Auto hide on typing to remain secret
            if (reveal) setReveal(false);
          }}
          onSubmit={handleSubmit}
          maxLimit={maxNumber}
          submitDisabled={!isValid}
          submitLabel="Save & Hide"
        />
      </div>
    </div>
  );
}
