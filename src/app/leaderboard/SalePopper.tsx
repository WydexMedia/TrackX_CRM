import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';

export default function SalePopper({ ogaName, amount, show, onDone }: { ogaName: string; amount: number; show: boolean; onDone: () => void }) {
  // Show the popper for just the animation duration (e.g., 1s)
  useEffect(() => {
    if (!show) return;
    const timer = setTimeout(onDone, 8000); // 5 seconds for full-screen effect
    return () => clearTimeout(timer);
  }, [show]); // Remove onDone from dependency list for timer stability

  // Get window size for Confetti
  const [dimensions, setDimensions] = React.useState({ width: 0, height: 0 });
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    }
  }, [show]);

  return (
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
  );
}
