/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowUp, ArrowDown, HelpCircle, History, Landmark, AlertTriangle } from 'lucide-react';
import { GuessEntry } from '../types';
import NumericKeypad from './NumericKeypad';
import { audio } from './AudioEngine';
import { haptics } from './Haptics';

interface GameplayBoardProps {
  activePlayerName: string;
  opponentPlayerName: string;
  activePlayerColor: 'blue' | 'rose';
  pastGuesses: GuessEntry[];
  maxNumber: number;
  onGuessSubmitted: (guess: number) => void;
  isMyTurn?: boolean;
}

export default function GameplayBoard({
  activePlayerName,
  opponentPlayerName,
  activePlayerColor,
  pastGuesses,
  maxNumber,
  onGuessSubmitted,
  isMyTurn = true,
}: GameplayBoardProps) {
  const [currentGuess, setCurrentGuess] = useState('');

  // Calculate known range dynamically based on past guesses
  let minPossible = 0;
  let maxPossible = maxNumber;

  pastGuesses.forEach((g) => {
    if (g.direction === 'up') {
      // Secret is higher than g.value, so it must be >= g.value + 1
      minPossible = Math.max(minPossible, g.value + 1);
    } else if (g.direction === 'down') {
      // Secret is lower than g.value, so it must be <= g.value - 1
      maxPossible = Math.min(maxPossible, g.value - 1);
    }
  });

  const guessNum = parseInt(currentGuess, 10);
  const isOutOfKnownRange =
    !isNaN(guessNum) && (guessNum < minPossible || guessNum > maxPossible);

  const handleSubmit = () => {
    const parsed = parseInt(currentGuess, 10);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= maxNumber) {
      onGuessSubmitted(parsed);
      setCurrentGuess('');
    } else {
      haptics.vibrateError();
      audio.playError();
    }
  };

  const isBlue = activePlayerColor === 'blue';
  const colorTheme = isBlue
    ? {
        textAccent: 'neon-p1',
        bgAccent: 'bg-cyan-500/5',
        badgeBg: 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 glow-box-p1',
        borderAccent: 'border-cyan-500/20',
        barColor: 'bg-cyan-400',
        pinBg: 'bg-cyan-400 shadow-[0_0_10px_#00f2ff]',
      }
    : {
        textAccent: 'neon-p2',
        bgAccent: 'bg-fuchsia-500/5',
        badgeBg: 'bg-fuchsia-500/10 border border-fuchsia-500/30 text-fuchsia-400 glow-box-p2',
        borderAccent: 'border-fuchsia-500/20',
        barColor: 'bg-fuchsia-500',
        pinBg: 'bg-fuchsia-400 shadow-[0_0_10px_#ff00ea]',
      };

  // Percentages for the range slider representation
  const minPercent = Math.max(0, Math.min(100, (minPossible / maxNumber) * 100));
  const maxPercent = Math.max(0, Math.min(100, (maxPossible / maxNumber) * 100));

  return (
    <div className="w-full max-w-md mx-auto px-4 py-4 flex flex-col min-h-[92vh] justify-between text-[#e2e8f0]" id="gameplay-board-root">
      {/* Top turn indicator and helper stats */}
      <div className="space-y-4">
        <div className="flex justify-between items-center glass px-4 py-3 rounded-2xl animate-pulse" id="turn-banner">
          <div>
            <div className="text-[10px] uppercase font-mono font-bold tracking-widest text-gray-500">Active Turn</div>
            <div className={`text-base font-black uppercase tracking-wider ${colorTheme.textAccent}`}>{activePlayerName}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase font-mono font-bold tracking-widest text-gray-500">Guesses Made</div>
            <div className="text-sm font-bold text-white font-mono">{pastGuesses.length}</div>
          </div>
        </div>

        {/* Range Helper / Visual Boundary Bar */}
        <div className="glass p-4.5 rounded-3xl space-y-3" id="range-visualizer">
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px] font-mono">Possible Range</span>
            <span className="font-extrabold font-mono text-cyan-400 bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-lg text-sm tracking-wider">
              {minPossible} — {maxPossible}
            </span>
          </div>

          {/* Graphical timeline */}
          <div className="relative h-6 bg-white/5 rounded-full overflow-hidden border border-white/10">
            {/* Out-of-bounds left shroud */}
            <div
              className="absolute left-0 top-0 bottom-0 bg-black/40"
              style={{ width: `${minPercent}%` }}
            />
            
            {/* Active zone */}
            <div
              className={`absolute top-0 bottom-0 opacity-20 ${colorTheme.barColor}`}
              style={{ left: `${minPercent}%`, right: `${100 - maxPercent}%` }}
            />

            {/* Out-of-bounds right shroud */}
            <div
              className="absolute right-0 top-0 bottom-0 bg-black/40"
              style={{ width: `${100 - maxPercent}%` }}
            />

            {/* Labels at extremes */}
            <div className="absolute inset-0 flex justify-between items-center px-3.5 text-[9px] font-bold font-mono text-gray-500 pointer-events-none tracking-widest">
              <span>0</span>
              <span>{maxNumber}</span>
            </div>

            {/* Pin for the current typing guess */}
            {!isNaN(guessNum) && guessNum >= 0 && guessNum <= maxNumber && (
              <motion.div
                key={guessNum}
                id="guess-marker-pin"
                className={`absolute top-0 bottom-0 w-0.5 flex items-center justify-center ${colorTheme.barColor}`}
                style={{ left: `${(guessNum / maxNumber) * 100}%` }}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
              >
                <div className={`w-2.5 h-2.5 rounded-full -mt-5 border border-white ${colorTheme.pinBg}`} />
              </motion.div>
            )}
          </div>
        </div>

        {/* Guesses Log Column */}
        <div className="glass p-4 rounded-3xl flex flex-col h-[140px]" id="history-box">
          <div className="flex items-center gap-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest pb-2 font-mono border-b border-white/5">
            <History className="w-3.5 h-3.5 text-cyan-400" /> Duel logs against {opponentPlayerName}
          </div>

          {pastGuesses.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-xs text-gray-500 space-y-1" id="history-empty">
              <HelpCircle className="w-5 h-5 stroke-1 text-gray-600 animate-pulse" />
              <span>No logs recorded. Submit a guess!</span>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-1.5 pt-2 pr-1 custom-scrollbar" id="history-list">
              <AnimatePresence initial={false}>
                {pastGuesses.slice().reverse().map((g, index) => {
                  const isUp = g.direction === 'up';
                  return (
                    <motion.div
                      key={g.id}
                      id={`history-row-${g.id}`}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between p-2 bg-white/5 border border-white/5 rounded-xl text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-gray-500 font-mono text-[10px]">#{pastGuesses.length - index}</span>
                        <span className="font-extrabold text-sm text-white font-mono">{g.value}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {isUp ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold font-mono text-[10px] uppercase tracking-wider shadow-[0_0_8px_rgba(245,158,11,0.1)]">
                            <ArrowUp className="w-3 h-3 stroke-[3px] animate-bounce-slow" /> Higher
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold font-mono text-[10px] uppercase tracking-wider shadow-[0_0_8px_rgba(6,182,212,0.1)]">
                            <ArrowDown className="w-3 h-3 stroke-[3px] animate-bounce-slow" /> Lower
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        {isMyTurn ? (
          <>
            {/* Current Active Input Display */}
            <div className="relative overflow-hidden glass p-5 rounded-3xl flex flex-col items-center justify-center min-h-[96px] space-y-1" id="active-input-container">
              <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold font-mono">Your Guess</div>
              <div className={`text-4xl font-black font-mono tracking-widest ${colorTheme.textAccent}`} id="current-typing-guess">
                {currentGuess === '' ? (
                  <span className="text-gray-700 font-bold animate-pulse">—</span>
                ) : (
                  currentGuess
                )}
              </div>

              {/* Interactive Range Helper alert */}
              <AnimatePresence>
                {isOutOfKnownRange && (
                  <motion.div
                    id="warning-out-of-range"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="flex items-center gap-1 text-[9px] font-bold font-mono uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg"
                  >
                    <AlertTriangle className="w-3 h-3 flex-shrink-0 animate-pulse" />
                    <span>Advice: Play in range {minPossible} to {maxPossible}!</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        ) : (
          <div className="p-5 glass rounded-3xl flex flex-col items-center justify-center min-h-[96px] space-y-2 text-center" id="opponent-turn-banner">
            <div className="flex items-center gap-2 text-amber-400 font-mono font-bold text-[10px] uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              Opponent's Turn
            </div>
            <p className="text-sm font-semibold text-white uppercase tracking-wider">
              {activePlayerName} is locking in a guess...
            </p>
            <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">
              Keep an eye on the possible range!
            </p>
          </div>
        )}
      </div>

      {/* Tactile Keypad */}
      <div className="pt-4">
        {isMyTurn ? (
          <NumericKeypad
            value={currentGuess}
            onChange={setCurrentGuess}
            onSubmit={handleSubmit}
            maxLimit={maxNumber}
            submitDisabled={currentGuess === '' || isNaN(guessNum) || guessNum < 0 || guessNum > maxNumber}
            submitLabel="Lock Guess"
          />
        ) : (
          <div className="h-[212px] flex items-center justify-center glass rounded-3xl border border-white/5 bg-black/20" id="keypad-disabled-shroud">
            <span className="text-[10px] font-mono uppercase text-gray-500 tracking-widest animate-pulse">
              Keypad Locked During Opponent Turn
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
