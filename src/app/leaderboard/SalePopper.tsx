import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';

export default function SalePopper({ ogaName, amount, show, onDone }: { ogaName: string; amount: number; show: boolean; onDone: () => void }) {
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [showAudioPrompt, setShowAudioPrompt] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Check if audio is enabled on mount
  useEffect(() => {
    const hasInteracted = localStorage.getItem('audioEnabled');
    if (hasInteracted === 'true') {
      setAudioEnabled(true);
    }
  }, []);

  // Show audio prompt when sale popper first appears and audio isn't enabled
  useEffect(() => {
    if (show && !audioEnabled) {
      setShowAudioPrompt(true);
    }
  }, [show, audioEnabled]);

  const enableAudio = async () => {
    try {
      // Create a simple audio context to unlock audio
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const audioContext = new AudioContext();
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }
      }
      
      // Try creating and playing a short silent audio
      const audio = new Audio('data:audio/mpeg;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gTGFTb25vdGhlcXVlLm9yZwBURU5DAAAAHQAABAAAAAZGZB//AAADjUFETEEAAA==');
      audio.volume = 0.01;
      
      await audio.play();
      audio.pause();
      
      // Success - enable audio
      setAudioEnabled(true);
      setShowAudioPrompt(false);
      localStorage.setItem('audioEnabled', 'true');
      
      // Play celebration sound if sale is currently showing
      if (show) {
        playCelebrationSound();
      }
    } catch (error) {
      console.log('Audio enable error:', error);
      // Even if there's an error, allow the user to proceed
      setAudioEnabled(true);
      setShowAudioPrompt(false);
      localStorage.setItem('audioEnabled', 'true');
      
      if (show) {
        playCelebrationSound();
      }
    }
  };

  const playCelebrationSound = () => {
    if (audioEnabled) {
      const audio = new Audio('/celeb.mp3');
      audio.volume = 0.7;
      audio.play().catch(() => {
        // Fallback: audio might still be restricted
      });
      audioRef.current = audio;
    }
  };
  // Show the popper for just the animation duration
  useEffect(() => {
    if (!show) return;
    const timer = setTimeout(onDone, 8000);
    return () => clearTimeout(timer);
  }, [show]);

  // Play celebration sound when show becomes true and audio is enabled
  useEffect(() => {
    if (show && audioEnabled) {
      playCelebrationSound();
    }

    // Cleanup audio when component unmounts or show becomes false
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, [show, audioEnabled]);

  // Get window size for Confetti
  const [dimensions, setDimensions] = React.useState({ width: 0, height: 0 });
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    }
  }, [show]);

  return (
    <>
      {/* Audio Enable Prompt */}
      <AnimatePresence>
        {showAudioPrompt && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80"
          >
            <div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center shadow-2xl">
              <div className="text-6xl mb-4">🔊</div>
              <h3 className="text-2xl font-bold text-gray-800 mb-3">
                Enable Sound Effects?
              </h3>
              <p className="text-gray-600 mb-6">
                Get the full celebration experience with sound when sales are completed!
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={enableAudio}
                  className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  ✓ Enable Sound
                </button>
                <button
                  onClick={() => setShowAudioPrompt(false)}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  Maybe Later
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sale Celebration */}
      <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60"
        >
          <Confetti width={dimensions.width} height={dimensions.height} numberOfPieces={350} recycle={false} />
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-7xl mb-6 animate-bounce">🎉</div>
            <div className="text-3xl md:text-5xl font-extrabold text-center text-white drop-shadow-lg mb-2">
              {ogaName} completed a sale of
            </div>
            <div className="text-4xl md:text-6xl font-black text-yellow-200 drop-shadow-2xl">
              ₹{amount.toLocaleString()}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}