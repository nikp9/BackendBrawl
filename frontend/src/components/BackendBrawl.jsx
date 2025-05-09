import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const BackendBrawl = () => {
  // Game entities
  const cleanupRef = useRef(null);
  const [leftPosition] = useState(50);
  const [rightPosition, setRightPosition] = useState(750);
  const [leftHealth, setLeftHealth] = useState(100);
  const [rightHealth, setRightHealth] = useState(100);
  const [gameStarted, setGameStarted] = useState(false);
  
  // Bullets state
  const [leftBullets, setLeftBullets] = useState([]);
  const [rightBullets, setRightBullets] = useState([]);
  
  const gameAreaRef = useRef(null);
  const [gameAreaWidth, setGameAreaWidth] = useState(800);
  const [gameAreaHeight, setGameAreaHeight] = useState(400);

  // Set up game area dimensions
  useEffect(() => {
    const updateDimensions = () => {
      if (gameAreaRef.current) {
        const width = gameAreaRef.current.offsetWidth;
        const height = gameAreaRef.current.offsetHeight;
        setGameAreaWidth(width);
        setGameAreaHeight(height);
        setRightPosition(width - 150);
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Fire bullets with random vertical position within hitbox range
  const fireBullet = (fromLeft) => {
    const playerHeight = 100;
    const minY = (gameAreaHeight / 2) - (playerHeight / 2);
    const maxY = (gameAreaHeight / 2) + (playerHeight / 2);
    
    const randomY = Math.random() * (maxY - minY) + minY;

    const newBullet = {
      id: Date.now() + Math.random(),
      x: fromLeft ? leftPosition + 100 : rightPosition - 20,
      y: randomY,
      fromLeft
    };

    if (fromLeft) {
      setLeftBullets(prev => [...prev, newBullet]);
    } else {
      setRightBullets(prev => [...prev, newBullet]);
    }
  };

  // Game loop for bullet movement and collision
  useEffect(() => {
    if (!gameStarted) return; // Don't run game loop if game isn't started
    
    const gameLoop = setInterval(() => {
      if (leftHealth <= 0 || rightHealth <= 0) {
        setGameStarted(false);
        return;
      }

      // Rest of the game loop code remains the same...
      // Move left bullets (right direction)
      setLeftBullets(prev => 
        prev.map(bullet => ({
          ...bullet,
          x: bullet.x + 8
        })).filter(bullet => {
          if (bullet.x >= rightPosition - 50) {
            setRightHealth(prev => Math.max(0, prev - 3));
            return false;
          }
          return true;
        })
      );

      // Move right bullets (left direction)
      setRightBullets(prev => 
        prev.map(bullet => ({
          ...bullet,
          x: bullet.x - 8
        })).filter(bullet => {
          if (bullet.x <= leftPosition + 100) {
            setLeftHealth(prev => Math.max(0, prev - 3));
            return false;
          }
          return true;
        })
      );

      // Bullet-to-bullet collision
      setLeftBullets(prevLeft => {
        return prevLeft.filter(leftBullet => {
          return !rightBullets.some(rightBullet => (
            Math.abs(leftBullet.x - rightBullet.x) < 15 &&
            Math.abs(leftBullet.y - rightBullet.y) < 15
          ));
        });
      });

      setRightBullets(prevRight => {
        return prevRight.filter(rightBullet => {
          return !leftBullets.some(leftBullet => (
            Math.abs(rightBullet.x - leftBullet.x) < 15 &&
            Math.abs(rightBullet.y - leftBullet.y) < 15
          ));
        });
      });
    }, 16);

    return () => clearInterval(gameLoop);
  }, [leftPosition, rightPosition, leftBullets, rightBullets, gameAreaHeight, gameStarted, leftHealth, rightHealth]);

  // Stop when the game ends
  useEffect(() => {
    if ((leftHealth <= 0 || rightHealth <= 0) && gameStarted) {
      setGameStarted(false); // Stop the game without resetting state
      if (cleanupRef.current) {
        cleanupRef.current(); // Clean up the bullet firing animation
        cleanupRef.current = null;
      }
      // Clear all bullets
      setLeftBullets([]);
      setRightBullets([]);
    }
  }, [leftHealth, rightHealth, gameStarted]);

  // Fetch attacks from MongoDB and fire bullets
  const fetchAttacksAndFire = async () => {
    let animationFrameId;
    let shouldContinue = true;
  
    try {
      const response = await fetch('http://localhost:7000/start-game');
      const attacks = await response.json();
      setGameStarted(true);
      
      const fireBulletsWithAnimationFrame = (attacks) => {
        let lastFireTime = performance.now();
        const fireRate = 200;
        let attackIndex = 0;
        
        const fireNext = (currentTime) => {
          if (!shouldContinue) return;
          
          while (attackIndex < attacks.length && 
                 currentTime - lastFireTime >= fireRate) {
            const attack = attacks[attackIndex];
            if (attack.server === 'go') {
              fireBullet(false);
            } else if (attack.server === 'node') {
              fireBullet(true);
            }
            attackIndex++;
            lastFireTime += fireRate;
          }
          
          if (attackIndex < attacks.length && shouldContinue) {
            animationFrameId = requestAnimationFrame(fireNext);
          }
        };
        
        animationFrameId = requestAnimationFrame(fireNext);
      };
  
      fireBulletsWithAnimationFrame(attacks);
      
    } catch (err) {
      console.error('Error fetching attacks:', err);
    }
  
    // Store the cleanup function in the ref
    cleanupRef.current = () => {
      shouldContinue = false;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  
    return cleanupRef.current;
  };
  
  
  const stopGame = () => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    setLeftBullets([]);
    setRightBullets([]);
    resetGame();
  };

  // Reset game
  const resetGame = () => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    setLeftHealth(100);
    setRightHealth(100);
    setLeftBullets([]);
    setRightBullets([]);
    setGameStarted(false);
  };

  return (
      <div style={{ 
        padding: '20px',
        width: '100%', // Changed from 100vw to 100%
        height: '100%', // Changed from 100vh to 100%
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start', // Changed from 'center' to 'flex-start'
        boxSizing: 'border-box',
        overflow: 'auto' // Added for scroll if content overflows
      }}>
        <h2 style={{ fontSize: '2rem', margin: '20px 0' }}>BackendBrawl</h2>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          width: '100%',
          maxWidth: '800px',
          marginBottom: '20px',
          fontSize: '1.2rem'
        }}>
          <div>Left Health: {leftHealth}%</div>
          <div>Right Health: {rightHealth}%</div>
        </div>
        
        <div
          ref={gameAreaRef}
          style={{
            position: 'relative',
            width: '90%', // Changed from 80vw to 90%
            height: '30vh', // Adjusted from 50vh to 60vh
            minWidth: '1000px', // Reduced from 800px
            minHeight: '100px', // Reduced from 400px
            maxWidth: '1200px',
            maxHeight: '600px',
            border: '3px solid #333',
            backgroundColor: 'black',
            overflow: 'hidden',
            marginBottom: '20px' // Added for spacing
          }}
        >
        {/* javascript left side */}
        <motion.div
          style={{
            position: 'absolute',
            left: leftPosition,
            top: '50%',
            width: '100px',
            height: '100px',
            backgroundImage: 'url(/js.png)',
            backgroundSize: 'contain',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            transform: 'translateY(-50%)'
          }}
        />
        
        {/* golang right side */}
        <motion.div
          style={{
            position: 'absolute',
            left: rightPosition,
            top: '50%',
            width: '100px',
            height: '100px',
            backgroundImage: 'url(/go.png)',
            backgroundSize: 'contain',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            transform: 'translateY(-50%)'
          }}
        />
        
        {/* Left bullets */}
        <AnimatePresence>
          {leftBullets.map(bullet => (
            <motion.div
            key={bullet.id}
            style={{
              position: 'absolute',
              left: bullet.x,
              top: bullet.y,
              width: '10px',
              height: '4px', 
              backgroundColor: '#f0d347', 
              borderRadius: '2px', 
              transform: 'translateY(-50%)'
            }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
          />
          ))}
        </AnimatePresence>
        
        {/* Right bullets */}
        <AnimatePresence>
          {rightBullets.map(bullet => (
            <motion.div
            key={bullet.id}
            style={{
              position: 'absolute',
              left: bullet.x,
              top: bullet.y,
              width: '10px',
              height: '4px',
              backgroundColor: '#70ccd6',
              borderRadius: '2px',
              transform: 'translateY(-50%)'
            }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
          />
          ))}
        </AnimatePresence>
        
        {/* Game over message */}
        {(leftHealth <= 0 || rightHealth <= 0) && (
          <motion.div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'rgba(0,0,0,0.8)',
              color: 'white',
              padding: '30px',
              borderRadius: '15px',
              textAlign: 'center',
              fontSize: '1.5rem',
              zIndex: 100
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <h3>Game Over!</h3>
            <p>{leftHealth <= 0 ? 'Golang' : 'Node'} Wins!</p>
            <button 
              onClick={resetGame}
              style={{
                padding: '12px 24px',
                marginTop: '20px',
                fontSize: '1.2rem',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Play Again
            </button>
          </motion.div>
        )}
      </div>
      
      <div style={{ 
        marginTop: '30px',
        display: 'flex',
        gap: '20px'
      }}>
        {!gameStarted ? (
          <button 
          onClick={async () => {
            cleanupRef.current = await fetchAttacksAndFire();
          }}
          style={{ 
            padding: '12px 24px',
            fontSize: '1.2rem',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Start Game
        </button>
        ) : (
          <>
            <button 
              onClick={stopGame}
              style={{ 
                padding: '12px 24px',
                fontSize: '1.2rem',
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Stop Game
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default BackendBrawl;