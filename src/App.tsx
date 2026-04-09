import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Circle, RotateCcw, Trophy, User, Cpu, Settings2, Info, Square, Triangle, Heart, Star, ChevronRight, ArrowLeft, Gamepad2, Zap, Bird, Play } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { getAIMove } from '@/src/lib/gemini';
import { DinoGame } from '@/src/components/DinoGame';
import { FloppyBird } from '@/src/components/FloppyBird';

type SymbolType = 'X' | 'Circle' | 'Square' | 'Triangle' | 'Heart' | 'Star';
type GameMode = 'PvP' | 'AI';
type Difficulty = 'easy' | 'medium' | 'hard';
type GameState = 'INTRO' | 'GAME_MENU' | 'MODE_SELECTION' | 'SYMBOL_SELECTION' | 'PLAYING' | 'DINO_GAME' | 'FLOPPY_BIRD';

const SYMBOLS: { type: SymbolType; icon: any; color: string; audioFile: string }[] = [
  { type: 'X', icon: X, color: 'text-red-500', audioFile: '/music/bsdk varun.mp3' },
  { type: 'Circle', icon: Circle, color: 'text-blue-500', audioFile: '/music/bull cut varun game player.mp3' },
  { type: 'Square', icon: Square, color: 'text-green-500', audioFile: '/music/varun chutiya game player.mp3' },
  { type: 'Triangle', icon: Triangle, color: 'text-yellow-500', audioFile: '/music/varun higra.mp3' },
  { type: 'Heart', icon: Heart, color: 'text-pink-500', audioFile: '/music/varun hijra game player.mp3' },
  { type: 'Star', icon: Star, color: 'text-purple-500', audioFile: '/music/varun turka.mp3' },
];



const playSymbolSound = (audioFile: string) => {
  const audio = new Audio(audioFile);
  audio.play().catch(e => console.error("Audio playback blocked", e));
};

const bgMusic = new Audio('/music/topitop.mp3');
bgMusic.loop = true;

const WINNING_COMBINATIONS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
  [0, 4, 8], [2, 4, 6]             // Diagonals
];

export default function App() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [gameState, setGameState] = useState<GameState>('INTRO');
  const [hasPlayedIntro, setHasPlayedIntro] = useState(false);
  const [introMusicPlaying, setIntroMusicPlaying] = useState(false);
  const [howmPlay, setHowmPlay] = useState(false);
  const [board, setBoard] = useState<(SymbolType | null)[]>(Array(9).fill(null));
  const [player1Symbol, setPlayer1Symbol] = useState<SymbolType>('X');
  const [player2Symbol, setPlayer2Symbol] = useState<SymbolType>('Circle');
  const [currentPlayer, setCurrentPlayer] = useState<1 | 2>(1);
  const [winner, setWinner] = useState<1 | 2 | 'Draw' | null>(null);
  const [winningLine, setWinningLine] = useState<number[] | null>(null);
  const [gameMode, setGameMode] = useState<GameMode>('AI');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [scores, setScores] = useState({ P1: 0, P2: 0, Draws: 0 });

  // Refs and Effects for intro removed in favor of React audio element

  // Manage background music for mini-games
  useEffect(() => {
    if (gameState === 'DINO_GAME' || gameState === 'FLOPPY_BIRD') {
      bgMusic.play().catch(e => console.error("BGM Playback Error:", e));
    } else {
      bgMusic.pause();
      bgMusic.currentTime = 0; // Reset track to beginning if desired
    }
  }, [gameState]);

  // Handle Keyboard Shortcuts for Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState === 'INTRO') {
        if (e.code === 'Space' || e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          setGameState('GAME_MENU');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  const checkWinner = useCallback((currentBoard: (SymbolType | null)[]) => {
    for (const combo of WINNING_COMBINATIONS) {
      const [a, b, c] = combo;
      if (currentBoard[a] && currentBoard[a] === currentBoard[b] && currentBoard[a] === currentBoard[c]) {
        return { winner: currentBoard[a] === player1Symbol ? 1 : 2, line: combo };
      }
    }
    if (currentBoard.every(cell => cell !== null)) {
      return { winner: 'Draw' as const, line: null };
    }
    return null;
  }, [player1Symbol, player2Symbol]);

  const handleMove = useCallback(async (index: number) => {
    if (board[index] || winner || isAiThinking) return;

    const newBoard = [...board];
    newBoard[index] = currentPlayer === 1 ? player1Symbol : player2Symbol;
    setBoard(newBoard);

    const result = checkWinner(newBoard);
    if (result) {
      setWinner(result.winner as 1 | 2 | 'Draw');
      setWinningLine(result.line);
      if (result.winner === 'Draw') {
        setScores(s => ({ ...s, Draws: s.Draws + 1 }));
      } else {
        const winnerNum = result.winner as 1 | 2;
        setScores(s => ({ ...s, [winnerNum === 1 ? 'P1' : 'P2']: s[winnerNum === 1 ? 'P1' : 'P2'] + 1 }));
        
        const winnerSymbol = winnerNum === 1 ? player1Symbol : player2Symbol;
        const symbolConfig = SYMBOLS.find(s => s.type === winnerSymbol);
        
        playSymbolSound('/music/elhamdil.mp3');
        
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: symbolConfig ? [symbolConfig.color.replace('text-', '#')] : ['#ffffff']
        });
      }
    } else {
      setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
    }
  }, [board, currentPlayer, winner, isAiThinking, checkWinner, player1Symbol, player2Symbol]);

  // AI Move logic
  useEffect(() => {
    if (gameMode === 'AI' && currentPlayer === 2 && !winner && !isAiThinking && gameState === 'PLAYING') {
      const triggerAi = async () => {
        setIsAiThinking(true);
        await new Promise(r => setTimeout(r, 600));
        
        // Map symbols to X/O for the AI prompt to keep it simple for Gemini
        const aiBoard = board.map(s => s === player1Symbol ? 'X' : s === player2Symbol ? 'O' : null);
        const move = await getAIMove(aiBoard, difficulty);
        
        setIsAiThinking(false);
        if (move !== undefined && move !== null) {
          handleMove(move);
        }
      };
      triggerAi();
    }
  }, [currentPlayer, gameMode, board, winner, isAiThinking, difficulty, handleMove, gameState, player1Symbol, player2Symbol]);

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setCurrentPlayer(1);
    setWinner(null);
    setWinningLine(null);
    setIsAiThinking(false);
  };

  if (gameState === 'INTRO') {
    return (
      <div className="fixed inset-0 bg-[#141414] flex items-center justify-center z-50 overflow-hidden">
        {/* Hidden Audio Element */}
        <audio ref={audioRef} src="/music/intro-audio.mp3" preload="auto" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="text-center space-y-8"
        >
          <div className="relative">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 1.5, delay: 0.5, ease: "easeInOut" }}
              className="absolute -bottom-4 left-0 h-1 bg-white/20"
            />
            <motion.h2 
              initial={{ letterSpacing: "0.5em", opacity: 0 }}
              animate={{ letterSpacing: "0.1em", opacity: 1 }}
              transition={{ duration: 2, ease: "circOut" }}
              className="text-white text-4xl md:text-6xl font-black uppercase tracking-tighter font-serif italic"
            >
              Varun Hijra
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 0.6, y: 0 }}
              transition={{ delay: 1.2, duration: 1 }}
              className="text-white text-xs font-mono uppercase tracking-[0.4em] mt-2"
            >
              Game Studio Presents
            </motion.p>
          </div>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ delay: 2, duration: 2, repeat: Infinity }}
            className="text-white/30 text-[10px] font-mono uppercase tracking-widest"
          >
            Initializing System...
          </motion.div>
        </motion.div>

        {/* Background decorative elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]" />
        </div>

        {/* Play Music Button */}
        {!introMusicPlaying && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.5, duration: 0.5 }}
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.currentTime = 0;
                audioRef.current.play().catch(e => console.error("Audio playback blocked:", e));
              }
              setIntroMusicPlaying(true);
            }}
            className="absolute bottom-24 text-white/70 hover:text-white text-[10px] font-mono uppercase tracking-[0.3em] border border-white/20 px-8 py-4 rounded-full transition-all hover:bg-white/10 hover:border-white/40 active:scale-95 group"
          >
            Play Intro
          </motion.button>
        )}

        {/* Continue button - shown after music starts */}
        {introMusicPlaying && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.pause();
              }
              setGameState('GAME_MENU');
            }}
            className="absolute bottom-12 text-white/60 hover:text-white text-[10px] font-mono uppercase tracking-[0.3em] border border-white/20 px-8 py-4 rounded-full transition-all hover:bg-white/10 hover:border-white/40 active:scale-95"
          >
            Continue
          </motion.button>
        )}
      </div>
    );
  }

  if (gameState === 'GAME_MENU') {
    return (
      <div className="min-h-screen bg-[#E4E3E0] flex items-center justify-center p-4 overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl space-y-8 py-8"
        >
          <div className="text-center space-y-2">
            <h2 className="text-5xl font-black uppercase tracking-tighter italic font-serif">Game Hub</h2>
            <p className="text-[10px] font-mono uppercase opacity-60 tracking-widest">Select your digital experience</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <motion.button
              whileHover={{ scale: 1.02, y: -5 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setGameState('MODE_SELECTION')}
              className="group relative p-8 bg-[#141414] text-[#E4E3E0] rounded-3xl text-left overflow-hidden border-4 border-transparent hover:border-white/10 transition-all shadow-[8px_8px_0px_0px_rgba(20,20,20,0.2)]"
            >
              <div className="relative z-10">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center mb-4">
                  <Gamepad2 className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-2xl font-bold uppercase tracking-tighter italic font-serif">Tic Tac Toe</h3>
                <p className="text-[9px] font-mono uppercase opacity-50 mt-1">AI Enhanced Strategy // PvP Mode</p>
              </div>
              <div className="absolute -right-6 -bottom-6 opacity-5 group-hover:opacity-10 transition-opacity">
                <Gamepad2 className="w-32 h-32" />
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02, y: -5 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setGameState('DINO_GAME')}
              className="group relative p-8 bg-white border-4 border-[#141414] text-[#141414] rounded-3xl text-left overflow-hidden hover:bg-[#F5F5F5] transition-all shadow-[8px_8px_0px_0px_rgba(20,20,20,1)]"
            >
              <div className="relative z-10">
                <div className="w-10 h-10 bg-[#141414]/5 rounded-xl flex items-center justify-center mb-4">
                  <Zap className="w-5 h-5 text-[#141414]" />
                </div>
                <h3 className="text-2xl font-bold uppercase tracking-tighter italic font-serif">Dino Run</h3>
                <p className="text-[9px] font-mono uppercase opacity-50 mt-1">Infinite Loop // Reflex Test</p>
              </div>
              <div className="absolute -right-6 -bottom-6 opacity-5 group-hover:opacity-10 transition-opacity">
                <Zap className="w-32 h-32" />
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02, y: -5 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setGameState('FLOPPY_BIRD')}
              className="group relative p-8 bg-[#facc15] border-4 border-[#141414] text-[#141414] rounded-3xl text-left overflow-hidden hover:bg-[#fde047] transition-all shadow-[8px_8px_0px_0px_rgba(20,20,20,1)]"
            >
              <div className="relative z-10">
                <div className="w-10 h-10 bg-[#141414]/10 rounded-xl flex items-center justify-center mb-4">
                  <Bird className="w-5 h-5 text-[#141414]" />
                </div>
                <h3 className="text-2xl font-bold uppercase tracking-tighter italic font-serif">Floppy Bird</h3>
                <p className="text-[9px] font-mono uppercase opacity-50 mt-1">Gravity Physics // Pipe Navigation</p>
              </div>
              <div className="absolute -right-6 -bottom-6 opacity-5 group-hover:opacity-10 transition-opacity">
                <Bird className="w-32 h-32" />
              </div>
            </motion.button>
          </div>

          <div className="text-center">
            <p className="text-[10px] font-mono uppercase opacity-30 tracking-widest">Varun Hijra Game Studio // System Ready</p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (gameState === 'DINO_GAME') {
    return (
      <div className="min-h-screen bg-[#E4E3E0] flex flex-col items-center justify-center p-4 md:p-8">
        <header className="w-full max-w-md mb-8 flex flex-col items-center text-center">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-[#141414] rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-2xl font-black uppercase tracking-tighter italic font-serif">Dino Run</h1>
          </div>
          <p className="text-[10px] font-mono uppercase opacity-60 tracking-widest">Infinite Loop // System Online</p>
        </header>
        <DinoGame onBack={() => setGameState('GAME_MENU')} />
      </div>
    );
  }

  if (gameState === 'FLOPPY_BIRD') {
    return (
      <div className="min-h-screen bg-[#E4E3E0] flex flex-col items-center justify-center p-4 md:p-8">
        <header className="w-full max-w-md mb-8 flex flex-col items-center text-center">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-[#facc15] border-2 border-[#141414] rounded-lg flex items-center justify-center">
              <Bird className="w-4 h-4 text-[#141414]" />
            </div>
            <h1 className="text-2xl font-black uppercase tracking-tighter italic font-serif">Floppy Bird</h1>
          </div>
          <p className="text-[10px] font-mono uppercase opacity-60 tracking-widest">Gravity Test // System Online</p>
        </header>
        <FloppyBird onBack={() => setGameState('GAME_MENU')} />
      </div>
    );
  }

  if (gameState === 'MODE_SELECTION') {
    return (
      <div className="min-h-screen bg-[#E4E3E0] flex items-center justify-center p-4 overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md space-y-8 py-8"
        >
          <div className="text-center space-y-2">
            <h2 className="text-4xl font-black uppercase tracking-tighter italic font-serif">Choose Mode</h2>
            <p className="text-[10px] font-mono uppercase opacity-60 tracking-widest">Select your combat parameters</p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4">
              <motion.button
                whileHover={{ scale: 1.02, x: 5 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => { setGameMode('AI'); setGameState('SYMBOL_SELECTION'); }}
                className="group relative p-8 bg-[#141414] text-[#E4E3E0] rounded-2xl text-left overflow-hidden border-2 border-transparent hover:border-white/20 transition-all"
              >
                <div className="relative z-10">
                  <Cpu className="w-8 h-8 mb-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                  <h3 className="text-2xl font-bold uppercase tracking-tighter">vs Gemini AI</h3>
                  <p className="text-[10px] font-mono uppercase opacity-50 mt-1">Challenge the neural network</p>
                </div>
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Cpu className="w-24 h-24 -mr-8 -mt-8" />
                </div>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02, x: 5 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => { setGameMode('PvP'); setGameState('SYMBOL_SELECTION'); }}
                className="group relative p-8 bg-white border-2 border-[#141414] text-[#141414] rounded-2xl text-left overflow-hidden hover:bg-[#F5F5F5] transition-all shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]"
              >
                <div className="relative z-10">
                  <User className="w-8 h-8 mb-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                  <h3 className="text-2xl font-bold uppercase tracking-tighter">Local PvP</h3>
                  <p className="text-[10px] font-mono uppercase opacity-50 mt-1">Battle a human opponent</p>
                </div>
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <User className="w-24 h-24 -mr-8 -mt-8" />
                </div>
              </motion.button>
            </div>

            <Button 
              variant="outline"
              size="lg"
              onClick={() => setGameState('GAME_MENU')}
              className="border-2 border-[#141414] text-[#141414] hover:bg-[#D1D0CC] font-black uppercase tracking-widest py-6 rounded-2xl"
            >
              <ArrowLeft className="mr-2 w-5 h-5" /> Back to Game Hub
            </Button>
          </div>

          <div className="text-center">
            <p className="text-[10px] font-mono uppercase opacity-30 tracking-widest">Varun Hijra Game Studio // System Ready</p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (gameState === 'SYMBOL_SELECTION') {
    return (
      <div className="min-h-screen bg-[#E4E3E0] flex items-center justify-center p-4 overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-2xl space-y-8 py-8"
        >
          <div className="text-center space-y-2">
            <h2 className="text-4xl font-black uppercase tracking-tighter italic font-serif">Select Symbols</h2>
            <p className="text-[10px] font-mono uppercase opacity-60 tracking-widest">Personalize your interface</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Player 1 Selection */}
            <Card className="bg-white border-2 border-[#141414] shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm uppercase font-bold flex items-center gap-2">
                  <User className="w-4 h-4" /> Player 1
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  {SYMBOLS.map((s) => (
                    <div key={s.type} className="flex flex-col items-center gap-1">
                      <button
                        onClick={() => {
                          playSymbolSound(s.audioFile);
                          setPlayer1Symbol(s.type);
                          if (s.type === player2Symbol) {
                            const next = SYMBOLS.find(sym => sym.type !== s.type);
                            if (next) setPlayer2Symbol(next.type);
                          }
                        }}
                        className={cn(
                          "w-full aspect-square flex items-center justify-center rounded-xl border-2 transition-all",
                          player1Symbol === s.type 
                            ? "bg-[#141414] border-[#141414] text-white" 
                            : "border-gray-200 hover:border-[#141414] text-gray-400"
                        )}
                      >
                        <s.icon className={cn("w-8 h-8", player1Symbol === s.type ? "text-white" : s.color)} />
                      </button>
                      <span className="text-[8px] font-mono uppercase opacity-40">{s.type}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Player 2 / AI Selection */}
            <Card className="bg-white border-2 border-[#141414] shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm uppercase font-bold flex items-center gap-2">
                  {gameMode === 'AI' ? <Cpu className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  {gameMode === 'AI' ? 'Gemini AI' : 'Player 2'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  {SYMBOLS.map((s) => (
                    <div key={s.type} className="flex flex-col items-center gap-1">
                      <button
                        disabled={s.type === player1Symbol}
                        onClick={() => {
                          playSymbolSound(s.audioFile);
                          setPlayer2Symbol(s.type);
                        }}
                        className={cn(
                          "w-full aspect-square flex items-center justify-center rounded-xl border-2 transition-all",
                          player2Symbol === s.type 
                            ? "bg-[#141414] border-[#141414] text-white" 
                            : "border-gray-200 hover:border-[#141414] text-gray-400",
                          s.type === player1Symbol && "opacity-20 cursor-not-allowed grayscale"
                        )}
                      >
                        <s.icon className={cn("w-8 h-8", player2Symbol === s.type ? "text-white" : s.color)} />
                      </button>
                      <span className="text-[8px] font-mono uppercase opacity-40">{s.type}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-center gap-4 pt-4">
            <Button 
              variant="outline"
              size="lg"
              onClick={() => setGameState('GAME_MENU')}
              className="border-2 border-[#141414] text-[#141414] hover:bg-[#D1D0CC] font-black uppercase tracking-widest px-8 py-6 rounded-2xl"
            >
              <ArrowLeft className="mr-2 w-5 h-5" /> Back
            </Button>
            <Button 
              size="lg"
              onClick={() => setGameState('PLAYING')}
              className="bg-[#141414] text-[#E4E3E0] hover:bg-[#333] font-black uppercase tracking-widest px-12 py-6 rounded-2xl group"
            >
              Start Combat <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#E4E3E0] p-4 md:p-8 flex flex-col items-center">
      <header className="w-full max-w-md mb-8 flex flex-col items-center text-center relative">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => setGameState('GAME_MENU')}
          className="absolute left-0 top-0 text-[#141414] hover:bg-[#D1D0CC] md:-left-12"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-2"
        >
          <div className="p-2 bg-[#141414] rounded-lg">
            <X className="w-6 h-6 text-[#E4E3E0]" />
          </div>
          <h1 className="text-3xl font-bold tracking-tighter uppercase italic font-serif">Tic Tac Toe</h1>
          <div className="p-2 bg-[#141414] rounded-lg">
            <Circle className="w-6 h-6 text-[#E4E3E0]" />
          </div>
        </motion.div>
        <p className="text-xs font-mono uppercase tracking-widest opacity-60">AI Edition // v1.0.0</p>
      </header>

      <main className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Sidebar: Controls */}
        <div className="lg:col-span-4 space-y-6 order-2 lg:order-1">
          <Card className="bg-[#E4E3E0] border-[#141414] border-2 shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-tight">
                <Settings2 className="w-4 h-4" />
                Configuration
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase opacity-60">Game Mode</label>
                <Tabs value={gameMode} onValueChange={(v) => { setGameMode(v as GameMode); resetGame(); }}>
                  <TabsList className="grid grid-cols-2 w-full bg-[#D1D0CC] border-[#141414] border">
                    <TabsTrigger value="PvP" className="data-[state=active]:bg-[#141414] data-[state=active]:text-[#E4E3E0] text-xs uppercase font-bold">
                      <User className="w-3 h-3 mr-2" /> PvP
                    </TabsTrigger>
                    <TabsTrigger value="AI" className="data-[state=active]:bg-[#141414] data-[state=active]:text-[#E4E3E0] text-xs uppercase font-bold">
                      <Cpu className="w-3 h-3 mr-2" /> AI
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {gameMode === 'AI' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase opacity-60">AI Difficulty</label>
                  <div className="flex gap-2">
                    {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
                      <Button
                        key={d}
                        variant="outline"
                        size="sm"
                        onClick={() => { setDifficulty(d); resetGame(); }}
                        className={cn(
                          "flex-1 text-[10px] uppercase font-bold border-[#141414] transition-all",
                          difficulty === d ? "bg-[#141414] text-[#E4E3E0]" : "hover:bg-[#D1D0CC]"
                        )}
                      >
                        {d}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <Button 
                  onClick={resetGame}
                  variant="outline"
                  className="border-2 border-[#141414] text-[#141414] hover:bg-[#D1D0CC] font-bold uppercase tracking-tighter text-[10px]"
                >
                  <RotateCcw className="w-3 h-3 mr-1" /> Reset
                </Button>
                <Button 
                  onClick={() => setGameState('SYMBOL_SELECTION')}
                  className="bg-[#141414] text-[#E4E3E0] hover:bg-[#333] font-bold uppercase tracking-tighter text-[10px]"
                >
                  <ArrowLeft className="w-3 h-3 mr-1" /> Symbols
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#E4E3E0] border-[#141414] border-2 shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-tight">
                <Trophy className="w-4 h-4" />
                Scoreboard
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 border-[#141414] border bg-white/50">
                  <div className="text-[10px] font-mono uppercase opacity-60 mb-1">Player 1</div>
                  <div className="text-2xl font-bold font-serif italic">{scores.P1}</div>
                </div>
                <div className="p-3 border-[#141414] border bg-white/50">
                  <div className="text-[10px] font-mono uppercase opacity-60 mb-1">Draws</div>
                  <div className="text-2xl font-bold font-serif italic">{scores.Draws}</div>
                </div>
                <div className="p-3 border-[#141414] border bg-white/50">
                  <div className="text-[10px] font-mono uppercase opacity-60 mb-1">{gameMode === 'AI' ? 'AI' : 'Player 2'}</div>
                  <div className="text-2xl font-bold font-serif italic">{scores.P2}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Center: Game Board */}
        <div className="lg:col-span-8 flex flex-col items-center order-1 lg:order-2">
          <div className="relative p-6 bg-[#141414] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)]">
            {/* Board Grid */}
            <div className="grid grid-cols-3 gap-3 bg-[#141414]">
              {board.map((cell, i) => (
                <motion.button
                  key={i}
                  whileHover={!cell && !winner ? { scale: 0.98, backgroundColor: '#222' } : {}}
                  whileTap={!cell && !winner ? { scale: 0.95 } : {}}
                  onClick={() => handleMove(i)}
                  className={cn(
                    "w-24 h-24 md:w-32 md:h-32 rounded-xl flex items-center justify-center transition-colors relative overflow-hidden",
                    "bg-[#1A1A1A] border-2 border-[#333]",
                    winningLine?.includes(i) && "bg-[#2A2A2A] border-white/20",
                    !cell && !winner && "cursor-pointer"
                  )}
                >
                  <AnimatePresence mode="wait">
                    {cell && (
                      <motion.div
                        key={cell}
                        initial={{ scale: 0, rotate: -45 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0 }}
                        className={SYMBOLS.find(s => s.type === cell)?.color}
                      >
                        {(() => {
                          const Icon = SYMBOLS.find(s => s.type === cell)?.icon;
                          return Icon ? <Icon className="w-12 h-12 md:w-16 md:h-16 stroke-[3]" /> : null;
                        })()}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  {/* Winning Line Overlay */}
                  {winningLine?.includes(i) && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0, 1, 0] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className="absolute inset-0 bg-white/5 pointer-events-none"
                    />
                  )}
                </motion.button>
              ))}
            </div>

            {/* Status Overlays */}
            <AnimatePresence>
              {(winner || isAiThinking) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute -bottom-12 left-0 right-0 flex justify-center"
                >
                  {isAiThinking ? (
                    <Badge className="bg-blue-500 text-white border-none animate-pulse px-4 py-1 uppercase tracking-tighter font-bold">
                      Gemini is thinking...
                    </Badge>
                  ) : winner ? (
                    <Badge className={cn(
                      "px-6 py-2 text-lg uppercase tracking-tighter font-black border-none shadow-xl",
                      winner === 1 ? "bg-red-500 text-white" : 
                      winner === 2 ? "bg-blue-500 text-white" : 
                      "bg-gray-500 text-white"
                    )}>
                      {winner === 'Draw' ? "It's a Draw!" : winner === 1 ? "Player 1 Wins!" : gameMode === 'AI' ? "AI Wins!" : "Player 2 Wins!"}
                    </Badge>
                  ) : null}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-16 w-full max-w-md">
            <div className="flex items-center justify-between px-4 py-2 border-b border-[#141414] opacity-40">
              <span className="text-[10px] font-mono uppercase">System Status</span>
              <span className="text-[10px] font-mono uppercase">Online // Ready</span>
            </div>
            <div className="p-4 flex gap-4 items-start opacity-60">
              <Info className="w-4 h-4 mt-1 flex-shrink-0" />
              <p className="text-xs leading-relaxed">
                {gameMode === 'AI' 
                  ? `Currently playing against Gemini AI on ${difficulty} difficulty. The AI uses advanced reasoning to determine the best move.`
                  : "Local PvP mode enabled. Take turns on the same device to compete."}
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-auto pt-12 pb-4 text-center">
        <p className="text-[10px] font-mono uppercase opacity-30 tracking-[0.2em]">
          &copy; 2026 AI Studio Build // Experimental Hardware Interface
        </p>
      </footer>
    </div>
  );
}
