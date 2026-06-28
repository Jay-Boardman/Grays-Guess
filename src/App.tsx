/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wifi, Loader2, Copy, Check, Info, ArrowLeft } from 'lucide-react';
import { GameConfig, GuessEntry, GameScreen, GameStats } from './types';
import LobbyScreen from './components/LobbyScreen';
import SettingsScreen from './components/SettingsScreen';
import SecretSelection from './components/SecretSelection';
import PassTransition from './components/PassTransition';
import GameplayBoard from './components/GameplayBoard';
import GameOverScreen from './components/GameOverScreen';
import { audio } from './components/AudioEngine';
import { haptics } from './components/Haptics';

// Default configurations
const DEFAULT_CONFIG: GameConfig = {
  maxNumber: 100,
  player1Name: 'Player 1',
  player2Name: 'Player 2',
  soundEnabled: true,
  hapticsEnabled: true,
};

const DEFAULT_STATS: GameStats = {
  player1Wins: 0,
  player2Wins: 0,
  totalGames: 0,
  averageGuessesToWin: 0,
};

export default function App() {
  const [config, setConfig] = useState<GameConfig>(() => {
    try {
      const saved = localStorage.getItem('guessing_game_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Initialize engines
        audio.setEnabled(parsed.soundEnabled ?? true);
        haptics.setEnabled(parsed.hapticsEnabled ?? true);
        return parsed;
      }
    } catch (e) {
      console.warn('Failed to load config from localStorage:', e);
    }
    return DEFAULT_CONFIG;
  });

  const [stats, setStats] = useState<GameStats>(() => {
    try {
      const saved = localStorage.getItem('guessing_game_stats');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load stats from localStorage:', e);
    }
    return DEFAULT_STATS;
  });

  // Client Session Player UUID
  const [playerId] = useState(() => {
    let id = localStorage.getItem('guessing_game_player_id');
    if (!id) {
      id = `p-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('guessing_game_player_id', id);
    }
    return id;
  });

  // Mode & Lobby active state variables
  const [gameMode, setGameMode] = useState<'local' | 'multiplayer' | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [roomState, setRoomState] = useState<any>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Connection config parameters for multiplayer
  const [multiplayerRoomId, setMultiplayerRoomId] = useState<string | null>(null);
  const [multiplayerPlayerName, setMultiplayerPlayerName] = useState<string | null>(null);
  const [multiplayerIsHost, setMultiplayerIsHost] = useState(false);

  // Local game active state variables
  const [screen, setScreen] = useState<GameScreen>('setup');
  const [player1Secret, setPlayer1Secret] = useState<number | null>(null);
  const [player2Secret, setPlayer2Secret] = useState<number | null>(null);
  const [player1Guesses, setPlayer1Guesses] = useState<GuessEntry[]>([]);
  const [player2Guesses, setPlayer2Guesses] = useState<GuessEntry[]>([]);
  const [currentTurn, setCurrentTurn] = useState<1 | 2>(1);
  const [winner, setWinner] = useState<1 | 2 | null>(null);
  const [nextTargetPlayer, setNextTargetPlayer] = useState<1 | 2>(1);

  // WebSocket Connection Handler for Multiplayer
  useEffect(() => {
    if (gameMode !== 'multiplayer' || !multiplayerRoomId || !multiplayerPlayerName) return;

    let active = true;
    let socket: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    function connect() {
      if (!active) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}`;
      console.log(`Connecting to WebSocket: ${wsUrl}`);
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        if (!active) {
          socket?.close();
          return;
        }
        setConnectionError(null);
        socket?.send(JSON.stringify({
          type: 'join',
          roomId: multiplayerRoomId,
          playerId,
          playerName: multiplayerPlayerName,
        }));
      };

      socket.onmessage = (event) => {
        if (!active) return;
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'room_state') {
            setRoomState(data);
          } else if (data.type === 'error') {
            setConnectionError(data.message);
          }
        } catch (err) {
          console.error("Failed to parse WebSocket message:", err);
        }
      };

      socket.onclose = () => {
        if (!active) return;
        console.log("WebSocket disconnected. Retrying reconnection in 2 seconds...");
        reconnectTimeout = setTimeout(connect, 2000);
      };

      socket.onerror = (err) => {
        console.error("WebSocket error:", err);
      };

      setWs(socket);
    }

    connect();

    return () => {
      active = false;
      if (socket) {
        socket.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [gameMode, multiplayerRoomId, multiplayerPlayerName, playerId]);

  // Audio/Haptic triggers for Multiplayer state updates
  const lastStatusRef = useRef<string | null>(null);
  const lastGuessesCountRef = useRef<number>(0);

  useEffect(() => {
    if (!roomState) return;

    const currentStatus = roomState.status;
    const currentGuessesCount = (roomState.player1Guesses?.length || 0) + (roomState.player2Guesses?.length || 0);

    if (lastStatusRef.current !== null && lastStatusRef.current !== currentStatus) {
      if (currentStatus === 'secret_selection' || currentStatus === 'playing') {
        audio.playConfirm();
        haptics.vibrateSuccess();
      } else if (currentStatus === 'game_over') {
        audio.playConfirm();
        haptics.vibrateSuccess();
      }
    }

    if (lastGuessesCountRef.current < currentGuessesCount) {
      // A guess was submitted
      const isGameOver = currentStatus === 'game_over';
      if (isGameOver) {
        audio.playConfirm();
        haptics.vibrateSuccess();
      } else {
        audio.playSwoosh();
        haptics.vibrateMedium();
      }
    }

    lastStatusRef.current = currentStatus;
    lastGuessesCountRef.current = currentGuessesCount;
  }, [roomState]);

  // Handle Multiplayer Selection
  const handleJoinMultiplayer = (roomId: string, name: string, isHost: boolean) => {
    setMultiplayerRoomId(roomId);
    setMultiplayerPlayerName(name);
    setMultiplayerIsHost(isHost);
    setGameMode('multiplayer');
  };

  // Sync config changes to localStorage (Local mode only)
  const saveConfig = (newConfig: GameConfig) => {
    setConfig(newConfig);
    audio.setEnabled(newConfig.soundEnabled);
    haptics.setEnabled(newConfig.hapticsEnabled);
    try {
      localStorage.setItem('guessing_game_config', JSON.stringify(newConfig));
    } catch (e) {
      console.warn('Failed to save config to localStorage:', e);
    }
    // Proceed to Secret Selection for Player 1
    setScreen('player1_secret');
  };

  const handleResetStats = () => {
    setStats(DEFAULT_STATS);
    try {
      localStorage.setItem('guessing_game_stats', JSON.stringify(DEFAULT_STATS));
    } catch (e) {
      console.warn('Failed to reset stats in localStorage:', e);
    }
  };

  // State Transitions (Local mode only)
  const handlePlayer1SecretConfirmed = (secret: number) => {
    setPlayer1Secret(secret);
    audio.playConfirm();
    setScreen('pass_to_player2_secret');
  };

  const handlePlayer2SecretConfirmed = (secret: number) => {
    setPlayer2Secret(secret);
    audio.playConfirm();
    // After Player 2 sets their secret, Player 1 is ready to guess first!
    setCurrentTurn(1);
    setNextTargetPlayer(1);
    setScreen('pass_to_player');
  };

  const handleReadyAfterTransition = () => {
    setScreen('gameplay');
  };

  const handleGuessSubmitted = (guess: number) => {
    const isPlayer1 = currentTurn === 1;
    const opponentSecret = isPlayer1 ? player2Secret : player1Secret;

    if (opponentSecret === null) return;

    // Generate random/unique ID
    const entryId = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    if (guess === opponentSecret) {
      // CORRECT GUESS! WINNER CHOSEN!
      const newEntry: GuessEntry = {
        id: entryId,
        value: guess,
        direction: 'correct',
        timestamp: Date.now(),
      };

      let finalP1Guesses = player1Guesses;
      let finalP2Guesses = player2Guesses;

      if (isPlayer1) {
        finalP1Guesses = [...player1Guesses, newEntry];
        setPlayer1Guesses(finalP1Guesses);
      } else {
        finalP2Guesses = [...player2Guesses, newEntry];
        setPlayer2Guesses(finalP2Guesses);
      }

      setWinner(currentTurn);

      // Update statistics
      const updatedStats: GameStats = {
        totalGames: stats.totalGames + 1,
        player1Wins: stats.player1Wins + (isPlayer1 ? 1 : 0),
        player2Wins: stats.player2Wins + (!isPlayer1 ? 1 : 0),
        averageGuessesToWin:
          stats.averageGuessesToWin === 0
            ? isPlayer1
              ? finalP1Guesses.length
              : finalP2Guesses.length
            : Math.round(
                ((stats.averageGuessesToWin * stats.totalGames) +
                  (isPlayer1 ? finalP1Guesses.length : finalP2Guesses.length)) /
                  (stats.totalGames + 1) *
                  10
              ) / 10,
      };

      setStats(updatedStats);
      try {
        localStorage.setItem('guessing_game_stats', JSON.stringify(updatedStats));
      } catch (e) {
        console.warn('Failed to save stats to localStorage:', e);
      }

      setScreen('game_over');
    } else {
      // INCORRECT GUESS! GIVE DIRECTIONAL FEEDBACK AND PASS THE PHONE!
      const direction = opponentSecret > guess ? 'up' : 'down';
      const newEntry: GuessEntry = {
        id: entryId,
        value: guess,
        direction,
        timestamp: Date.now(),
      };

      if (isPlayer1) {
        setPlayer1Guesses([...player1Guesses, newEntry]);
        // Switch to Player 2
        setCurrentTurn(2);
        setNextTargetPlayer(2);
      } else {
        setPlayer2Guesses([...player2Guesses, newEntry]);
        // Switch to Player 1
        setCurrentTurn(1);
        setNextTargetPlayer(1);
      }

      audio.playSwoosh();
      setScreen('pass_to_player');
    }
  };

  const handlePlayAgain = () => {
    // Keep names & limit settings, just reset secrets & history
    setPlayer1Secret(null);
    setPlayer2Secret(null);
    setPlayer1Guesses([]);
    setPlayer2Guesses([]);
    setWinner(null);
    setCurrentTurn(1);
    setScreen('player1_secret');
  };

  const handleChangeSettings = () => {
    setPlayer1Secret(null);
    setPlayer2Secret(null);
    setPlayer1Guesses([]);
    setPlayer2Guesses([]);
    setWinner(null);
    setCurrentTurn(1);
    setScreen('setup');
  };

  return (
    <div className="min-h-screen gradient-bg text-[#e2e8f0] flex flex-col justify-start overflow-x-hidden antialiased" id="game-app-container">
      
      {/* Dynamic Screen Mounting with Smooth Framer Motion transitions */}
      <main className="flex-grow flex items-center justify-center py-4 w-full" id="main-content-stage">
        <AnimatePresence mode="wait">
          {gameMode === null ? (
            <motion.div
              key="lobby"
              id="motion-wrapper-lobby"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className="w-full h-full"
            >
              <LobbyScreen
                onSelectLocal={() => setGameMode('local')}
                onJoinMultiplayer={handleJoinMultiplayer}
                savedName1={config.player1Name}
                savedName2={config.player2Name}
              />
            </motion.div>
          ) : gameMode === 'local' ? (
            <motion.div
              key={screen}
              id={`motion-wrapper-${screen}`}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.18, ease: 'easeInOut' }}
              className="w-full h-full"
            >
              {screen === 'setup' && (
                <SettingsScreen
                  initialConfig={config}
                  stats={stats}
                  onSave={saveConfig}
                  onResetStats={handleResetStats}
                  onBack={() => setGameMode(null)}
                />
              )}

              {screen === 'player1_secret' && (
                <SecretSelection
                  playerName={config.player1Name}
                  playerColor="blue"
                  maxNumber={config.maxNumber}
                  onConfirm={handlePlayer1SecretConfirmed}
                  onBack={handleChangeSettings}
                />
              )}

              {screen === 'pass_to_player2_secret' && (
                <PassTransition
                  nextPlayerName={config.player2Name}
                  nextPlayerColor="rose"
                  mode="select_secret"
                  onReady={() => setScreen('player2_secret')}
                />
              )}

              {screen === 'player2_secret' && (
                <SecretSelection
                  playerName={config.player2Name}
                  playerColor="rose"
                  maxNumber={config.maxNumber}
                  onConfirm={handlePlayer2SecretConfirmed}
                  onBack={() => setScreen('player1_secret')} // Step back to P1
                />
              )}

              {screen === 'pass_to_player' && (
                <PassTransition
                  nextPlayerName={nextTargetPlayer === 1 ? config.player1Name : config.player2Name}
                  nextPlayerColor={nextTargetPlayer === 1 ? 'blue' : 'rose'}
                  mode="guess_turn"
                  turnNumber={
                    nextTargetPlayer === 1 ? player1Guesses.length + 1 : player2Guesses.length + 1
                  }
                  onReady={handleReadyAfterTransition}
                />
              )}

              {screen === 'gameplay' && (
                <GameplayBoard
                  activePlayerName={currentTurn === 1 ? config.player1Name : config.player2Name}
                  opponentPlayerName={currentTurn === 1 ? config.player2Name : config.player1Name}
                  activePlayerColor={currentTurn === 1 ? 'blue' : 'rose'}
                  pastGuesses={currentTurn === 1 ? player1Guesses : player2Guesses}
                  maxNumber={config.maxNumber}
                  onGuessSubmitted={handleGuessSubmitted}
                />
              )}

              {screen === 'game_over' && winner && (
                <GameOverScreen
                  winnerName={winner === 1 ? config.player1Name : config.player2Name}
                  winnerColor={winner === 1 ? 'blue' : 'rose'}
                  player1Name={config.player1Name}
                  player2Name={config.player2Name}
                  player1Secret={player1Secret!}
                  player2Secret={player2Secret!}
                  player1Guesses={player1Guesses}
                  player2Guesses={player2Guesses}
                  onPlayAgain={handlePlayAgain}
                  onChangeSettings={handleChangeSettings}
                />
              )}
            </motion.div>
          ) : (
            // Multiplayer rendering based on roomState
            <motion.div
              key={roomState?.status || 'connecting'}
              id={`motion-wrapper-mp-${roomState?.status || 'connecting'}`}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.18, ease: 'easeInOut' }}
              className="w-full h-full"
            >
              {connectionError && (
                <div className="w-full max-w-md mx-auto px-4 py-8 text-center space-y-4">
                  <h2 className="text-xl font-bold text-rose-400 uppercase font-mono">CONNECTION ERROR</h2>
                  <p className="text-sm text-gray-300">{connectionError}</p>
                  <button
                    onClick={() => {
                      setConnectionError(null);
                      setGameMode(null);
                      setRoomState(null);
                    }}
                    className="h-11 px-6 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold rounded-xl uppercase tracking-wider text-xs cursor-pointer"
                  >
                    Return to Lobby
                  </button>
                </div>
              )}

              {!connectionError && !roomState && (
                <div className="w-full max-w-md mx-auto px-4 py-8 text-center space-y-4 flex flex-col items-center justify-center min-h-[50vh]">
                  <Loader2 className="w-10 h-10 animate-spin text-cyan-400" />
                  <p className="text-xs font-mono uppercase tracking-widest text-gray-400">CONNECTING TO CYBER SYSTEM...</p>
                </div>
              )}

              {!connectionError && roomState && (
                <>
                  {roomState.status === 'waiting' && (
                    <div className="w-full max-w-md mx-auto px-4 py-8 flex flex-col min-h-[80vh] justify-between text-center" id="waiting-lobby">
                      <div className="space-y-4">
                        <div className="inline-flex items-center justify-center p-4 bg-white/5 border border-cyan-500/20 rounded-full animate-pulse">
                          <Wifi className="w-8 h-8 text-cyan-400" />
                        </div>
                        <h2 className="text-xl font-black uppercase tracking-wider italic text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">
                          DUEL LOBBY OPENED
                        </h2>
                        <p className="text-xs text-gray-400 max-w-xs mx-auto">
                          Your opponent needs to connect to this room using the code below from their own device!
                        </p>
                      </div>

                      {/* Big Room Code card */}
                      <div className="glass p-8 rounded-3xl border border-white/10 space-y-4 my-6">
                        <span className="text-[10px] font-mono font-bold uppercase text-cyan-400 tracking-widest block">
                          Room Access Code
                        </span>
                        <div className="text-5xl font-black font-mono tracking-widest text-white selection:bg-cyan-500/20">
                          {roomState.roomId}
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(roomState.roomId);
                            setCopied(true);
                            haptics.vibrateLight();
                            audio.playTap();
                            setTimeout(() => setCopied(false), 2000);
                          }}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/5 border border-white/10 text-[10px] font-mono font-bold uppercase text-gray-300 hover:text-white rounded-xl hover:bg-white/10 transition-all cursor-pointer"
                          type="button"
                        >
                          {copied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-green-400" /> Copied Code!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" /> Copy Code
                            </>
                          )}
                        </button>
                      </div>

                      {/* Connection status table */}
                      <div className="glass p-5 rounded-2xl border border-white/5 space-y-3">
                        <div className="flex justify-between items-center text-xs pb-2 border-b border-white/5">
                          <span className="font-bold text-gray-400">DUELISTS</span>
                          <span className="text-[10px] font-mono bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full animate-pulse">
                            Lobby Active
                          </span>
                        </div>
                        <div className="space-y-2.5 text-left">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#00f2ff]" />
                              <span className="font-semibold text-sm text-white">
                                {roomState.player1?.name || 'Host'}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono uppercase text-cyan-400">HOST</span>
                          </div>
                          <div className="flex justify-between items-center opacity-60">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-gray-600 animate-pulse" />
                              <span className="font-semibold text-sm text-gray-400">
                                Waiting for Guest...
                              </span>
                            </div>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-500" />
                          </div>
                        </div>
                      </div>

                      {/* Cancel & Return to Home Button */}
                      <div className="pt-2">
                        <button
                          onClick={() => {
                            audio.playTap();
                            haptics.vibrateLight();
                            if (ws) {
                              ws.close();
                            }
                            setWs(null);
                            setGameMode(null);
                            setRoomState(null);
                          }}
                          className="w-full h-11 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 hover:text-white font-bold rounded-xl uppercase tracking-wider text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
                          type="button"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          <span>Cancel & Return to Home</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {roomState.status === 'setup' && (
                    <>
                      {roomState.yourRole === 1 ? (
                        <SettingsScreen
                          initialConfig={{
                            maxNumber: roomState.maxNumber,
                            player1Name: roomState.player1?.name || 'Host',
                            player2Name: roomState.player2?.name || 'Guest',
                            soundEnabled: roomState.soundEnabled,
                            hapticsEnabled: roomState.hapticsEnabled,
                          }}
                          stats={stats}
                          onSave={(newConfig) => {
                            ws?.send(JSON.stringify({
                              type: 'update_config',
                              maxNumber: newConfig.maxNumber,
                              soundEnabled: newConfig.soundEnabled,
                              hapticsEnabled: newConfig.hapticsEnabled,
                            }));
                          }}
                          onResetStats={handleResetStats}
                          isMultiplayer={true}
                        />
                      ) : (
                        <div className="w-full max-w-md mx-auto px-4 py-8 flex flex-col min-h-[70vh] justify-center text-center space-y-6" id="guest-setup-waiting">
                          <div className="inline-flex items-center justify-center p-4 bg-white/5 border border-fuchsia-500/20 rounded-full animate-bounce-slow">
                            <Loader2 className="w-8 h-8 text-fuchsia-400 animate-spin" />
                          </div>
                          <div className="space-y-2">
                            <h2 className="text-xl font-black uppercase tracking-wider italic text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-indigo-400">
                              ESTABLISHING DUEL LIMITS
                            </h2>
                            <p className="text-sm font-semibold text-white">
                              {roomState.player1?.name || 'Host'} is configuring game rules...
                            </p>
                            <p className="text-xs text-gray-500 font-mono">
                              Your device will automatically transition once limits are set!
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              audio.playTap();
                              haptics.vibrateLight();
                              if (ws) {
                                ws.close();
                              }
                              setWs(null);
                              setGameMode(null);
                              setRoomState(null);
                            }}
                            className="inline-flex items-center gap-2 self-center px-4 py-2 bg-white/5 border border-white/10 text-[10px] font-mono font-bold uppercase text-gray-400 hover:text-white rounded-xl hover:bg-white/10 transition-all cursor-pointer mt-4"
                            type="button"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span>Leave Room</span>
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  {roomState.status === 'secret_selection' && (
                    <>
                      {((roomState.yourRole === 1 && roomState.player1SecretSet) ||
                        (roomState.yourRole === 2 && roomState.player2SecretSet)) ? (
                          <div className="w-full max-w-md mx-auto px-4 py-8 flex flex-col min-h-[70vh] justify-center text-center space-y-6" id="secret-selection-waiting">
                            <div className="inline-flex items-center justify-center p-4 bg-white/5 border border-cyan-500/20 rounded-full animate-pulse">
                              <Wifi className="w-8 h-8 text-cyan-400" />
                            </div>
                            <div className="space-y-2">
                              <h2 className="text-xl font-black uppercase tracking-wider italic text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500">
                                SECRET TRANSMITTED
                              </h2>
                              <p className="text-sm font-semibold text-white">
                                Your secret is safely locked in!
                              </p>
                              <p className="text-xs text-gray-500 font-mono">
                                Waiting for {roomState.yourRole === 1 ? roomState.player2?.name : roomState.player1?.name} to select theirs...
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                audio.playTap();
                                haptics.vibrateLight();
                                if (ws) {
                                  ws.close();
                                }
                                setWs(null);
                                setGameMode(null);
                                setRoomState(null);
                              }}
                              className="inline-flex items-center gap-2 self-center px-4 py-2 bg-white/5 border border-white/10 text-[10px] font-mono font-bold uppercase text-gray-400 hover:text-white rounded-xl hover:bg-white/10 transition-all cursor-pointer mt-4"
                              type="button"
                            >
                              <ArrowLeft className="w-3.5 h-3.5" />
                              <span>Leave Duel</span>
                            </button>
                          </div>
                      ) : (
                        <SecretSelection
                          playerName={roomState.yourRole === 1 ? roomState.player1?.name : roomState.player2?.name}
                          playerColor={roomState.yourRole === 1 ? 'blue' : 'rose'}
                          maxNumber={roomState.maxNumber}
                          onConfirm={(secret) => {
                            ws?.send(JSON.stringify({
                              type: 'set_secret',
                              secret,
                            }));
                          }}
                          onBack={() => {
                            ws?.send(JSON.stringify({ type: 'change_settings' }));
                          }}
                        />
                      )}
                    </>
                  )}

                  {roomState.status === 'playing' && (
                    <GameplayBoard
                      activePlayerName={roomState.currentTurn === 1 ? roomState.player1?.name : roomState.player2?.name}
                      opponentPlayerName={roomState.currentTurn === 1 ? roomState.player2?.name : roomState.player1?.name}
                      activePlayerColor={roomState.currentTurn === 1 ? 'blue' : 'rose'}
                      pastGuesses={roomState.currentTurn === 1 ? roomState.player1Guesses : roomState.player2Guesses}
                      maxNumber={roomState.maxNumber}
                      onGuessSubmitted={(guess) => {
                        ws?.send(JSON.stringify({
                          type: 'submit_guess',
                          value: guess,
                        }));
                      }}
                      isMyTurn={roomState.currentTurn === roomState.yourRole}
                    />
                  )}

                  {roomState.status === 'game_over' && (
                    <GameOverScreen
                      winnerName={roomState.winner === 1 ? roomState.player1?.name : roomState.player2?.name}
                      winnerColor={roomState.winner === 1 ? 'blue' : 'rose'}
                      player1Name={roomState.player1?.name || 'Player 1'}
                      player2Name={roomState.player2?.name || 'Player 2'}
                      player1Secret={roomState.secretsRevealed?.player1 || 0}
                      player2Secret={roomState.secretsRevealed?.player2 || 0}
                      player1Guesses={roomState.player1Guesses}
                      player2Guesses={roomState.player2Guesses}
                      onPlayAgain={() => {
                        ws?.send(JSON.stringify({ type: 'play_again' }));
                      }}
                      onChangeSettings={() => {
                        ws?.send(JSON.stringify({ type: 'change_settings' }));
                      }}
                    />
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Humble Footer containing absolute literal description, clean margins */}
      <footer className="py-4 border-t border-white/5 bg-black/40 text-center text-[10px] text-gray-500 font-mono tracking-widest uppercase" id="page-footer">
        <div>Duo Guess Duel Game</div>
        <div className="opacity-60 text-[9px] mt-0.5">
          {gameMode === 'multiplayer' ? `Multiplayer Mode • Room ${roomState?.roomId || '...'}` : 'Local Pass & Play Mode'}
        </div>
      </footer>
    </div>
  );
}
