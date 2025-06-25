document.addEventListener('DOMContentLoaded', () => {
    const gameContainer = document.getElementById('game-container');
    const player = document.getElementById('player');
    const jumpButton = document.getElementById('jump-button');
    const scoreDisplay = document.getElementById('score-display');
    const gameOverScreen = document.getElementById('game-over-screen');
    const finalScoreDisplay = document.getElementById('final-score');
    const restartButton = document.getElementById('restart-button');

    // Game constants
    const playerWidth = 200;
    const playerHeight = 200;
    const gravity = 0.7;
    const jumpPower = 20;
    const gameSpeed = 7;
    const platformHeight = 20;
    const collectibleSize = 50;

    // Game state
    let playerBottom, playerLeft, playerVelocityY;
    let score;
    let gameOver;
    let gameElements;
    let isGrounded;
    let hasBalloon;
    let attachedBalloon;

    function createPlatform(left, width, bottom) {
        const platform = document.createElement('div');
        platform.classList.add('platform');
        platform.style.width = `${width}px`;
        platform.style.height = `${platformHeight}px`;
        platform.style.left = `${left}px`;
        platform.style.bottom = `${bottom}px`;
        gameContainer.appendChild(platform);
        return { type: 'platform', element: platform, left, width, bottom };
    }

    function createCollectible(type, left, bottom) {
        const collectible = document.createElement('div');
        collectible.classList.add('collectible', type);
        collectible.style.width = `${collectibleSize}px`;
        collectible.style.height = `${collectibleSize}px`;
        collectible.style.left = `${left}px`;
        collectible.style.bottom = `${bottom}px`;
        gameContainer.appendChild(collectible);
        return { type, element: collectible, left, bottom, collected: false };
    }

    function initializeGame() {
        // Clear previous game elements
        if (gameElements) {
            gameElements.forEach(item => item.element.remove());
        }
        gameElements = [];

        // Reset game state
        score = 0;
        gameOver = false;
        playerLeft = 50;
        playerVelocityY = 0;
        isGrounded = true;
        hasBalloon = false;
        attachedBalloon = null;

        scoreDisplay.textContent = `Score: ${score}`;
        gameOverScreen.style.display = 'none';
        player.style.display = 'block';

        // Initial ground platform
        const ground = createPlatform(0, window.innerWidth, 0);
        gameElements.push(ground);
        playerBottom = platformHeight; // Start on top of the ground

        player.style.left = `${playerLeft}px`;
        player.style.bottom = `${playerBottom}px`;

        // Generate initial world
        let currentX = window.innerWidth;
        while (currentX < window.innerWidth * 2) {
            const platformWidthRand = Math.random() * 150 + 150;
            const platformGap = Math.random() * 200 + 150;
            const platformLeft = currentX + platformGap;
            const platformBottom = Math.random() * 150 + 50;

            const newPlatform = createPlatform(platformLeft, platformWidthRand, platformBottom);
            gameElements.push(newPlatform);

            const collectibleChoice = Math.random();
            if (collectibleChoice > 0.7) {
                const collectibleType = Math.random() > 0.5 ? 'cheese' : 'bone';
                const newCollectible = createCollectible(collectibleType, platformLeft + platformWidthRand / 2 - collectibleSize / 2, platformBottom + platformHeight + 15);
                gameElements.push(newCollectible);
            } else if (collectibleChoice > 0.4) {
                const balloonLeft = platformLeft + platformWidthRand / 2 - collectibleSize / 2;
                const balloonBottom = Math.random() * 200 + 250; // Higher up
                const newBalloon = createCollectible('balloon', balloonLeft, balloonBottom);
                gameElements.push(newBalloon);
            }
            currentX = platformLeft + platformWidthRand;
        }
        
        requestAnimationFrame(gameLoop);
    }

    function jump() {
        if (gameOver) return;

        if (hasBalloon) {
            hasBalloon = false;
            if (attachedBalloon) {
                // Mark for removal on the next cleanup
                attachedBalloon.collected = true; 
                attachedBalloon = null;
            }
        } else if (isGrounded) {
            playerVelocityY = jumpPower;
            isGrounded = false;
        }
    }

    function gameLoop() {
        if (gameOver) return;

        // Apply gravity
        if (hasBalloon) {
            playerVelocityY -= gravity * -0.3; // Negative multiplier provides lift
        } else {
            playerVelocityY -= gravity;
        }
        playerBottom += playerVelocityY;

        // Move elements
        let lastPlatformRight = 0;
        gameElements.forEach(item => {
            item.left -= gameSpeed;
            item.element.style.left = `${item.left}px`;
            if (item.type === 'platform') {
                const platformRight = item.left + item.width;
                if (platformRight > lastPlatformRight) {
                    lastPlatformRight = platformRight;
                }
            }
        });

        // Generate new world elements
        if (lastPlatformRight < window.innerWidth + 200) {
            const platformWidthRand = Math.random() * 150 + 150;
            const platformGap = Math.random() * 200 + 150;
            const platformLeft = lastPlatformRight + platformGap;
            const platformBottom = Math.random() * 150 + 50;

            const newPlatform = createPlatform(platformLeft, platformWidthRand, platformBottom);
            gameElements.push(newPlatform);

            const collectibleChoice = Math.random();
            if (collectibleChoice > 0.7) {
                const collectibleType = Math.random() > 0.5 ? 'cheese' : 'bone';
                const newCollectible = createCollectible(collectibleType, platformLeft + platformWidthRand / 2 - collectibleSize / 2, platformBottom + platformHeight + 15);
                gameElements.push(newCollectible);
            } else if (collectibleChoice > 0.4) {
                const balloonLeft = platformLeft + platformWidthRand / 2 - collectibleSize / 2;
                const balloonBottom = Math.random() * 200 + 250; // Higher up
                const newBalloon = createCollectible('balloon', balloonLeft, balloonBottom);
                gameElements.push(newBalloon);
            }
        }

        // Clean up off-screen elements
        gameElements = gameElements.filter(item => {
            const itemRight = item.type === 'platform' ? item.left + item.width : item.left + collectibleSize;
            if (itemRight < 0 || (item.collected && item !== attachedBalloon)) {
                item.element.remove();
                return false;
            }
            return true;
        });

        // Platform collision detection
        isGrounded = false;
        gameElements.forEach(item => {
            if (item.type === 'platform') {
                if (
                    playerLeft < item.left + item.width &&
                    playerLeft + playerWidth > item.left &&
                    playerBottom <= item.bottom + platformHeight &&
                    playerBottom >= item.bottom
                ) {
                    // Check if player is falling and landing on top
                    const previousPlayerBottom = playerBottom - playerVelocityY;
                    if (playerVelocityY <= 0 && previousPlayerBottom >= item.bottom + platformHeight) {
                        playerBottom = item.bottom + platformHeight;
                        playerVelocityY = 0;
                        isGrounded = true;
                    }
                }
            }
        });
        
        // Collectible collision
        gameElements.forEach(item => {
            if (item.type === 'cheese' || item.type === 'bone') {
                if (!item.collected &&
                    playerLeft < item.left + collectibleSize &&
                    playerLeft + playerWidth > item.left &&
                    playerBottom < item.bottom + collectibleSize &&
                    playerBottom + playerHeight > item.bottom
                ) {
                    item.collected = true;
                    score += 10;
                    scoreDisplay.textContent = `Score: ${score}`;
                }
            } else if (item.type === 'balloon') {
                if (!item.collected && !hasBalloon &&
                    playerLeft < item.left + collectibleSize &&
                    playerLeft + playerWidth > item.left &&
                    playerBottom < item.bottom + collectibleSize &&
                    playerBottom + playerHeight > item.bottom
                ) {
                    hasBalloon = true;
                    attachedBalloon = item;
                    score += 5;
                    scoreDisplay.textContent = `Score: ${score}`;
                }
            }
        });

        // Update player and attached balloon position
        player.style.bottom = `${playerBottom}px`;

        if (hasBalloon && attachedBalloon) {
            attachedBalloon.bottom = playerBottom + playerHeight - 30;
            attachedBalloon.left = playerLeft + (playerWidth / 2) - (collectibleSize / 2);
            attachedBalloon.element.style.bottom = `${attachedBalloon.bottom}px`;
            attachedBalloon.element.style.left = `${attachedBalloon.left}px`;
        }

        // Check for game over
        if (playerBottom < -playerHeight) {
            endGame();
        } else {
            requestAnimationFrame(gameLoop);
        }
    }

    function endGame() {
        gameOver = true;
        finalScoreDisplay.textContent = `Your Score: ${score}`;
        gameOverScreen.style.display = 'flex';
        player.style.display = 'none';
    }

    // Event Listeners
    jumpButton.addEventListener('click', jump);
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            e.preventDefault();
            if (gameOver) {
                initializeGame();
            } else {
                jump();
            }
        }
    });
    restartButton.addEventListener('click', initializeGame);

    gameContainer.addEventListener('click', jump);

    // Start Game
    initializeGame();
});
