document.addEventListener("DOMContentLoaded", () => {
  const predefinedImages = (() => {
    
    // Generar números del 1 al 40
    const generateConsecutive = (start, end) =>
      Array.from({ length: end - start + 1 }, (_, i) => start + i);

    // Generar números especiales (en este caso solo el 50)
    const specialNumbers = [50];

    // Combinar ambos conjuntos y mapear a rutas
    return [...generateConsecutive(1, 50), ...specialNumbers].map(
      (num) => `images/${num}.gif`
    );
  })();

  const phases = {};
  document.querySelectorAll(".phase-btn").forEach((btn) => {
    const [start, end] = btn.dataset.images.split("-").map(Number);
    phases[btn.dataset.phase] = predefinedImages.slice(
      start ? start - 1 : end - 1,
      end || start
    );
  });

  // Configuración de sonidos
  const soundSettings = {
    flipVolume: 0.3,
    matchVolume: 0.5,
    globalVolume: 1,
    maxConcurrentSounds: 9, // Máximo de sonidos simultáneos
    activeSounds: [],
  };
    let loopInterval = null;
    const loopDuration = 4800; // 4.8 segundos en milisegundos
    let nextLoopStart = Date.now() + loopDuration;


  const gameState = {
    moves: 0,
    timer: 0,
    lockBoard: false,
    matchedPairs: 0,
    firstCard: null,
    secondCard: null,
    selectedImages: new Set(),
    timerInterval: null,
  };

  const elements = {
    phaseButtons: document.querySelectorAll(".phase-btn"),
    imageSelector: document.getElementById("imageSelector"),
    startButton: document.getElementById("startGame"),
    counter: document.querySelector("#counter span"),
    stats: document.querySelector(".stats"),
    gameGrid: document.getElementById("gameGrid"),
    restartButton: document.getElementById("restart"),
    pauseButton: document.getElementById("pauseButton"),
    returnButton: document.getElementById("returnToSelection"),
    movesCounter: document.getElementById("moves"),
    timerDisplay: document.getElementById("timer"),
    winModal: document.getElementById("winModal"),
    finalMoves: document.getElementById("finalMoves"),
    finalTime: document.getElementById("finalTime"),
    closeModal: document.getElementById("closeModal"),
    imageOptionTemplate: document.getElementById("imageOptionTemplate"),
    cardTemplate: document.getElementById("cardTemplate"),
  };

  // Función para cargar imágenes de la fase
  function loadPhaseImages(phaseNumber) {
    elements.imageSelector.innerHTML = "";
    phases[phaseNumber].forEach((imgSrc) => {
      const clone = elements.imageOptionTemplate.content.cloneNode(true);
      const div = clone.querySelector(".image-option");
      const img = div.querySelector("img");
      img.src = imgSrc;
      img.loading = "lazy"; // ← Corregido
      div.addEventListener("click", () => toggleImageSelection(imgSrc, div));
      elements.imageSelector.appendChild(clone);
    });
  }

  // Manejadores de eventos para las pestañas
  elements.phaseButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const phaseNumber = parseInt(btn.dataset.phase);
      // Limpiar selección al cambiar de fase
      gameState.selectedImages.clear();
      document
        .querySelectorAll(".image-option")
        .forEach((opt) => opt.classList.remove("selected"));
      updateSelectionUI();

      // Cambiar fase activa
      elements.phaseButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      loadPhaseImages(phaseNumber); // ← Usar variable numérica
    });
  });

  // Cargar selector de imágenes
  predefinedImages.forEach((imgSrc) => {
    const div = document.createElement("div");
    div.className = "image-option";
    div.innerHTML = `<img src="${imgSrc}" alt="Opción de imagen" loading="lazy">`;
    div.addEventListener("click", () => toggleImageSelection(imgSrc, div));
    elements.imageSelector.appendChild(div);
  });

  function toggleImageSelection(imgSrc, element) {

    if (gameState.selectedImages.has(imgSrc)) {
      gameState.selectedImages.delete(imgSrc);
      element.classList.remove("selected");
    } else {
      if (gameState.selectedImages.size >= 8) return;
      gameState.selectedImages.add(imgSrc);
      element.classList.add("selected");
    }
    updateSelectionUI();
  }

  // Cargar fase inicial
  loadPhaseImages(1);

  function updateSelectionUI() {
    elements.counter.textContent = gameState.selectedImages.size;
    elements.startButton.disabled = gameState.selectedImages.size !== 8;
  }

  elements.startButton.addEventListener("click", () => {
    elements.imageSelector.style.display = "none";
    elements.startButton.style.display = "none";
    elements.stats.style.display = "flex";
    elements.gameGrid.style.display = "grid";
    elements.restartButton.style.display = "block";
    elements.returnButton.style.display = "block";
    initializeGame(Array.from(gameState.selectedImages));
  });

  elements.restartButton.addEventListener("click", () => {
    resetGame();
    initializeGame(Array.from(gameState.selectedImages));
  });

  elements.returnButton.addEventListener("click", returnToSelection);

  elements.closeModal.addEventListener("click", () => {
    elements.winModal.style.display = "none";
  });

  function startLoopTimer() {
    if (loopInterval) clearInterval(loopInterval);
    const currentTime = Date.now();
    nextLoopStart = currentTime + (loopDuration - (currentTime % loopDuration));
    loopInterval = setInterval(() => {
        const now = Date.now();
        nextLoopStart = now + loopDuration;
        soundSettings.activeSounds.forEach((sound) => {
            if (sound.loop && !sound.paused && sound.dataset.manuallyPaused !== "true") {
                sound.currentTime = 0; // Reiniciar solo si no está pausado manualmente
            }
        });
    }, loopDuration);
}

  function returnToSelection() {
    resetGame();
    elements.imageSelector.style.display = "grid";
    elements.startButton.style.display = "block";
    elements.stats.style.display = "none";
    elements.gameGrid.style.display = "none";
    elements.restartButton.style.display = "none";
    elements.returnButton.style.display = "none";
    gameState.selectedImages.clear();
    document.querySelectorAll(".image-option").forEach((option) => {
      option.classList.remove("selected");
    });
    updateSelectionUI();
    elements.winModal.style.display = "none";
  }

  function initializeGame(selectedImages) {
    resetGame();
    createBoard(selectedImages);
    startTimer();
    startLoopTimer(); // Añadir esta línea si no está presente
}

  function startLoopTimer() {
    if (loopInterval) clearInterval(loopInterval); // Limpiar intervalo previo si existe
    nextLoopStart = Date.now() + loopDuration; // Establecer el próximo inicio
    loopInterval = setInterval(() => {
      nextLoopStart += loopDuration; // Actualizar el próximo inicio
      // Reiniciar todos los sonidos activos
      soundSettings.activeSounds.forEach((sound) => {
        if (sound.loop) { // Solo sonidos en loop (coincidencias)
          sound.currentTime = 0; // Reiniciar al inicio
          if (sound.paused) {
            sound.play().catch((error) => console.error("Error al reiniciar sonido:", error));
          }
        }
      });
    }, loopDuration);
  }

  function resetGame() {
    clearInterval(gameState.timerInterval);
    gameState.moves = 0;
    gameState.timer = 0;
    gameState.matchedPairs = 0;
    gameState.firstCard = null;
    gameState.secondCard = null;
    gameState.lockBoard = false;
    elements.movesCounter.textContent = "0";
    elements.timerDisplay.textContent = "0:00";
    elements.gameGrid.innerHTML = "";
  
    // Detener y limpiar sonidos activos
    soundSettings.activeSounds.forEach((sound) => {
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
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  // Función createBoard optimizada
  async function createBoard(images) {
    elements.gameGrid.innerHTML = "";
    const duplicatedImages = images.flatMap((img) => [img, img]);
    const cards = shuffle(duplicatedImages);

    cards.forEach((image) => {
      const clone = elements.cardTemplate.content.cloneNode(true);
      const card = clone.querySelector(".card");
      const img = card.querySelector("img");
      img.src = image;
      card.dataset.image = image;

      card.addEventListener("click", () => {
        handleCardClick(card);
      });
      card.addEventListener("touchstart", (e) => {
        e.preventDefault(); // Evitar el comportamiento predeterminado (como zoom)
        handleCardClick(card);
      }, { passive: false });
      elements.gameGrid.appendChild(clone);
    });
  }

  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      // const j = i + 1;
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  function handleCardClick(card) {
    if (
      gameState.lockBoard ||
      card === gameState.firstCard ||
      card.classList.contains("matched")
    )
      return;
    flipCard(card);
    if (!gameState.firstCard) {
      gameState.firstCard = card;
      return;
    }
    gameState.secondCard = card;
    gameState.lockBoard = true;
    checkMatch();
  }

  function playSound(soundPath, volumeMultiplier = 1) {
    try {
        const imageNumber = soundPath.split("/").pop().split(".")[0];
        let audio = soundSettings.activeSounds.find(
            (s) => s.dataset.imageNumber === imageNumber
        );

        if (!audio) {
            if (soundSettings.activeSounds.length >= soundSettings.maxConcurrentSounds) {                
                return null;
            }

            audio = new Audio(soundPath);
            audio.volume = soundSettings.globalVolume * volumeMultiplier;
            audio.dataset.imageNumber = imageNumber;
            audio.dataset.manuallyPaused = "false";

            if (isMatchSound(soundPath)) {
                audio.loop = true;
                const currentTime = Date.now();
                let delay = nextLoopStart - currentTime;
                if (delay <= 0) {
                    // Si el delay es cero o negativo, esperar al siguiente ciclo
                    delay += loopDuration;
                }
                audio.scheduledTimeout = setTimeout(() => {
                    audio.play().catch((error) => console.error("Error al programar sonido:", error));
                }, delay);
            } else {
                audio.loop = false;
                audio.play().catch((error) => console.error(`playSound: Error al reproducir sonido no-loop para ${imageNumber}:`, error));
            }

            soundSettings.activeSounds.push(audio);
            audio.addEventListener("ended", () => {
                soundSettings.activeSounds = soundSettings.activeSounds.filter(
                    (s) => s !== audio
                );
            });
        }

        return audio;
    } catch (error) {
        console.error(`playSound: Error general al cargar sonido para ${soundPath}:`, error);
        return null;
    }
  }

  // Función auxiliar para verificar si es un sonido de coincidencia
  function isMatchSound(soundPath) {
    const pattern = /^sounds\/\d+\.wav$/;
    return pattern.test(soundPath);
  }

  function flipCard(card) {
    playSound("sounds/flipcard.mp3", soundSettings.flipVolume);
    card.classList.add("flipped");
  }

  function checkMatch() {
    gameState.moves++;
    elements.movesCounter.textContent = gameState.moves;

    const isMatch =
      gameState.firstCard.dataset.image === gameState.secondCard.dataset.image;

    if (isMatch) {
      gameState.matchedPairs++;
      const imageNumber = gameState.firstCard.dataset.image
        .split("/")
        .pop()
        .split(".")[0];

      gameState.firstCard.classList.add("matched");
      gameState.secondCard.classList.add("matched");

      playMatchSound(imageNumber, gameState.firstCard, gameState.secondCard);

      gameState.firstCard.style.transform = "rotateY(180deg) scale(1.1)";
      gameState.secondCard.style.transform = "rotateY(180deg) scale(1.1)";
      setTimeout(() => {
        gameState.firstCard.style.transform = "rotateY(180deg)";
        gameState.secondCard.style.transform = "rotateY(180deg)";
      }, 200);
    }

    setTimeout(() => {
      if (!isMatch) {
        gameState.firstCard.classList.remove("flipped");
        gameState.secondCard.classList.remove("flipped");
      }
      resetBoard();
    }, 1000);
  }

  // En la función playMatchSound, corregir:
  function playMatchSound(imageNumber, firstCard, secondCard) {
    const soundPath = `sounds/${imageNumber}.wav`;
    const audio = playSound(soundPath, soundSettings.matchVolume);
    if (!audio) {
      console.warn(`playMatchSound: No se pudo reproducir el sonido para ${imageNumber}`);
      return null;
    }
  
    const cardContainer1 = firstCard.closest(".card-container");
    const pauseButton1 = cardContainer1.querySelector(".pause-button");
    const cardContainer2 = secondCard.closest(".card-container");
    const pauseButton2 = cardContainer2.querySelector(".pause-button");
  
    if (pauseButton1 && pauseButton2) {
      pauseButton1.style.display = "block";
      pauseButton2.style.display = "block";
      pauseButton1.dataset.imageNumber = imageNumber;
      pauseButton2.dataset.imageNumber = imageNumber;
  
      const handlePauseInteraction = (e) => {
        e.stopPropagation();
        e.preventDefault();
        const btn = e.target;
        const imgNum = btn.dataset.imageNumber;
        togglePauseSound(imgNum, btn);
      };
  
      // Limpiar eventos previos
      pauseButton1.removeEventListener("click", handlePauseInteraction);
      pauseButton2.removeEventListener("click", handlePauseInteraction);
      pauseButton1.removeEventListener("touchstart", handlePauseInteraction);
      pauseButton2.removeEventListener("touchstart", handlePauseInteraction);
  
      // Agregar eventos de clic y toque
      pauseButton1.addEventListener("click", handlePauseInteraction);
      pauseButton2.addEventListener("click", handlePauseInteraction);
      pauseButton1.addEventListener("touchstart", (e) => handlePauseInteraction(e), { passive: false });
      pauseButton2.addEventListener("touchstart", (e) => handlePauseInteraction(e), { passive: false });
    } else {
      console.warn(`playMatchSound: Botones de pausa no encontrados para ${imageNumber}`);
    }
  
    return audio;
  }

  function togglePauseSound(imageNumber, button) {
    const sound = soundSettings.activeSounds.find(
        (audio) => audio.dataset.imageNumber === String(imageNumber)
    );
    if (sound) {
        const pauseButtons = document.querySelectorAll(
            `.pause-button[data-image-number="${imageNumber}"]`
        );
        if (!sound.paused) {
            sound.pause();
            sound.dataset.manuallyPaused = "true";
            pauseButtons.forEach((btn) => (btn.textContent = "▶️"));
        } else {
            sound.dataset.manuallyPaused = "false";
            sound.play().catch((error) => console.error("Error al reanudar:", error));
            pauseButtons.forEach((btn) => (btn.textContent = "⏸️"));
        }
    } else {
        console.warn(`togglePauseSound: Sonido no encontrado para ${imageNumber}`);
    }
}

  function resetBoard() {
    gameState.firstCard = null;
    gameState.secondCard = null;
    gameState.lockBoard = false;
  
    if (gameState.matchedPairs === gameState.selectedImages.size) {      
      clearInterval(gameState.timerInterval);
      setTimeout(() => {
        showWinModal();
      }, 1000); // Esperar 1 segundo para que el sonido y la animación del último match se completen
    }
  }

  function showWinModal() {
    elements.finalMoves.textContent = gameState.moves;
    elements.finalTime.textContent = formatTime(gameState.timer);
    elements.winModal.style.display = "flex";    
  }
});
