import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTournament, useMatches, useTeams } from '../context/TournamentContext';

import { StandingsTable } from '../components/StandingsTable';
import { MatchCard } from '../components/MatchCard';
import { Trophy, List, ArrowLeft, Settings, Share2 } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '../context/AuthContext';
import { updateTournament, clearMatches, setMatchesBulk } from '../firebase/db';
import { generateDynamicTournament } from '../utils/tournamentGenerator';
import { determineTournamentWinner } from '../utils/progression';
import { motion } from 'framer-motion';

export default function TournamentBoardPage({ sport = 'volleyball' }: { sport?: 'volleyball' | 'badminton' }) {
  const { tournament } = useTournament();
  const matches = useMatches();
  const teams = useTeams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'fixtures' | 'standings'>('fixtures');
  const [activePhaseIdState, setActivePhaseIdState] = useState<string | null>(null);
  const [isManaging, setIsManaging] = useState(false);

  if (!tournament) return null;

  useEffect(() => {
    if (tournament) {
      document.title = `${tournament.name} | ProManager`;
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute('content', `Live tournament board for ${tournament.name}. View fixtures, standings, and brackets.`);
    }
  }, [tournament]);

  const activePhaseId = activePhaseIdState || tournament.phases[0]?.id;
  const activePhase = tournament.phases.find(p => p.id === activePhaseId);

  const { user } = useAuth();
  const isManager = user?.uid === tournament.managerId && !!user?.uid;

  const handleEndTournament = async () => {
    if (!confirm('Are you sure you want to end this tournament? This will move it to COMPLETED status.')) return;
    const winnerName = determineTournamentWinner(tournament, matches, teams);
    await updateTournament(tournament.id, { status: 'COMPLETED', winnerName }, sport);
  };

  const handleResetDraws = async () => {
    if (!confirm('Are you sure you want to reset all matches? This will return the tournament to Registration mode.')) return;
    await clearMatches(tournament.id, sport);
    await updateTournament(tournament.id, { status: 'REGISTRATION' }, sport);
  };

  const handleShuffleDraws = async () => {
    if (!confirm('Are you sure you want to shuffle the draws? This will regenerate all matches with random team placements.')) return;
    const approvedTeams = teams.filter(t => t.status === 'APPROVED');
    const newMatches = generateDynamicTournament(tournament.id, approvedTeams, tournament.phases);
    await clearMatches(tournament.id, sport);
    await setMatchesBulk(tournament.id, newMatches, sport);
    setIsManaging(false);
  };

  const hasStarted = matches.some(m => m.status !== 'PENDING' || m.setsWonA > 0 || m.setsWonB > 0);

  if (isManaging) {
    return (
      <div className="max-w-3xl mx-auto w-full pt-8 pb-12 px-4 sm:px-6">
        <div className="card p-6 md:p-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Settings className="w-8 h-8 text-primary" />
              Manage Board
            </h1>
            <button onClick={() => setIsManaging(false)} className="btn btn-ghost">
              Close
            </button>
          </div>

          <div className="mb-12 border border-white/5 bg-slate-900/50 p-6 rounded-xl">
            <h2 className="text-xl font-bold text-white mb-2">Tournament Status</h2>
            <p className="text-slate-400 text-sm mb-6">
              When all matches are finished, you can mark the tournament as complete.
            </p>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              animate={{ boxShadow: ['0px 0px 0px rgba(16,185,129,0)', '0px 0px 15px rgba(16,185,129,0.5)', '0px 0px 0px rgba(16,185,129,0)'] }}
              transition={{ boxShadow: { duration: 2, repeat: Infinity } }}
              onClick={handleEndTournament}
              className="btn btn-outline border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white w-full py-3 overflow-hidden relative"
            >
              <span className="relative z-10 font-bold tracking-wide uppercase">Complete Tournament</span>
            </motion.button>
          </div>

          <div className="pt-8 border-t border-red-500/20">
            <h2 className="text-xl font-bold text-red-400 mb-2">Danger Zone</h2>
            <p className="text-slate-400 text-sm mb-6">
              Destructive actions that will modify or clear the current tournament draws.
            </p>
            <div className="flex flex-col gap-4">
              {!hasStarted && (
                <button 
                  onClick={handleShuffleDraws}
                  className="btn btn-outline border-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-white w-full py-3"
                >
                  Shuffle Draws
                </button>
              )}
              <button 
                onClick={handleResetDraws}
                className="btn btn-outline border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white w-full py-3"
              >
                Reset Draws (Back to Lobby)
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] sm:h-full pb-20 sm:pb-0 overflow-hidden sm:overflow-visible">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0 pt-4 sm:pt-0">
        <div>
          <button onClick={() => navigate(`/${sport}`)} className="btn btn-ghost mb-2 text-sm">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Hub
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{tournament.name}</h1>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                alert('Tournament link copied to clipboard!');
              }}
              className="btn btn-ghost btn-sm p-2 text-slate-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors"
              title="Share Tournament"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          {isManager && tournament.status === 'ACTIVE' && (
            <button onClick={() => setIsManaging(true)} className="btn btn-outline btn-sm text-slate-400 hover:text-white">
              <Settings className="w-4 h-4 mr-1" /> Manage
            </button>
          )}
        </div>
      </div>

      {/* Bottom Navigation Bar (Mobile) / Top Bar (Desktop) */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-950/95 backdrop-blur-md border-t border-white/10 p-2 pb-safe sm:relative sm:bg-transparent sm:border-0 sm:p-0 sm:mb-6 z-50">
        <div className="flex bg-slate-900/80 rounded-lg p-1 border border-white/10 w-full max-w-md mx-auto sm:max-w-none sm:w-auto sm:inline-flex">
          <button
            onClick={() => setActiveTab('fixtures')}
            className={clsx("flex-1 px-4 py-3 sm:py-1.5 text-sm font-bold rounded-md flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 transition-all", activeTab === 'fixtures' ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:text-white')}
          >
            <List className="w-5 h-5 sm:w-4 sm:h-4" /> <span>Fixtures</span>
          </button>
          <button
            onClick={() => setActiveTab('standings')}
            className={clsx("flex-1 px-4 py-3 sm:py-1.5 text-sm font-bold rounded-md flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 transition-all", activeTab === 'standings' ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:text-white')}
          >
            <Trophy className="w-5 h-5 sm:w-4 sm:h-4" /> <span>Standings</span>
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden hide-scrollbar pb-6">
        <div className="flex flex-col gap-6">
          {/* Phase Tabs */}
          {tournament.phases.length > 1 && (
            <div className="flex gap-2 border-b border-white/10 pb-4 mb-2">
              {tournament.phases.map(phase => (
                <button
                  key={phase.id}
                  onClick={() => setActivePhaseIdState(phase.id)}
                  className={clsx(
                    "px-4 py-2 rounded-lg font-bold text-sm uppercase tracking-wider transition-colors",
                    activePhaseId === phase.id
                      ? "bg-primary text-white"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  {phase.name}
                </button>
              ))}
            </div>
          )}

          {activeTab === 'standings' ? (
            activePhase?.type === 'ROUND_ROBIN' ? (
              <StandingsTable phaseId={activePhase.id} />
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }} 
                className="card w-full p-16 flex flex-col items-center justify-center text-center border-dashed border-2 border-white/10 bg-slate-900/20 backdrop-blur-md mt-4"
              >
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-6">
                  <Trophy className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">No Standings</h3>
                <p className="text-slate-400 max-w-md">Standings are only available for Round Robin phases.</p>
              </motion.div>
            )
          ) : (
            /* Active Phase */
            activePhase ? (() => {
              const phaseMatches = matches.filter(m => m.phaseId === activePhase.id);
              if (phaseMatches.length === 0) return (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  className="card w-full p-16 flex flex-col items-center justify-center text-center border-dashed border-2 border-white/10 bg-slate-900/20 backdrop-blur-md mt-4"
                >
                  <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-6">
                    <List className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">No Matches Scheduled</h3>
                  <p className="text-slate-400 max-w-md">Matches will appear here once the tournament draws are generated by the manager.</p>
                </motion.div>
              );

              const rounds = Array.from(new Set(phaseMatches.map(m => m.round))).sort((a, b) => a - b);

              return (
                <div className="flex flex-col gap-8">
                  <h3 className="text-xl font-bold text-white border-b border-white/10 pb-2 flex items-baseline">
                    {activePhase.name} <span className="text-sm font-normal text-slate-400 ml-2">({activePhase.type === 'ROUND_ROBIN' ? 'Round Robin' : activePhase.type === 'PAGE_PLAYOFFS' ? 'Page Playoffs' : 'Knockout'})</span>
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-4">
                    {rounds.map(roundNum => {
                      const roundMatches = phaseMatches.filter(m => m.round === roundNum);
                      return (
                        <div key={roundNum} className="flex flex-col">
                          <div className="bg-slate-800/80 py-2 px-3 rounded-md mb-4 border border-white/5 self-start">
                            <h4 className="font-bold text-slate-300 uppercase tracking-widest text-xs">
                              Round {roundNum}
                            </h4>
                          </div>
                          <div className="flex flex-col gap-3">
                            {roundMatches.map(m => (
                              <MatchCard key={m.id} match={m} onClick={() => navigate(`match/${m.id}`)} />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })() : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }} 
                className="card w-full p-16 flex flex-col items-center justify-center text-center border-dashed border-2 border-white/10 bg-slate-900/20 backdrop-blur-md mt-4"
              >
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-6">
                  <Settings className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">No Phases Configured</h3>
                <p className="text-slate-400 max-w-md">The manager needs to configure tournament phases first.</p>
              </motion.div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
