/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Trophy, ArrowRight, RotateCcw, Settings, Star, TrendingUp } from 'lucide-react';
import { GuessEntry } from '../types';
import { audio } from './AudioEngine';
import { haptics } from './Haptics';

interface GameOverScreenProps {
  winnerName: string;
  winnerColor: 'blue' | 'rose';
  player1Name: string;
  player2Name: string;
  player1Secret: number;
  player2Secret: number;
  player1Guesses: GuessEntry[];
  player2Guesses: GuessEntry[];
  onPlayAgain: () => void;
  onChangeSettings: () => void;
}

export default function GameOverScreen({
  winnerName,
  winnerColor,
  player1Name,
  player2Name,
  player1Secret,
  player2Secret,
  player1Guesses,
  player2Guesses,
  onPlayAgain,
  onChangeSettings,
}: GameOverScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Confetti particles effect on mount
  useEffect(() => {
    audio.playVictory();
    haptics.vibrateSuccess();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.offsetWidth * window.devicePixelRatio);
    let height = (canvas.height = canvas.offsetHeight * window.devicePixelRatio);

    const colors = ['#3b82f6', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'];
    const particles: Array<{
      x: number;
      y: number;
      size: number;
      color: string;
      speedX: number;
      speedY: number;
      rot: number;
      rotSpeed: number;
    }> = [];

    // Seed particles
    for (let i = 0; i < 120; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * -height - 20,
        size: Math.random() * 8 + 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        speedX: Math.random() * 4 - 2,
        speedY: Math.random() * 5 + 4,
        rot: Math.random() * 360,
        rotSpeed: Math.random() * 4 - 2,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.y += p.speedY;
        p.x += p.speedX;
        p.rot += p.rotSpeed;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();

        // Recycle particles
        if (p.y > height) {
          p.y = -20;
          p.x = Math.random() * width;
        }
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    const handleResize = () => {
      if (!canvasRef.current) return;
      width = canvasRef.current.width = canvasRef.current.offsetWidth * window.devicePixelRatio;
      height = canvasRef.current.height = canvasRef.current.offsetHeight * window.devicePixelRatio;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const isBlue = winnerColor === 'blue';
  const colorTheme = isBlue
    ? {
        textAccent: 'neon-p1',
        bgAccent: 'bg-cyan-500/5',
        btnPrimary: 'bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 shadow-cyan-500/10',
        gradientGlow: 'from-cyan-500/10 via-transparent to-transparent',
      }
    : {
        textAccent: 'neon-p2',
        bgAccent: 'bg-fuchsia-500/5',
        btnPrimary: 'bg-gradient-to-r from-fuchsia-500 to-indigo-600 hover:from-fuchsia-400 hover:to-indigo-500 shadow-fuchsia-500/10',
        gradientGlow: 'from-fuchsia-500/10 via-transparent to-transparent',
      };

  return (
    <div className="w-full max-w-md mx-auto px-4 py-6 flex flex-col min-h-[92vh] justify-between relative text-[#e2e8f0]" id="game-over-root">
      {/* Background canvas confetti */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
        style={{ opacity: 0.85 }}
      />

      {/* Top Victory display */}
      <div className="space-y-6 relative z-20">
        <div className="text-center space-y-2 pt-6">
          <div className="inline-flex relative mb-3" id="victory-trophy-badge">
            {/* Pulsing decoration behind */}
            <span className="absolute inset-0 rounded-full scale-150 opacity-20 bg-amber-400 blur-xl animate-pulse" />
            <div className="inline-flex items-center justify-center p-5 bg-gradient-to-tr from-amber-500 to-yellow-400 text-white rounded-3xl shadow-xl border-4 border-white/10 transform -rotate-6">
              <Trophy className="w-10 h-10 animate-bounce-slow" />
            </div>
          </div>
          <h1 className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-400 flex items-center justify-center gap-1.5">
            <Star className="w-3.5 h-3.5 fill-amber-400" /> Duel Winner <Star className="w-3.5 h-3.5 fill-amber-400" />
          </h1>
          <h2 className={`text-4xl font-black tracking-tight leading-tight uppercase italic ${colorTheme.textAccent}`}>
            {winnerName}
          </h2>
          <p className="text-sm text-gray-400">
            Guessed the opponent's secret number!
          </p>
        </div>

        {/* Secrets Revealed stats */}
        <div className="grid grid-cols-2 gap-3.5" id="secrets-revealed">
          <div className="glass p-4 rounded-2xl text-center">
            <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-gray-500 block mb-1">
              {player1Name}'s Secret
            </span>
            <span className="text-3xl font-black font-mono tracking-wider neon-p1 block">
              {player1Secret}
            </span>
            <span className="text-[10px] font-mono text-gray-400 block mt-1">
              in {player2Guesses.length} turns
            </span>
          </div>

          <div className="glass p-4 rounded-2xl text-center">
            <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-gray-500 block mb-1">
              {player2Name}'s Secret
            </span>
            <span className="text-3xl font-black font-mono tracking-wider neon-p2 block">
              {player2Secret}
            </span>
            <span className="text-[10px] font-mono text-gray-400 block mt-1">
              in {player1Guesses.length} turns
            </span>
          </div>
        </div>

        {/* Dynamic Dual History comparison table */}
        <div className="glass p-4.5 rounded-3xl space-y-3" id="recap-table-container">
          <h3 className="text-[10px] font-mono font-bold uppercase text-gray-400 tracking-widest flex items-center gap-1.5 pb-2 border-b border-white/5">
            <TrendingUp className="w-4 h-4 text-cyan-400" /> Match recap logs
          </h3>

          <div className="grid grid-cols-2 gap-4 text-xs h-[140px] overflow-y-auto pr-1 custom-scrollbar" id="recap-columns">
            {/* Player 1 guesses against Player 2 */}
            <div className="space-y-1.5">
              <div className="font-bold font-mono text-cyan-400 text-[9px] uppercase tracking-wider truncate">
                {player1Name} guess
              </div>
              <div className="space-y-1">
                {player1Guesses.map((g, i) => (
                  <div key={g.id} className="flex justify-between items-center p-1.5 bg-white/5 border border-white/5 rounded-lg text-white font-mono text-[11px]">
                    <span className="text-gray-500 font-bold">#{i + 1}</span>
                    <span className="font-extrabold">{g.value}</span>
                    <span>{g.direction === 'up' ? '⬆️' : g.direction === 'down' ? '⬇️' : '🏆'}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Player 2 guesses against Player 1 */}
            <div className="space-y-1.5">
              <div className="font-bold font-mono text-fuchsia-400 text-[9px] uppercase tracking-wider truncate">
                {player2Name} guess
              </div>
              <div className="space-y-1">
                {player2Guesses.map((g, i) => (
                  <div key={g.id} className="flex justify-between items-center p-1.5 bg-white/5 border border-white/5 rounded-lg text-white font-mono text-[11px]">
                    <span className="text-gray-500 font-bold">#{i + 1}</span>
                    <span className="font-extrabold">{g.value}</span>
                    <span>{g.direction === 'up' ? '⬆️' : g.direction === 'down' ? '⬇️' : '🏆'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Play Again actions */}
      <div className="space-y-3 relative z-20 pt-6">
        <motion.button
          id="btn-play-again"
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            audio.playConfirm();
            haptics.vibrateSuccess();
            onPlayAgain();
          }}
          className={`w-full h-14 text-white font-black rounded-2xl flex items-center justify-center gap-2 text-base uppercase tracking-wider shadow-lg cursor-pointer ${colorTheme.btnPrimary}`}
          type="button"
        >
          <RotateCcw className="w-5 h-5" />
          <span>Play Again</span>
        </motion.button>

        <motion.button
          id="btn-change-settings"
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            audio.playTap();
            haptics.vibrateLight();
            onChangeSettings();
          }}
          className="w-full h-12 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-black rounded-2xl flex items-center justify-center gap-2 text-xs uppercase tracking-wider transition-all cursor-pointer"
          type="button"
        >
          <Settings className="w-4 h-4" />
          <span>Change Game Settings</span>
        </motion.button>
      </div>
    </div>
  );
}
