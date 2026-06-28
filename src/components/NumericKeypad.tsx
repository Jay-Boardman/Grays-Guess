/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { Delete, Check } from 'lucide-react';
import { audio } from './AudioEngine';
import { haptics } from './Haptics';

interface NumericKeypadProps {
  value: string;
  onChange: (newValue: string) => void;
  onSubmit: () => void;
  maxLimit?: number;
  submitDisabled?: boolean;
  submitLabel?: string;
}

export default function NumericKeypad({
  value,
  onChange,
  onSubmit,
  maxLimit,
  submitDisabled = false,
  submitLabel = 'Confirm',
}: NumericKeypadProps) {
  const handlePress = (num: string) => {
    haptics.vibrateLight();
    audio.playTap();

    if (value === '0' && num !== '0') {
      onChange(num);
      return;
    }

    const nextVal = value + num;
    if (maxLimit !== undefined) {
      const parsed = parseInt(nextVal, 10);
      if (isNaN(parsed) || parsed > maxLimit) {
        haptics.vibrateError();
        audio.playError();
        return;
      }
    }
    onChange(nextVal);
  };

  const handleDelete = () => {
    haptics.vibrateMedium();
    audio.playDelete();
    if (value.length <= 1) {
      onChange('');
    } else {
      onChange(value.slice(0, -1));
    }
  };

  const handleClear = () => {
    haptics.vibrateMedium();
    audio.playDelete();
    onChange('');
  };

  const keyClass = `
    flex items-center justify-center h-14 rounded-2xl text-xl font-bold
    transition-all select-none cursor-pointer active:scale-95 touch-manipulation
    glass hover:bg-white/15 active:bg-white/20 text-[#e2e8f0]
  `;

  return (
    <div className="w-full max-w-sm mx-auto select-none" id="numeric-keypad-container">
      {/* Key grid */}
      <div className="grid grid-cols-3 gap-3">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
          <motion.button
            key={num}
            id={`keypad-btn-${num}`}
            whileTap={{ scale: 0.92 }}
            onClick={() => handlePress(num)}
            className={keyClass}
            type="button"
          >
            {num}
          </motion.button>
        ))}

        {/* Clear Key / Key 0 / Delete Key */}
        <motion.button
          id="keypad-btn-clear"
          whileTap={{ scale: 0.92 }}
          onClick={handleClear}
          className={`${keyClass} text-sm font-semibold text-rose-400 hover:text-rose-300`}
          type="button"
        >
          Clear
        </motion.button>

        <motion.button
          id="keypad-btn-0"
          whileTap={{ scale: 0.92 }}
          onClick={() => handlePress('0')}
          className={keyClass}
          type="button"
        >
          0
        </motion.button>

        <motion.button
          id="keypad-btn-delete"
          whileTap={{ scale: 0.92 }}
          onClick={handleDelete}
          className={`${keyClass} text-cyan-400 hover:text-cyan-300`}
          type="button"
          aria-label="Delete"
        >
          <Delete className="w-5 h-5" />
        </motion.button>
      </div>

      {/* Submit Button */}
      <motion.button
        id="keypad-btn-submit"
        whileTap={{ scale: 0.97 }}
        disabled={submitDisabled || value === ''}
        onClick={() => {
          if (!submitDisabled && value !== '') {
            haptics.vibrateSuccess();
            audio.playConfirm();
            onSubmit();
          }
        }}
        className={`mt-4 w-full h-14 rounded-2xl font-bold flex items-center justify-center gap-2 text-base transition-all select-none cursor-pointer shadow-lg
          ${
            submitDisabled || value === ''
              ? 'bg-white/5 border border-white/5 text-gray-500 cursor-not-allowed shadow-none'
              : 'bg-gradient-to-r from-cyan-500 to-fuchsia-600 hover:from-cyan-400 hover:to-fuchsia-500 text-white font-black shadow-cyan-500/10 active:scale-[0.98]'
          }
        `}
        type="button"
      >
        <Check className="w-5 h-5" />
        <span>{submitLabel}</span>
      </motion.button>
    </div>
  );
}
