import { useNavigate } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';

const SPORTS = [
  { id: 'volleyball', name: 'Volleyball', emoji: '🏐', active: true, path: '/volleyball' },
  { id: 'badminton', name: 'Badminton', emoji: '🏸', active: true, path: '/badminton' },
  { id: 'basketball', name: 'Basketball', emoji: '🏀', active: false },
  { id: 'soccer', name: 'Soccer', emoji: '⚽', active: false },
  { id: 'tennis', name: 'Tennis', emoji: '🎾', active: false },
  { id: 'table_tennis', name: 'Table Tennis', emoji: '🏓', active: false },
  { id: 'cricket', name: 'Cricket', emoji: '🏏', active: false },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="flex-1 flex flex-col items-center max-w-5xl mx-auto w-full pt-16 px-4">
      <div className="text-center mb-16">
        <Trophy className="w-24 h-24 text-primary mx-auto mb-6" />
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
          Pro<span className="text-primary">Manager</span>
        </h1>
        <p className="text-slate-400 text-xl max-w-2xl mx-auto">
          The ultimate platform for organizing, managing, and live-scoring sports tournaments. Choose your sport to get started.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full pb-16">
        {SPORTS.map((sport, idx) => (
          <motion.div
            key={sport.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            onClick={() => sport.active && sport.path && navigate(sport.path)}
            className={clsx(
              "card p-8 flex flex-col items-center justify-center gap-4 text-center transition-all relative overflow-hidden",
              sport.active 
                ? "cursor-pointer hover:border-primary/50 hover:bg-slate-900/80 group" 
                : "opacity-60 cursor-not-allowed grayscale-[0.5]"
            )}
          >
            <div className="text-6xl mb-2 leading-normal transition-transform duration-300 group-hover:scale-110">
              {sport.emoji}
            </div>
            <h2 className={clsx(
              "text-2xl font-bold transition-colors",
              sport.active ? "text-white group-hover:text-primary" : "text-slate-400"
            )}>
              {sport.name}
            </h2>
            
            {!sport.active && (
              <div className="absolute top-4 right-4 bg-slate-800 text-xs font-bold px-3 py-1 rounded-full text-slate-400 border border-slate-700">
                Coming Soon
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
