/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { Smartphone, ShieldAlert, CheckCircle, Flame, ArrowRight } from 'lucide-react';
import { audio } from './AudioEngine';
import { haptics } from './Haptics';

interface PassTransitionProps {
  nextPlayerName: string;
  nextPlayerColor: 'blue' | 'rose';
  mode: 'select_secret' | 'guess_turn';
  turnNumber?: number;
  onReady: () => void;
}

export default function PassTransition({
  nextPlayerName,
  nextPlayerColor,
  mode,
  turnNumber = 1,
  onReady,
}: PassTransitionProps) {
  const handleReady = () => {
    haptics.vibrateSuccess();
    audio.playConfirm();
    onReady();
  };

  const isBlue = nextPlayerColor === 'blue';
  const colorTheme = isBlue
    ? {
        cardBg: 'bg-cyan-500/5 border-cyan-500/20 glow-box-p1',
        textAccent: 'neon-p1',
        glow: 'shadow-[0_0_15px_rgba(0,242,255,0.15)]',
        btnBg: 'bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 shadow-cyan-500/10',
      }
    : {
        cardBg: 'bg-fuchsia-500/5 border-fuchsia-500/20 glow-box-p2',
        textAccent: 'neon-p2',
        glow: 'shadow-[0_0_15px_rgba(255,0,234,0.15)]',
        btnBg: 'bg-gradient-to-r from-fuchsia-500 to-indigo-600 hover:from-fuchsia-400 hover:to-indigo-500 shadow-fuchsia-500/10',
      };

  return (
    <div className="w-full h-full max-w-md mx-auto px-4 py-4 sm:py-6 flex flex-col justify-between overflow-y-auto text-center text-[#e2e8f0] custom-scrollbar" id="pass-transition-root">
      {/* Top Banner / Notice */}
      <div className="space-y-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-400 text-[10px] font-mono font-bold uppercase tracking-widest rounded-full border border-amber-500/30 mx-auto animate-pulse" id="privacy-badge">
          <ShieldAlert className="w-3.5 h-3.5" /> Secrecy Guard Active
        </div>
      </div>

      {/* Passing Instructions */}
      <div className="space-y-8 py-10">
        {/* Animated Handing Icon */}
        <div className="relative flex justify-center items-center" id="animated-phone-container">
          <motion.div
            animate={{
              x: [-15, 15, -15],
              rotate: [-10, 10, -10],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="p-6 bg-white/5 rounded-full border border-white/10 shadow-2xl"
          >
            <Smartphone className={`w-16 h-16 ${colorTheme.textAccent}`} />
          </motion.div>
          {/* Subtle radar pulse effect */}
          <span className="absolute inline-flex h-24 w-24 rounded-full bg-cyan-400/10 animate-ping -z-10" />
        </div>

        <div className="space-y-3">
          <div className="text-gray-400 text-xs font-mono font-bold uppercase tracking-widest">
            Pass & Play Action
          </div>
          <h2 className="text-3xl font-black tracking-tight text-white leading-tight uppercase italic">
            Hand phone to <br />
            <span className={colorTheme.textAccent}>{nextPlayerName}</span>
          </h2>
          
          <p className="text-sm text-gray-400 max-w-xs mx-auto">
            {mode === 'select_secret' ? (
              <span>Your opponent has locked in their number! Now it's your turn to choose yours.</span>
            ) : (
              <span>Get ready to guess your opponent's secret number! Turn #{turnNumber}.</span>
            )}
          </p>
        </div>

        {/* Tactile Privacy Card */}
        <div className={`p-4 rounded-2xl border ${colorTheme.cardBg} ${colorTheme.glow} max-w-xs mx-auto text-xs font-medium glass`} id="guard-card">
          <p className="text-gray-300">
            Only tap the button when <span className="font-bold text-white">{nextPlayerName}</span> is holding the phone and others are looking away!
          </p>
        </div>
      </div>

      {/* Action Click-to-Reveal Button */}
      <div className="pt-6">
        <motion.button
          id="btn-confirm-ready"
          whileTap={{ scale: 0.96 }}
          onClick={handleReady}
          className={`w-full h-15 text-white font-black rounded-2xl flex items-center justify-center gap-2 text-base uppercase tracking-wider shadow-lg cursor-pointer ${colorTheme.btnBg}`}
          type="button"
        >
          <span>I am {nextPlayerName}</span>
          <ArrowRight className="w-5 h-5" />
        </motion.button>
      </div>
    </div>
  );
}
