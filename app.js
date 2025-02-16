document.addEventListener('DOMContentLoaded', () => {

    const predefinedImages = (() => {
        // Generar números del 1 al 40
        const generateConsecutive = (start, end) => 
            Array.from({length: end - start + 1}, (_, i) => start + i);
        
        // Generar números especiales (en este caso solo el 50)
        const specialNumbers = [50];
        
        // Combinar ambos conjuntos y mapear a rutas
        return [...generateConsecutive(1, 50), ...specialNumbers]
               .map(num => `images/${num}.gif`);
    })();

    const phases = {
        1: predefinedImages.slice(0, 20),
        2: predefinedImages.slice(20, 40),
        3: predefinedImages.slice(49, 50)
    };

    // Configuración de sonidos
    const soundSettings = {
        flipVolume: 0.3,
        matchVolume: 0.5,
        globalVolume: 1,
        maxConcurrentSounds: 8, // Máximo de sonidos simultáneos
        activeSounds: [],
    };

    // Elementos de audio
    const flipSound = document.getElementById('flipSound');

    const gameState = {
        moves: 0,
        timer: 0,
        lockBoard: false,
        matchedPairs: 0,
        firstCard: null,
        secondCard: null,
        selectedImages: new Set(),
        timerInterval: null
    };

    const elements = {
        phaseButtons: document.querySelectorAll('.phase-btn'),
        imageSelector: document.getElementById('imageSelector'),
        startButton: document.getElementById('startGame'),
        counter: document.querySelector('#counter span'),
        stats: document.querySelector('.stats'),
        gameGrid: document.getElementById('gameGrid'),
        restartButton: document.getElementById('restart'),
        returnButton: document.getElementById('returnToSelection'),
        movesCounter: document.getElementById('moves'),
        timerDisplay: document.getElementById('timer'),
        winModal: document.getElementById('winModal'),
        finalMoves: document.getElementById('finalMoves'),
        finalTime: document.getElementById('finalTime'),
        closeModal: document.getElementById('closeModal')
    };

    // Función para cargar imágenes de la fase
    function loadPhaseImages(phaseNumber) {
        elements.imageSelector.innerHTML = '';
        phases[phaseNumber].forEach(imgSrc => {
            const div = document.createElement('div');
            div.className = 'image-option';
            div.innerHTML = `<img src="${imgSrc}" alt="Opción de imagen" loading="lazy">`;
            div.addEventListener('click', () => toggleImageSelection(imgSrc, div));
            elements.imageSelector.appendChild(div);
        });
    }

         // Manejadores de eventos para las pestañas
         elements.phaseButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const phaseNumber = parseInt(btn.dataset.phase);
                // Limpiar selección al cambiar de fase
                gameState.selectedImages.clear();
                document.querySelectorAll('.image-option').forEach(opt => opt.classList.remove('selected'));
                updateSelectionUI();
                
                // Cambiar fase activa
                elements.phaseButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                loadPhaseImages(phaseNumber); // ← Usar variable numérica
            });
        });    
   
    // Cargar selector de imágenes
    predefinedImages.forEach(imgSrc => {
        const div = document.createElement('div');
        div.className = 'image-option';
        div.innerHTML = `<img src="${imgSrc}" alt="Opción de imagen" loading="lazy">`;
        div.addEventListener('click', () => toggleImageSelection(imgSrc, div));
        elements.imageSelector.appendChild(div);
    });

    function toggleImageSelection(imgSrc, element) {
        if (gameState.selectedImages.has(imgSrc)) {
            gameState.selectedImages.delete(imgSrc);
            element.classList.remove('selected');
        } else {
            if (gameState.selectedImages.size >= 8) return;
            gameState.selectedImages.add(imgSrc);
            element.classList.add('selected');
        }
        updateSelectionUI();
    }

    // Cargar fase inicial
    loadPhaseImages(1);

    function updateSelectionUI() {
        elements.counter.textContent = gameState.selectedImages.size;
        elements.startButton.disabled = gameState.selectedImages.size !== 8;
    }

    elements.startButton.addEventListener('click', () => {
        elements.imageSelector.style.display = 'none';
        elements.startButton.style.display = 'none';
        elements.stats.style.display = 'flex';
        elements.gameGrid.style.display = 'grid';
        elements.restartButton.style.display = 'block';
        elements.returnButton.style.display = 'block';
        initializeGame(Array.from(gameState.selectedImages));
    });

    elements.restartButton.addEventListener('click', () => {
        resetGame();
        initializeGame(Array.from(gameState.selectedImages));
    });

    elements.returnButton.addEventListener('click', returnToSelection);
    
    elements.closeModal.addEventListener('click', () => {
        elements.winModal.style.display = 'none';
    });

    function returnToSelection() {
        resetGame();
        elements.imageSelector.style.display = 'grid';
        elements.startButton.style.display = 'block';
        elements.stats.style.display = 'none';
        elements.gameGrid.style.display = 'none';
        elements.restartButton.style.display = 'none';
        elements.returnButton.style.display = 'none';
        gameState.selectedImages.clear();
        document.querySelectorAll('.image-option').forEach(option => {
            option.classList.remove('selected');
        });
        updateSelectionUI();
        elements.winModal.style.display = 'none';
    }

    async function initializeGame(selectedImages) {
        resetGame();
        await createBoard(selectedImages);
        startTimer();
    }

    function resetGame() {
        clearInterval(gameState.timerInterval);
        gameState.moves = 0;
        gameState.timer = 0;
        gameState.matchedPairs = 0;
        gameState.firstCard = null;
        gameState.secondCard = null;
        gameState.lockBoard = false;
        elements.movesCounter.textContent = '0';
        elements.timerDisplay.textContent = '0:00';
        elements.gameGrid.innerHTML = '';

        // Detener y reiniciar todos los sonidos activos
        soundSettings.activeSounds.forEach(sound => {
            sound.pause();
            sound.currentTime = 0;
        });
        soundSettings.activeSounds = [];
    }

    function startTimer() {
        gameState.timerInterval = setInterval(() => {
            gameState.timer++;
            elements.timerDisplay.textContent = formatTime(gameState.timer);
        }, 1000);
    }

    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    async function createBoard(images) {
        elements.gameGrid.innerHTML = '';
        
        await Promise.all(images.map(src => 
            new Promise(resolve => {
                const img = new Image();
                img.src = src;
                img.onload = resolve;
            })
        ))
        
        const cards = shuffle([...images, ...images]);
        
        cards.forEach(image => {
            const card = document.createElement('button');
            card.className = 'card';
            card.dataset.image = image;
            card.innerHTML = `<img src="${image}" alt="Imagen del juego">`;
            card.addEventListener('click', () => handleCardClick(card));
            elements.gameGrid.appendChild(card);
        });
    }

    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    function handleCardClick(card) {
        if (gameState.lockBoard || card === gameState.firstCard || card.classList.contains('matched')) return;
        
        flipCard(card);
        
        if (!gameState.firstCard) {
            gameState.firstCard = card;
            return;
        }
        
        gameState.secondCard = card;
        gameState.lockBoard = true;
        checkMatch();
    }

    // Función para reproducir sonidos superpuestos
    function playSound(soundPath, volumeMultiplier = 1) {
        try {
            if(soundSettings.activeSounds.length >= soundSettings.maxConcurrentSounds) return;
            
            const audio = new Audio(soundPath);            
            audio.volume = soundSettings.globalVolume * volumeMultiplier;
            
            // Configurar el manejo de finalización para sonidos no loop
            if (soundPath !== 'sounds/flipcard.mp3') {
                audio.loop = true;
                // Eliminar del array cuando se detenga manualmente
                const stopHandler = () => {
                    soundSettings.activeSounds = soundSettings.activeSounds.filter(s => s !== audio);
                    audio.removeEventListener('pause', stopHandler);
                };
                audio.addEventListener('pause', stopHandler);
            }
            
            audio.addEventListener('ended', () => {
                soundSettings.activeSounds = soundSettings.activeSounds.filter(s => s !== audio);
            });
            
            soundSettings.activeSounds.push(audio);
            audio.play().catch(error => console.error('Error al reproducir:', error));
            
        } catch(error) {
            console.error('Error al cargar sonido:', error);
        }
    }

    function flipCard(card) {
        playSound('sounds/flipcard.mp3', soundSettings.flipVolume);
        card.classList.add('flipped');
    }

    function checkMatch() {
        gameState.moves++;
        elements.movesCounter.textContent = gameState.moves;
        
        const isMatch = gameState.firstCard.dataset.image === gameState.secondCard.dataset.image;
        
        if (isMatch) {
            gameState.matchedPairs++;
            const imageNumber = gameState.firstCard.dataset.image.split('/').pop().split('.')[0];
            playSound(`sounds/${imageNumber}.wav`, soundSettings.matchVolume);

            // Efecto rítmico visual
            gameState.firstCard.style.transform = 'rotateY(180deg) scale(1.1)';
            gameState.secondCard.style.transform = 'rotateY(180deg) scale(1.1)';
            setTimeout(() => {
                gameState.firstCard.style.transform = 'rotateY(180deg)';
                gameState.secondCard.style.transform = 'rotateY(180deg)';
            }, 200);
        }

        setTimeout(() => {
            if (!isMatch) {
                gameState.firstCard.classList.remove('flipped');
                gameState.secondCard.classList.remove('flipped');
            }
            resetBoard();
        }, 1000);
    }

    function resetBoard() {
        gameState.firstCard = null;
        gameState.secondCard = null;
        gameState.lockBoard = false;
        
        if (gameState.matchedPairs === gameState.selectedImages.size) {
            clearInterval(gameState.timerInterval);
            showWinModal();
        }
    }

    function showWinModal() {
        elements.finalMoves.textContent = gameState.moves;
        elements.finalTime.textContent = formatTime(gameState.timer);
        elements.winModal.style.display = 'flex';
    }

    // // Función para obtener el sonido correspondiente
    // function getMatchSound(imagePath) {
    //     const imageNumber = imagePath.split('/').pop().split('.')[0];
    //     return new Audio(`sounds/${imageNumber}.wav`);
    // }
});        
