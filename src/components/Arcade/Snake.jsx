import React, { useState, useEffect, useCallback } from 'react';

const GRID_SIZE = 20;
const INITIAL_SNAKE = [[10, 10]];
const INITIAL_FOOD = [5, 5];
const INITIAL_DIRECTION = [0, -1]; // moving up

export default function Snake() {
    const [snake, setSnake] = useState(INITIAL_SNAKE);
    const [food, setFood] = useState(INITIAL_FOOD);
    const [direction, setDirection] = useState(INITIAL_DIRECTION);
    const [gameOver, setGameOver] = useState(false);
    const [score, setScore] = useState(0);

    const checkCollision = (head, currentSnake) => {
        if (head[0] < 0 || head[0] >= GRID_SIZE || head[1] < 0 || head[1] >= GRID_SIZE) return true;
        for (let segment of currentSnake) {
            if (head[0] === segment[0] && head[1] === segment[1]) return true;
        }
        return false;
    };

    const moveSnake = useCallback(() => {
        if (gameOver) return;

        setSnake(prev => {
            const newHead = [prev[0][0] + direction[0], prev[0][1] + direction[1]];
            
            if (checkCollision(newHead, prev)) {
                setGameOver(true);
                return prev;
            }

            const newSnake = [newHead, ...prev];
            if (newHead[0] === food[0] && newHead[1] === food[1]) {
                setScore(s => s + 10);
                setFood([
                    Math.floor(Math.random() * GRID_SIZE),
                    Math.floor(Math.random() * GRID_SIZE)
                ]);
            } else {
                newSnake.pop();
            }
            return newSnake;
        });
    }, [direction, food, gameOver]);

    useEffect(() => {
        const handleKeyPress = (e) => {
            // Prevent default scrolling for arrow keys
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
            }
            
            if (gameOver && e.key === 'Enter') {
                restartGame();
                return;
            }

            switch(e.key) {
                case 'ArrowUp': 
                case 'w':
                    if (direction[1] !== 1) setDirection([0, -1]); break;
                case 'ArrowDown':
                case 's':
                    if (direction[1] !== -1) setDirection([0, 1]); break;
                case 'ArrowLeft':
                case 'a':
                    if (direction[0] !== 1) setDirection([-1, 0]); break;
                case 'ArrowRight':
                case 'd':
                    if (direction[0] !== -1) setDirection([1, 0]); break;
            }
        };
        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [direction, gameOver]);

    useEffect(() => {
        const interval = setInterval(moveSnake, 100);
        return () => clearInterval(interval);
    }, [moveSnake]);

    const restartGame = () => {
        setSnake(INITIAL_SNAKE); 
        setDirection(INITIAL_DIRECTION); 
        setGameOver(false); 
        setScore(0);
    };

    return (
        <div style={{ padding: '20px', fontFamily: '"Menlo", "Monaco", "Courier New", monospace', color: '#4ade80' }}>
            <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', width: '400px' }}>
                <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>SCORE: {score}</span>
                {gameOver && <span style={{ color: '#ff5f56', animation: 'pulse 1s infinite' }}>GAME OVER</span>}
            </div>
            
            <div style={{
                width: '400px', height: '400px',
                border: '2px solid #4ade80',
                position: 'relative',
                background: 'rgba(15, 15, 20, 0.9)',
                boxShadow: '0 0 20px rgba(74, 222, 128, 0.2)'
            }}>
                {snake.map((segment, i) => (
                    <div key={i} style={{
                        position: 'absolute',
                        left: `${segment[0] * (100/GRID_SIZE)}%`,
                        top: `${segment[1] * (100/GRID_SIZE)}%`,
                        width: `${100/GRID_SIZE}%`, height: `${100/GRID_SIZE}%`,
                        background: i === 0 ? '#4ade80' : '#22c55e',
                        border: '1px solid rgba(15, 15, 20, 0.5)',
                        boxShadow: i === 0 ? '0 0 10px #4ade80' : 'none',
                        zIndex: i === 0 ? 10 : 1
                    }} />
                ))}
                <div style={{
                    position: 'absolute',
                    left: `${food[0] * (100/GRID_SIZE)}%`,
                    top: `${food[1] * (100/GRID_SIZE)}%`,
                    width: `${100/GRID_SIZE}%`, height: `${100/GRID_SIZE}%`,
                    background: '#ff5f56',
                    borderRadius: '50%',
                    boxShadow: '0 0 10px #ff5f56'
                }} />
            </div>
            
            <div style={{ marginTop: '20px', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
                [W,A,S,D] or [Arrows] to move.
                {gameOver && (
                    <button 
                        onClick={restartGame}
                        style={{ 
                            display: 'block',
                            marginTop: '15px', 
                            background: 'transparent', 
                            border: '1px solid #4ade80', 
                            color: '#4ade80', 
                            padding: '8px 16px', 
                            cursor: 'pointer',
                            fontFamily: 'inherit'
                        }}
                    >
                        Press [Enter] or Click to Restart
                    </button>
                )}
            </div>
        </div>
    );
}
