/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface GameConfig {
  maxNumber: number;
  player1Name: string;
  player2Name: string;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
}

export interface GuessEntry {
  id: string;
  value: number;
  direction: 'up' | 'down' | 'correct';
  timestamp: number;
}

export type GameScreen =
  | 'setup'
  | 'player1_secret'
  | 'pass_to_player2_secret'
  | 'player2_secret'
  | 'pass_to_player'
  | 'gameplay'
  | 'game_over';

export interface GameStats {
  player1Wins: number;
  player2Wins: number;
  totalGames: number;
  averageGuessesToWin: number;
}
