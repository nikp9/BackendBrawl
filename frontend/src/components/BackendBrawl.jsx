import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const BulletGame = () => {
  // Game entities
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
    const gameLoop = setInterval(() => {
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
  }, [leftPosition, rightPosition, leftBullets, rightBullets, gameAreaHeight]);

  // Fetch attacks from MongoDB and fire bullets
  const fetchAttacksAndFire = async () => {
    try {
      const response = await fetch('http://localhost:8000/combined-attacks');
      const attacks = await response.json();
      
      setGameStarted(true);
      
      const fireBulletsWithAnimationFrame = (attacks) => {
        let lastFireTime = performance.now();
        const fireRate = 200; // ms time between shots
        let attackIndex = 0;
        
        const fireNext = (currentTime) => {
          while (attackIndex < attacks.length && 
                 currentTime - lastFireTime >= fireRate) {
            const attack = attacks[attackIndex];
            if (attack.server === 'go') {
              fireBullet(false); // Fire from right
            } else if (attack.server === 'node') {
              fireBullet(true); // Fire from left
            }
            attackIndex++;
            lastFireTime += fireRate;
          }
          
          // Continue only if we have more attacks
          if (attackIndex < attacks.length) {
            requestAnimationFrame(fireNext);
          }
        };
        
        requestAnimationFrame(fireNext);
      };
  
      fireBulletsWithAnimationFrame(attacks);
      
    } catch (err) {
      console.error('Error fetching attacks:', err);
    }
  };
  // Reset game
  const resetGame = () => {
    setLeftHealth(100);
    setRightHealth(100);
    setLeftBullets([]);
    setRightBullets([]);
    setGameStarted(false);
  };

  return (
    <div style={{ 
      padding: '20px',
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      boxSizing: 'border-box'
    }}>
      <h2 style={{ fontSize: '2rem', marginBottom: '20px' }}>Bullet Battle</h2>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        width: '80%',
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
          width: '80vw',
          height: '50vh',
          minWidth: '800px',
          minHeight: '400px',
          maxWidth: '1200px',
          maxHeight: '600px',
          border: '3px solid #333',
          backgroundColor: 'black',
          overflow: 'hidden'
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
            <p>{leftHealth <= 0 ? 'Right' : 'Left'} player wins!</p>
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
            onClick={fetchAttacksAndFire}
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
              onClick={() => fireBullet(true)}
              style={{ 
                padding: '12px 24px',
                fontSize: '1.2rem',
                backgroundColor: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Fire Left
            </button>
            <button 
              onClick={() => fireBullet(false)}
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
              Fire Right
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default BackendBrawl;