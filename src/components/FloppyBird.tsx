import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RotateCcw, Play, Bird } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FloppyBirdProps {
  onBack: () => void;
}

export const FloppyBird: React.FC<FloppyBirdProps> = ({ onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAMEOVER'>('START');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  
  const gameRef = useRef({
    bird: { x: 50, y: 200, width: 34, height: 24, dy: 0, gravity: 0.25, jump: -4.5 },
    pipes: [] as { x: number, top: number, bottom: number, width: number, passed: boolean }[],
    frame: 0,
    speed: 2,
    score: 0,
    animationId: 0
  });

  const resetGame = () => {
    gameRef.current = {
      bird: { x: 50, y: 200, width: 34, height: 24, dy: 0, gravity: 0.25, jump: -4.5 },
      pipes: [],
      frame: 0,
      speed: 2,
      score: 0,
      animationId: 0
    };
    setScore(0);
    setGameState('PLAYING');
  };

  const flap = () => {
    if (gameState === 'PLAYING') {
      gameRef.current.bird.dy = gameRef.current.bird.jump;
    } else {
      resetGame();
    }
  };

  useEffect(() => {
    const handleInput = (e: KeyboardEvent | TouchEvent) => {
      if (e instanceof KeyboardEvent) {
        if (e.code === 'Space' || e.code === 'ArrowUp') {
          e.preventDefault();
          flap();
        }
      } else {
        e.preventDefault();
        flap();
      }
    };

    window.addEventListener('keydown', handleInput);
    window.addEventListener('touchstart', handleInput, { passive: false });
    
    return () => {
      window.removeEventListener('keydown', handleInput);
      window.removeEventListener('touchstart', handleInput);
    };
  }, [gameState]);

  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const update = () => {
      const { bird, pipes, speed } = gameRef.current;
      
      // Bird physics
      bird.dy += bird.gravity;
      bird.y += bird.dy;
      
      // Boundaries
      if (bird.y + bird.height > canvas.height || bird.y < 0) {
        setGameState('GAMEOVER');
        return;
      }

      // Pipes
      gameRef.current.frame++;
      if (gameRef.current.frame % 100 === 0) {
        const gap = 120;
        const minPipeHeight = 50;
        const maxPipeHeight = canvas.height - gap - minPipeHeight;
        const top = Math.floor(Math.random() * (maxPipeHeight - minPipeHeight + 1)) + minPipeHeight;
        
        pipes.push({
          x: canvas.width,
          top: top,
          bottom: canvas.height - top - gap,
          width: 50,
          passed: false
        });
      }

      for (let i = pipes.length - 1; i >= 0; i--) {
        const pipe = pipes[i];
        pipe.x -= speed;
        
        // Collision
        if (
          bird.x + bird.width > pipe.x &&
          bird.x < pipe.x + pipe.width &&
          (bird.y < pipe.top || bird.y + bird.height > canvas.height - pipe.bottom)
        ) {
          setGameState('GAMEOVER');
          return;
        }

        // Score
        if (!pipe.passed && bird.x > pipe.x + pipe.width) {
          pipe.passed = true;
          gameRef.current.score++;
          setScore(gameRef.current.score);
        }

        if (pipe.x + pipe.width < 0) {
          pipes.splice(i, 1);
        }
      }

      // Draw
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Background (simple clouds/cityscape feel)
      ctx.fillStyle = '#f0f9ff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Pipes
      ctx.fillStyle = '#22c55e';
      for (const pipe of pipes) {
        // Top pipe
        ctx.fillRect(pipe.x, 0, pipe.width, pipe.top);
        ctx.strokeStyle = '#166534';
        ctx.lineWidth = 2;
        ctx.strokeRect(pipe.x, 0, pipe.width, pipe.top);
        
        // Bottom pipe
        ctx.fillRect(pipe.x, canvas.height - pipe.bottom, pipe.width, pipe.bottom);
        ctx.strokeRect(pipe.x, canvas.height - pipe.bottom, pipe.width, pipe.bottom);
      }

      // Bird
      ctx.save();
      ctx.translate(bird.x + bird.width/2, bird.y + bird.height/2);
      ctx.rotate(Math.min(Math.PI/4, Math.max(-Math.PI/4, bird.dy * 0.1)));
      ctx.fillStyle = '#facc15';
      ctx.fillRect(-bird.width/2, -bird.height/2, bird.width, bird.height);
      ctx.strokeStyle = '#141414';
      ctx.lineWidth = 2;
      ctx.strokeRect(-bird.width/2, -bird.height/2, bird.width, bird.height);
      // Eye
      ctx.fillStyle = 'white';
      ctx.fillRect(5, -8, 8, 8);
      ctx.fillStyle = 'black';
      ctx.fillRect(10, -5, 3, 3);
      // Beak
      ctx.fillStyle = '#f97316';
      ctx.fillRect(bird.width/2 - 5, -2, 10, 8);
      ctx.restore();

      gameRef.current.animationId = requestAnimationFrame(update);
    };

    gameRef.current.animationId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(gameRef.current.animationId);
  }, [gameState]);

  useEffect(() => {
    if (score > highScore) setHighScore(score);
  }, [score]);

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-2xl">
      <div className="flex justify-between w-full px-4">
        <div className="flex flex-col">
          <span className="text-[10px] font-mono uppercase opacity-40">Score</span>
          <span className="text-2xl font-black font-serif italic">{score}</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-mono uppercase opacity-40">Best</span>
          <span className="text-2xl font-black font-serif italic">{highScore}</span>
        </div>
      </div>

      <div className="relative bg-white border-4 border-[#141414] rounded-2xl overflow-hidden shadow-[8px_8px_0px_0px_rgba(20,20,20,1)]">
        <canvas 
          ref={canvasRef} 
          width={400} 
          height={500} 
          className="w-full h-auto cursor-pointer max-h-[70vh]"
          onClick={flap}
        />

        <AnimatePresence>
          {gameState !== 'PLAYING' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center"
            >
              {gameState === 'START' ? (
                <>
                  <div className="w-16 h-16 bg-[#facc15] border-4 border-[#141414] rounded-xl flex items-center justify-center mb-4">
                    <Bird className="w-8 h-8 text-[#141414]" />
                  </div>
                  <h3 className="text-3xl font-black uppercase tracking-tighter italic font-serif mb-2">Floppy Bird</h3>
                  <p className="text-xs font-mono uppercase opacity-60 mb-6">Navigate the pipes // Gravity Test</p>
                  <Button onClick={resetGame} size="lg" className="bg-[#141414] text-white rounded-xl px-8">
                    <Play className="w-4 h-4 mr-2 fill-current" /> Flap Wings
                  </Button>
                </>
              ) : (
                <>
                  <h3 className="text-3xl font-black uppercase tracking-tighter italic font-serif mb-2 text-red-600">Crash!</h3>
                  <p className="text-xs font-mono uppercase opacity-60 mb-6">Final Score: {score}</p>
                  <Button onClick={resetGame} size="lg" className="bg-[#141414] text-white rounded-xl px-8">
                    <RotateCcw className="w-4 h-4 mr-2" /> Try Again
                  </Button>
                </>
              )}
              <p className="mt-6 text-[10px] font-mono uppercase opacity-40">Press Space or Tap to Flap</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex gap-4">
        <Button variant="outline" onClick={onBack} className="border-2 border-[#141414] rounded-xl uppercase font-bold text-xs">
          Back to Menu
        </Button>
      </div>
    </div>
  );
};
