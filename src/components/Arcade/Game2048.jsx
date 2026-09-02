import React, { useState, useEffect, useCallback } from 'react';

const GRID_SIZE = 4;

const initializeGrid = () => {
    let grid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0));
    grid = addRandomTile(grid);
    grid = addRandomTile(grid);
    return grid;
};

const addRandomTile = (grid) => {
    const emptyCells = [];
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (grid[r][c] === 0) emptyCells.push({r, c});
        }
    }
    if (emptyCells.length === 0) return grid;
    const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const newGrid = JSON.parse(JSON.stringify(grid));
    newGrid[randomCell.r][randomCell.c] = Math.random() < 0.9 ? 2 : 4;
    return newGrid;
};

const slideAndMergeLine = (line) => {
    let newLine = line.filter(val => val !== 0);
    let scoreGained = 0;
    for (let i = 0; i < newLine.length - 1; i++) {
        if (newLine[i] !== 0 && newLine[i] === newLine[i+1]) {
            newLine[i] *= 2;
            scoreGained += newLine[i];
            newLine[i+1] = 0;
        }
    }
    newLine = newLine.filter(val => val !== 0);
    while (newLine.length < GRID_SIZE) {
        newLine.push(0);
    }
    return { newLine, scoreGained };
};

const moveGrid = (grid, direction) => {
    let newGrid = JSON.parse(JSON.stringify(grid));
    let moved = false;
    let totalScoreGained = 0;

    if (direction === 'LEFT' || direction === 'RIGHT') {
        for (let r = 0; r < GRID_SIZE; r++) {
            let row = newGrid[r];
            if (direction === 'RIGHT') row.reverse();
            let { newLine, scoreGained } = slideAndMergeLine(row);
            if (direction === 'RIGHT') newLine.reverse();
            newGrid[r] = newLine;
            totalScoreGained += scoreGained;
            if (newLine.join(',') !== grid[r].join(',')) moved = true;
        }
    } else if (direction === 'UP' || direction === 'DOWN') {
        for (let c = 0; c < GRID_SIZE; c++) {
            let col = [newGrid[0][c], newGrid[1][c], newGrid[2][c], newGrid[3][c]];
            if (direction === 'DOWN') col.reverse();
            let { newLine, scoreGained } = slideAndMergeLine(col);
            if (direction === 'DOWN') newLine.reverse();
            for (let r = 0; r < GRID_SIZE; r++) {
                if (newGrid[r][c] !== newLine[r]) moved = true;
                newGrid[r][c] = newLine[r];
            }
            totalScoreGained += scoreGained;
        }
    }
    return { newGrid, moved, totalScoreGained };
};

const checkGameOver = (grid) => {
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (grid[r][c] === 0) return false;
            if (r < GRID_SIZE - 1 && grid[r][c] === grid[r+1][c]) return false;
            if (c < GRID_SIZE - 1 && grid[r][c] === grid[r][c+1]) return false;
        }
    }
    return true;
};

export default function Game2048() {
    const [grid, setGrid] = useState(initializeGrid());
    const [score, setScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);

    const handleKeyDown = useCallback((e) => {
        if (gameOver) {
            if (e.key === 'Enter') restartGame();
            return;
        }

        let direction = null;
        if (e.key === 'ArrowUp' || e.key === 'w') direction = 'UP';
        else if (e.key === 'ArrowDown' || e.key === 's') direction = 'DOWN';
        else if (e.key === 'ArrowLeft' || e.key === 'a') direction = 'LEFT';
        else if (e.key === 'ArrowRight' || e.key === 'd') direction = 'RIGHT';

        if (direction) {
            e.preventDefault();
            const { newGrid, moved, totalScoreGained } = moveGrid(grid, direction);
            if (moved) {
                const updatedGrid = addRandomTile(newGrid);
                setGrid(updatedGrid);
                setScore(s => s + totalScoreGained);
                if (checkGameOver(updatedGrid)) {
                    setGameOver(true);
                }
            }
        }
    }, [grid, gameOver]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    const restartGame = () => {
        setGrid(initializeGrid());
        setScore(0);
        setGameOver(false);
    };

    const getTileColor = (val) => {
        const colors = {
            2: '#0ea5e9',
            4: '#3b82f6',
            8: '#6366f1',
            16: '#8b5cf6',
            32: '#a855f7',
            64: '#d946ef',
            128: '#ec4899',
            256: '#f43f5e',
            512: '#f97316',
            1024: '#eab308',
            2048: '#84cc16'
        };
        return colors[val] || '#4ade80';
    };

    return (
        <div style={{ padding: '20px', fontFamily: '"Menlo", "Monaco", "Courier New", monospace', color: '#e0e0e0' }}>
            <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', width: '400px' }}>
                <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>SCORE: {score}</span>
                {gameOver && <span style={{ color: '#ff5f56', animation: 'pulse 1s infinite' }}>GAME OVER</span>}
            </div>
            
            <div style={{
                width: '400px', height: '400px',
                background: 'rgba(25, 25, 30, 0.9)',
                borderRadius: '8px',
                padding: '10px',
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '10px',
                boxShadow: '0 0 20px rgba(0,0,0,0.5)'
            }}>
                {grid.map((row, r) => row.map((val, c) => (
                    <div key={`${r}-${c}`} style={{
                        background: val === 0 ? 'rgba(0,0,0,0.3)' : getTileColor(val),
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: val > 512 ? '1.5rem' : '2rem',
                        fontWeight: 'bold',
                        color: val === 0 ? 'transparent' : '#fff',
                        transition: 'all 0.1s ease-in-out',
                        boxShadow: val > 0 ? `0 0 10px ${getTileColor(val)}40` : 'none'
                    }}>
                        {val}
                    </div>
                )))}
            </div>
            
            <div style={{ marginTop: '20px', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
                [Arrows] or [W,A,S,D] to slide.
                {gameOver && (
                    <button 
                        onClick={restartGame}
                        style={{ 
                            display: 'block',
                            marginTop: '15px', 
                            background: 'transparent', 
                            border: '1px solid #e0e0e0', 
                            color: '#e0e0e0', 
                            padding: '8px 16px', 
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            borderRadius: '4px'
                        }}
                    >
                        Press [Enter] or Click to Restart
                    </button>
                )}
            </div>
        </div>
    );
}
