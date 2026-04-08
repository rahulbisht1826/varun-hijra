import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RotateCcw, Trophy, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DinoGameProps {
  onBack: () => void;
}

export const DinoGame: React.FC<DinoGameProps> = ({ onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAMEOVER'>('START');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  
  const gameRef = useRef({
    dino: { x: 50, y: 150, width: 40, height: 40, dy: 0, jumpForce: 15, gravity: 0.7, isJumping: false },
    obstacles: [] as { x: number, y: number, width: number, height: number, type: 'CACTUS' | 'BIRD' }[],
    frame: 0,
    speed: 4,
    score: 0,
    nextObstacle: 100,
    animationId: 0
  });

  const resetGame = () => {
    gameRef.current = {
      dino: { x: 50, y: 150, width: 40, height: 40, dy: 0, jumpForce: 15, gravity: 0.7, isJumping: false },
      obstacles: [],
      frame: 0,
      speed: 4,
      score: 0,
      nextObstacle: 100,
      animationId: 0
    };
    setScore(0);
    setGameState('PLAYING');
  };

  const jump = () => {
    // Access latest gameState via ref if needed, but here we can just check the current state
    // To ensure zero latency, we modify the ref immediately
    if (gameState === 'PLAYING') {
      if (!gameRef.current.dino.isJumping) {
        gameRef.current.dino.dy = -gameRef.current.dino.jumpForce;
        gameRef.current.dino.isJumping = true;
      }
    } else {
      resetGame();
    }
  };

  useEffect(() => {
    const handleInput = (e: KeyboardEvent | TouchEvent) => {
      if (e instanceof KeyboardEvent) {
        if (e.code === 'Space' || e.code === 'ArrowUp') {
          e.preventDefault();
          jump();
        }
      } else {
        // Touch event
        e.preventDefault();
        jump();
      }
    };

    window.addEventListener('keydown', handleInput);
    window.addEventListener('touchstart', handleInput, { passive: false });
    
    return () => {
      window.removeEventListener('keydown', handleInput);
      window.removeEventListener('touchstart', handleInput);
    };
  }, [gameState]); // Re-bind when state changes to ensure jump() has correct context

  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const update = () => {
      const { dino, obstacles, speed } = gameRef.current;
      
      // Dino physics
      dino.dy += dino.gravity;
      dino.y += dino.dy;
      
      if (dino.y > 150) {
        dino.y = 150;
        dino.dy = 0;
        dino.isJumping = false;
      }

      // Obstacles spawning
      gameRef.current.frame++;
      if (gameRef.current.frame > gameRef.current.nextObstacle) {
        const score = gameRef.current.score;
        const rand = Math.random();
        
        // Spawn Bird if score > 20
        if (score > 20 && rand > 0.7) {
          obstacles.push({
            x: canvas.width,
            y: 100 + Math.random() * 40, // Flying height
            width: 30,
            height: 20,
            type: 'BIRD'
          });
        } else {
          // Spawn Cactus or Cluster
          const isCluster = rand > 0.8;
          obstacles.push({
            x: canvas.width,
            y: 190, // Ground level
            width: isCluster ? 40 + Math.random() * 40 : 20 + Math.random() * 20,
            height: 30 + Math.random() * 30,
            type: 'CACTUS'
          });
        }
        
        gameRef.current.frame = 0;
        // Frequency increases with speed
        gameRef.current.nextObstacle = Math.max(30, (80 + Math.random() * 60) - (speed * 2));
      }

      for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.x -= speed;
        
        // Collision detection
        const obsTop = obs.type === 'CACTUS' ? 190 - obs.height : obs.y;
        const obsBottom = obs.type === 'CACTUS' ? 190 : obs.y + obs.height;

        if (
          dino.x < obs.x + obs.width &&
          dino.x + dino.width > obs.x &&
          dino.y < obsBottom &&
          dino.y + dino.height > obsTop
        ) {
          setGameState('GAMEOVER');
          return;
        }

        if (obs.x + obs.width < 0) {
          obstacles.splice(i, 1);
          gameRef.current.score += 1;
          setScore(gameRef.current.score);
        }
      }

      // Increase speed
      gameRef.current.speed += 0.001;

      // Draw
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Ground
      ctx.strokeStyle = '#141414';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 190);
      ctx.lineTo(canvas.width, 190);
      ctx.stroke();

      // Dino
      ctx.fillStyle = '#141414';
      ctx.fillRect(dino.x, dino.y, dino.width, dino.height);
      
      // Obstacles
      for (const obs of obstacles) {
        if (obs.type === 'CACTUS') {
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(obs.x, 190 - obs.height, obs.width, obs.height);
          // Add some "spikes" to cacti
          ctx.fillStyle = '#991b1b';
          ctx.fillRect(obs.x + obs.width/2 - 2, 190 - obs.height - 5, 4, 5);
        } else {
          // Bird
          ctx.fillStyle = '#3b82f6';
          ctx.beginPath();
          ctx.moveTo(obs.x, obs.y + obs.height/2);
          ctx.lineTo(obs.x + obs.width/2, obs.y);
          ctx.lineTo(obs.x + obs.width, obs.y + obs.height/2);
          ctx.lineTo(obs.x + obs.width/2, obs.y + obs.height);
          ctx.closePath();
          ctx.fill();
          // Wings
          ctx.fillRect(obs.x + 5, obs.y + (Math.sin(gameRef.current.frame * 0.2) * 5), obs.width - 10, 2);
        }
      }

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
          <span className="text-[10px] font-mono uppercase opacity-40">Current Score</span>
          <span className="text-2xl font-black font-serif italic">{score}</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-mono uppercase opacity-40">High Score</span>
          <span className="text-2xl font-black font-serif italic">{highScore}</span>
        </div>
      </div>

      <div className="relative bg-white border-4 border-[#141414] rounded-2xl overflow-hidden shadow-[8px_8px_0px_0px_rgba(20,20,20,1)]">
        <canvas 
          ref={canvasRef} 
          width={600} 
          height={200} 
          className="w-full h-auto cursor-pointer"
          onClick={jump}
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
                  <h3 className="text-3xl font-black uppercase tracking-tighter italic font-serif mb-2">Dino Run</h3>
                  <p className="text-xs font-mono uppercase opacity-60 mb-6">Avoid the obstacles // Infinite Loop</p>
                  <Button onClick={resetGame} size="lg" className="bg-[#141414] text-white rounded-xl px-8">
                    <Play className="w-4 h-4 mr-2 fill-current" /> Start Game
                  </Button>
                </>
              ) : (
                <>
                  <h3 className="text-3xl font-black uppercase tracking-tighter italic font-serif mb-2 text-red-600">Game Over</h3>
                  <p className="text-xs font-mono uppercase opacity-60 mb-6">Final Score: {score}</p>
                  <Button onClick={resetGame} size="lg" className="bg-[#141414] text-white rounded-xl px-8">
                    <RotateCcw className="w-4 h-4 mr-2" /> Try Again
                  </Button>
                </>
              )}
              <p className="mt-6 text-[10px] font-mono uppercase opacity-40">Press Space or Tap to Jump</p>
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
