import React from 'react';
import Confetti from 'react-confetti';
import { motion, AnimatePresence } from 'framer-motion';

export default function SaleCelebration({ ogaName, amount, onDone }: { ogaName: string; amount: number; onDone: () => void }) {
  React.useEffect(() => {
    const timer = setTimeout(onDone, 2000);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
      <Confetti width={typeof window !== 'undefined' ? window.innerWidth : 1920} height={typeof window !== 'undefined' ? window.innerHeight : 1080} />
      <AnimatePresence>
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl px-12 py-10 border-4 border-yellow-400 text-center"
        >
          <div className="text-6xl mb-4">🎉</div>
          <div className="text-3xl font-extrabold text-purple-700">
            {ogaName} has completed a sale of ₹{amount}!
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
