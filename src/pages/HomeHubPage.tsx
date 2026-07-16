import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Plus, Users, ArrowRight, Copy, Search } from 'lucide-react';
import { subscribeToTournaments, type Tournament } from '../firebase/db';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

export default function HomeHubPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTournaments = useMemo(() => {
    if (!searchQuery.trim()) return tournaments;
    const q = searchQuery.toLowerCase();
    return tournaments.filter(t => t.name.toLowerCase().includes(q));
  }, [tournaments, searchQuery]);

  useEffect(() => {
    const unsub = subscribeToTournaments((data) => {
      setTournaments(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center max-w-7xl mx-auto w-full pt-8 px-4">
      <div className="text-center mb-8">
        <Trophy className="w-12 h-12 text-primary mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-white mb-2">Pro<span className="text-primary">Manager</span> Hub</h1>
        <p className="text-slate-400 text-base">Create a tournament or join an existing one.</p>
      </div>

      <div className="w-full flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold text-white">Active Tournaments</h2>
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search tournaments..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="input pl-9 w-full bg-slate-900/50"
            />
          </div>
          <button 
            onClick={() => navigate('/volleyball/create')}
            className="btn btn-primary w-full sm:w-auto shrink-0"
          >
            <Plus className="w-5 h-5 mr-2" /> Create Tournament
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-slate-400 py-12">Loading tournaments...</div>
      ) : tournaments.length === 0 ? (
        <div className="card w-full p-12 text-center text-slate-400 border-dashed border-2 border-white/10 bg-transparent">
          No tournaments available right now. Be the first to create one!
        </div>
      ) : filteredTournaments.length === 0 ? (
        <div className="card w-full p-12 text-center text-slate-400 border-dashed border-2 border-white/10 bg-transparent">
          No matching tournaments found.
        </div>
      ) : (
        <div className="w-full">
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {filteredTournaments.map((t, idx) => (
              <motion.div 
                key={t.id} 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.05, 0.5) }}
                className="card p-6 flex flex-col justify-between gap-6 group hover:border-primary/50 transition-colors cursor-pointer w-full" 
                onClick={() => navigate(`/volleyball/tournament/${t.id}`)}
              >
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors line-clamp-2 pr-2">{t.name}</h3>
                    {user && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/volleyball/create?copyFrom=${t.id}`);
                        }}
                        className="p-2 -mr-2 -mt-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
                        title="Copy Tournament"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="flex flex-col gap-3 mt-2 text-sm text-slate-400">
                    <span className="flex items-center gap-2"><Users className="w-4 h-4 text-slate-500"/> {t.expectedTeams} Teams limit</span>
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-slate-500" />
                      <span className="font-bold text-slate-300">
                        {t.status}
                      </span>
                    </span>
                    {t.winnerName && (
                      <span className="flex items-center gap-2 text-yellow-500 font-bold mt-1">
                        🏆 Winner: {t.winnerName}
                      </span>
                    )}
                  </div>
                </div>
                <button className="btn btn-primary w-full mt-auto opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 sm:opacity-0 opacity-100">
                  View <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              </motion.div>
            ))}
          </motion.div>
        </div>
      )}
    </div>
  );
}
