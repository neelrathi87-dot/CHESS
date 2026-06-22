// Global Audio Engine for Chess
// Prevents sounds from skipping or re-initializing when components re-render

class SoundManager {
  constructor() {
    this.sounds = {};
    this.initialized = false;
  }

  init() {
    if (this.initialized || typeof window === 'undefined') return;
    
    try {
      this.sounds = {
        move: new Audio('/sounds/move.mp3'),
        capture: new Audio('/sounds/capture.mp3'),
        check: new Audio('/sounds/check.mp3'),
        gameEnd: new Audio('/sounds/game-end.mp3')
      };
      this.initialized = true;
    } catch (e) {
      console.warn("Audio not supported or failed to initialize", e);
    }
  }

  play(type) {
    if (!this.initialized) this.init();
    
    const audio = this.sounds[type];
    if (audio) {
      // Clone the audio node so rapid sounds can overlap correctly
      const clone = audio.cloneNode();
      clone.volume = 0.6; // slightly reduced volume so it isn't deafening
      clone.play().catch(err => {
        // Browsers block autoplay until the user interacts with the page.
        // This is normal and we swallow the error silently.
      });
    }
  }
}

export const soundManager = new SoundManager();

export const playSound = (type) => {
  soundManager.play(type);
};
