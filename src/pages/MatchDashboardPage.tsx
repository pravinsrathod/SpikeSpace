import { useState, useEffect, useRef } from 'react';
import { useTournament, useMatches, useTeams } from '../context/TournamentContext';
import { updateMatch, type Match } from '../firebase/db';
import { ArrowLeft, Timer, Minus, Flag, Settings2, Play, History, Trophy, Volume2, VolumeX, ArrowLeftRight } from 'lucide-react';
import { clsx } from 'clsx';
import { checkDynamicProgression } from '../utils/progression';
import { useNavigate } from 'react-router-dom';
import { CourtVisualizer } from '../components/CourtVisualizer';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

// Helper to read set scores dynamically
function getSetScore(match: Match, setNum: number): { a: number; b: number } {
  switch (setNum) {
    case 1: return { a: match.set1ScoreA, b: match.set1ScoreB };
    case 2: return { a: match.set2ScoreA, b: match.set2ScoreB };
    case 3: return { a: match.set3ScoreA, b: match.set3ScoreB };
    case 4: return { a: match.set4ScoreA, b: match.set4ScoreB };
    case 5: return { a: match.set5ScoreA, b: match.set5ScoreB };
    default: return { a: 0, b: 0 };
  }
}

// Helper to build score update keys for a given set
function setScoreUpdates(setNum: number, a: number, b: number): Partial<Match> {
  switch (setNum) {
    case 1: return { set1ScoreA: a, set1ScoreB: b };
    case 2: return { set2ScoreA: a, set2ScoreB: b };
    case 3: return { set3ScoreA: a, set3ScoreB: b };
    case 4: return { set4ScoreA: a, set4ScoreB: b };
    case 5: return { set5ScoreA: a, set5ScoreB: b };
    default: return {};
  }
}

// ─── Referee Rules Config Panel ──────────────────────────
function RulesConfigPanel({ match, onStart, sport = 'volleyball' }: { match: Match; onStart: () => void; sport?: 'volleyball' | 'badminton' }) {
  const [totalSets, setTotalSets] = useState(match.totalSets || 1);
  const [pointsPerSet, setPointsPerSet] = useState(match.pointsPerSet || 21);
  const [pointsLastSet, setPointsLastSet] = useState(match.pointsLastSet || 21);
  const [saving, setSaving] = useState(false);

  const handleStart = async () => {
    setSaving(true);
    await updateMatch(match.tournamentId, match.id, {
      totalSets,
      pointsPerSet,
      pointsLastSet,
      status: 'LIVE',
      currentServe: 'A',
    }, sport);
    onStart();
    setSaving(false);
  };

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="card max-w-lg w-full p-8">
        <div className="flex items-center gap-3 mb-6">
          <Settings2 className="w-8 h-8 text-primary" />
          <div>
            <h2 className="text-2xl font-bold text-white">Match Rules</h2>
            <p className="text-sm text-slate-400">
              {match.teamAName} vs {match.teamBName}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Total Sets */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Total Sets (Best of)
            </label>
            <div className="flex gap-2">
              {[1, 3, 5].map(n => (
                <button
                  key={n}
                  onClick={() => {
                    setTotalSets(n);
                    // Auto-adjust last set points for best-of-1
                    if (n === 1) setPointsLastSet(pointsPerSet);
                  }}
                  className={clsx(
                    "flex-1 py-3 rounded-lg text-sm font-bold transition-all border",
                    totalSets === n
                      ? "bg-primary text-white border-primary shadow-lg shadow-primary/25"
                      : "bg-slate-900/50 text-slate-400 border-white/10 hover:border-primary/50 hover:text-white"
                  )}
                >
                  {n === 1 ? '1 Set' : `Best of ${n}`}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              First to {Math.ceil(totalSets / 2)} set{Math.ceil(totalSets / 2) > 1 ? 's' : ''} wins
            </p>
          </div>

          {/* Points per Set */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Points per Set
            </label>
            <div className="flex gap-2">
              {[15, 21, 25].map(n => (
                <button
                  key={n}
                  onClick={() => setPointsPerSet(n)}
                  className={clsx(
                    "flex-1 py-3 rounded-lg text-sm font-bold transition-all border",
                    pointsPerSet === n
                      ? "bg-secondary text-white border-secondary shadow-lg shadow-secondary/25"
                      : "bg-slate-900/50 text-slate-400 border-white/10 hover:border-secondary/50 hover:text-white"
                  )}
                >
                  {n} pts
                </button>
              ))}
            </div>
          </div>

          {/* Points for Deciding Set */}
          {totalSets > 1 && (
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Points for Deciding Set (Set {totalSets})
              </label>
              <div className="flex gap-2">
                {[11, 15, 21, 25].map(n => (
                  <button
                    key={n}
                    onClick={() => setPointsLastSet(n)}
                    className={clsx(
                      "flex-1 py-3 rounded-lg text-sm font-bold transition-all border",
                      pointsLastSet === n
                        ? "bg-accent text-white border-accent shadow-lg shadow-accent/25"
                        : "bg-slate-900/50 text-slate-400 border-white/10 hover:border-accent/50 hover:text-white"
                    )}
                  >
                    {n} pts
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="mt-6 p-4 bg-white/5 rounded-lg border border-white/10 text-sm text-slate-300">
          <strong className="text-white">Summary:</strong> Best of {totalSets} sets.{' '}
          {totalSets > 1 ? (
            <>Sets 1–{totalSets - 1} to <strong className="text-secondary">{pointsPerSet}</strong> pts, deciding set to <strong className="text-accent">{pointsLastSet}</strong> pts.</>
          ) : (
            <>Single set to <strong className="text-secondary">{pointsPerSet}</strong> pts.</>
          )}{' '}
          Must win by 2.
        </div>

        <button
          onClick={handleStart}
          disabled={saving}
          className="btn btn-primary w-full mt-6 py-4 text-lg font-bold"
        >
          <Play className="w-5 h-5 mr-2" />
          {saving ? 'Starting...' : 'Start Match'}
        </button>
      </div>
    </div>
  );
}


export default function MatchDashboardPage({ matchId, sport = 'volleyball' }: { matchId: string; sport?: 'volleyball' | 'badminton' }) {
  const navigate = useNavigate();
  const { tournament } = useTournament();
  const matches = useMatches();
  const teams = useTeams();
  const { user } = useAuth();

  const onBack = () => navigate('..');

  const [justCompleted, setJustCompleted] = useState(false);
  const [rulesConfirmed, setRulesConfirmed] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [announceScore, setAnnounceScore] = useState(false);
  const [swappedSides, setSwappedSides] = useState(false);

  const match = matches.find(m => m.id === matchId);

  useEffect(() => {
    if (match && tournament) {
      document.title = `${match.teamAName} vs ${match.teamBName} - ${tournament.name} | ProManager`;
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute('content', `Live match updates: ${match.teamAName} vs ${match.teamBName} in ${tournament.name}.`);
    }
  }, [match?.teamAName, match?.teamBName, tournament?.name]);

  const isCompletingRef = useRef(false);

  // Auto-complete match when a team reaches the required sets won
  useEffect(() => {
    if (!match || !tournament || match.status === 'COMPLETED') return;
    if (isCompletingRef.current) return;

    const setsToWin = Math.ceil((match.totalSets || 1) / 2);
    if (match.setsWonA >= setsToWin || match.setsWonB >= setsToWin) {
      isCompletingRef.current = true;
      const winnerId = match.setsWonA >= setsToWin ? match.teamAId : match.teamBId;
      
      const doAutoComplete = async () => {
        const updates: Partial<Match> = {
          status: 'COMPLETED',
          winnerId,
          currentServe: null
        };
        
        await updateMatch(tournament.id, match.id, updates, sport);

        // Create an optimistic matches array for progression check
        const updatedMatches = matches.map(m => 
          m.id === match.id ? { ...m, ...updates } as Match : m
        );
        await checkDynamicProgression(tournament, updatedMatches, teams, sport);

        // 1. Resolve explicit TBD placeholders (e.g. for Page Playoffs)
        const loserId = winnerId === match.teamAId ? match.teamBId : match.teamAId;
        const winnerName = winnerId === match.teamAId ? match.teamAName : match.teamBName;
        const loserName = winnerId === match.teamAId ? match.teamBName : match.teamAName;

        let handledByPlaceholder = false;
        for (const m of matches) {
          if (m.id === match.id) continue;
          const nextUpdates: Partial<Match> = {};
          if (m.teamAId === `TBD_W_${match.id}`) { nextUpdates.teamAId = winnerId; nextUpdates.teamAName = winnerName; handledByPlaceholder = true; }
          if (m.teamBId === `TBD_W_${match.id}`) { nextUpdates.teamBId = winnerId; nextUpdates.teamBName = winnerName; handledByPlaceholder = true; }
          if (m.teamAId === `TBD_L_${match.id}`) { nextUpdates.teamAId = loserId; nextUpdates.teamAName = loserName; handledByPlaceholder = true; }
          if (m.teamBId === `TBD_L_${match.id}`) { nextUpdates.teamBId = loserId; nextUpdates.teamBName = loserName; handledByPlaceholder = true; }
          
          if (Object.keys(nextUpdates).length > 0) {
            await updateMatch(tournament.id, m.id, nextUpdates, sport);
          }
        }

        // 2. Standard KNOCKOUT bracket propagation
        if (match.nextMatchId && !handledByPlaceholder) {
          const nextMatch = matches.find(m => m.id === match.nextMatchId);
          if (nextMatch) {
            const isTeamA = match.position % 2 === 0;
            const nextUpdates: Partial<Match> = {};
            if (isTeamA) {
              nextUpdates.teamAId = winnerId;
              nextUpdates.teamAName = winnerName;
            } else {
              nextUpdates.teamBId = winnerId;
              nextUpdates.teamBName = winnerName;
            }
            await updateMatch(tournament.id, nextMatch.id, nextUpdates, sport);
          }
        }
        setJustCompleted(true);
      };
      doAutoComplete();
    }
  }, [match?.setsWonA, match?.setsWonB, match?.status]);

  if (!match || !tournament) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="card p-8 text-center">
          <h2 className="text-xl font-bold text-white mb-2">Match not found</h2>
          <button onClick={onBack} className="btn btn-primary mt-4">Back to Board</button>
        </div>
      </div>
    );
  }

  if (match.status === 'PENDING' && !rulesConfirmed) {
    const isManager = user?.uid === tournament.managerId && !!user?.uid;
    const isTeamPending = match.teamAId?.startsWith('TBD_') || match.teamBId?.startsWith('TBD_');

    return (
      <div className="flex flex-col h-[100dvh] bg-slate-950 overflow-hidden">
        <div className="p-4 border-b border-white/10 shrink-0">
          <button onClick={onBack} className="btn btn-ghost">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Board
          </button>
        </div>
        <div className="flex-1 overflow-auto">
          {isTeamPending ? (
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="card p-12 text-center text-slate-400 w-full max-w-sm">
                <h2 className="text-xl font-bold text-white mb-2">Teams Undecided</h2>
                <p>Waiting for preceding matches to complete.</p>
              </div>
            </div>
          ) : isManager ? (
            <RulesConfigPanel match={match} onStart={() => setRulesConfirmed(true)} sport={sport} />
          ) : (
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="card p-12 text-center text-slate-400 w-full max-w-sm">
                <h2 className="text-xl font-bold text-white mb-2">Match Not Started</h2>
                <p>Waiting for manager.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const teamA = teams.find(t => t.id === match.teamAId);
  const teamB = teams.find(t => t.id === match.teamBId);
  const tAColor = teamA?.colorHex || '#64748b';
  const tBColor = teamB?.colorHex || '#64748b';

  const totalSets = match.totalSets || 1;
  const setsToWin = Math.ceil(totalSets / 2);
  const activeSet = match.setsWonA + match.setsWonB + 1;
  const isCompleted = match.status === 'COMPLETED';

  // Determine which points target to use for the active set
  const isDecidingSet = totalSets > 1 && activeSet === totalSets;
  const targetScore = isDecidingSet ? (match.pointsLastSet || 15) : (match.pointsPerSet || 25);
  
  const isManager = user?.uid === tournament.managerId && !!user?.uid;

  const { a: scoreA, b: scoreB } = getSetScore(match, activeSet);

  const handleScore = async (team: 'A' | 'B', delta: number) => {
    if (isCompleted || activeSet > totalSets) return;

    let newA = scoreA;
    let newB = scoreB;

    if (team === 'A') newA = Math.max(0, newA + delta);
    if (team === 'B') newB = Math.max(0, newB + delta);

    const updates: Partial<Match> = {
      ...setScoreUpdates(activeSet, newA, newB)
    };

    if (delta > 0) {
      updates.currentServe = team;
    }

    // Check set completion
    let setWinner: 'A' | 'B' | null = null;
    if (newA >= targetScore && newA - newB >= 2) setWinner = 'A';
    if (newB >= targetScore && newB - newA >= 2) setWinner = 'B';

    if (setWinner) {
      if (setWinner === 'A') updates.setsWonA = match.setsWonA + 1;
      if (setWinner === 'B') updates.setsWonB = match.setsWonB + 1;
      updates.timeoutsRemainingA = 2;
      updates.timeoutsRemainingB = 2;
      updates.currentServe = setWinner === 'A' ? 'B' : 'A';
    }

    if (announceScore && delta > 0) {
      let announcement = "";
      const maxScore = Math.max(newA, newB);
      const minScore = Math.min(newA, newB);
      const isALeading = newA > newB;
      const leaderName = isALeading ? match.teamAName : match.teamBName;
      const baseScore = team === 'A' ? `${match.teamAName} ${newA}, ${match.teamBName} ${newB}` : `${match.teamBName} ${newB}, ${match.teamAName} ${newA}`;
      const isMatchPoint = isALeading ? match.setsWonA === setsToWin - 1 : match.setsWonB === setsToWin - 1;

      if (maxScore >= targetScore && maxScore - minScore >= 2) {
        announcement = isMatchPoint ? `Game, Set, Match, ${leaderName}` : `Set won by ${leaderName}`;
      } else if (newA === newB && newA >= targetScore - 1) {
        announcement = "Deuce";
      } else if (maxScore >= targetScore && maxScore - minScore === 1) {
        announcement = `Advantage ${leaderName}`;
      } else if (maxScore >= targetScore - 1) {
        announcement = `${baseScore}. ${isMatchPoint ? 'Match' : 'Set'} Point.`;
      } else {
        announcement = baseScore;
      }

      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(announcement);
        window.speechSynthesis.speak(utterance);
      }
    }

    await updateMatch(tournament.id, match.id, updates, sport);
  };

  const handleCompleteMatch = async () => {
    if (!confirm('Are you sure you want to finalize this match?')) return;
    const winnerId = match.setsWonA > match.setsWonB ? match.teamAId : match.teamBId;

    const updates: Partial<Match> = {
      status: 'COMPLETED',
      winnerId,
      currentServe: null
    };

    await updateMatch(tournament.id, match.id, updates, sport);

    // Create an optimistic matches array for progression check
    const updatedMatches = matches.map(m => 
      m.id === match.id ? { ...m, ...updates } as Match : m
    );
    await checkDynamicProgression(tournament, updatedMatches, teams, sport);

    // 1. Resolve explicit TBD placeholders (e.g. for Page Playoffs)
    const loserId = winnerId === match.teamAId ? match.teamBId : match.teamAId;
    const winnerName = winnerId === match.teamAId ? match.teamAName : match.teamBName;
    const loserName = winnerId === match.teamAId ? match.teamBName : match.teamAName;

    let handledByPlaceholder = false;
    for (const m of matches) {
      if (m.id === match.id) continue;
      const nextUpdates: Partial<Match> = {};
      if (m.teamAId === `TBD_W_${match.id}`) { nextUpdates.teamAId = winnerId; nextUpdates.teamAName = winnerName; handledByPlaceholder = true; }
      if (m.teamBId === `TBD_W_${match.id}`) { nextUpdates.teamBId = winnerId; nextUpdates.teamBName = winnerName; handledByPlaceholder = true; }
      if (m.teamAId === `TBD_L_${match.id}`) { nextUpdates.teamAId = loserId; nextUpdates.teamAName = loserName; handledByPlaceholder = true; }
      if (m.teamBId === `TBD_L_${match.id}`) { nextUpdates.teamBId = loserId; nextUpdates.teamBName = loserName; handledByPlaceholder = true; }
      
      if (Object.keys(nextUpdates).length > 0) {
        await updateMatch(tournament.id, m.id, nextUpdates, sport);
      }
    }

    // 2. Standard KNOCKOUT bracket propagation
    if (match.nextMatchId && !handledByPlaceholder) {
      const nextMatch = matches.find(m => m.id === match.nextMatchId);
      if (nextMatch) {
        const isTeamA = match.position % 2 === 0;
        const nextUpdates: Partial<Match> = {};
        if (isTeamA) {
          nextUpdates.teamAId = winnerId;
          nextUpdates.teamAName = winnerName;
        } else {
          nextUpdates.teamBId = winnerId;
          nextUpdates.teamBName = winnerName;
        }
        await updateMatch(tournament.id, nextMatch.id, nextUpdates, sport);
      }
    }
    setJustCompleted(true);
  };

  const handleTimeout = async (team: 'A' | 'B') => {
    if (team === 'A' && match.timeoutsRemainingA > 0) {
      await updateMatch(tournament.id, match.id, { timeoutsRemainingA: match.timeoutsRemainingA - 1 }, sport);
    }
    if (team === 'B' && match.timeoutsRemainingB > 0) {
      await updateMatch(tournament.id, match.id, { timeoutsRemainingB: match.timeoutsRemainingB - 1 }, sport);
    }
  };

  const scoringDisabled = !isManager || isCompleted || activeSet > totalSets || match.setsWonA >= setsToWin || match.setsWonB >= setsToWin;

  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col z-[100] text-slate-200 safe-area-pt">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-slate-900/80 border-b border-white/5 shrink-0 backdrop-blur">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="text-center flex-1">
          <div className="text-base font-bold text-white">{match.name || `Round ${match.round}`}</div>
          <div className="text-xs text-slate-400">
            BO{totalSets} · {match.pointsPerSet}pts
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setSwappedSides(!swappedSides)}
            className="p-2 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors text-slate-300"
          >
            <ArrowLeftRight className="w-6 h-6" />
          </button>
          <button 
            onClick={() => setAnnounceScore(!announceScore)}
            className="p-2 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors"
          >
            {announceScore ? <Volume2 className="w-6 h-6 text-primary" /> : <VolumeX className="w-6 h-6 text-slate-300" />}
          </button>
          <button 
            onClick={() => setShowHistory(true)}
            className="p-2 -mr-2 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors text-primary"
          >
            <History className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main Split Scoreboard */}
      <div className={clsx("flex-1 overflow-auto flex gap-4 p-4", swappedSides ? "flex-col-reverse sm:flex-row-reverse" : "flex-col sm:flex-row")}>
        <h1 className="sr-only">Match: {match.teamAName} vs {match.teamBName}</h1>
        {/* Team A */}
        <div className="flex-1 card flex flex-col relative overflow-hidden" style={{ borderTop: `4px solid ${tAColor}` }}>
          {match.currentServe === 'A' && <div className="absolute inset-0 ring-2 ring-emerald-500 rounded-lg pointer-events-none" />}
          
          <div className="p-4 shrink-0 flex justify-between items-center bg-slate-900/30">
            <h2 className="text-lg sm:text-2xl font-bold truncate pr-2">{match.teamAName}</h2>
            <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1 rounded-md">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Sets</span>
              <span className="text-sm font-black text-white">{match.setsWonA}</span>
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
            {match.status === 'COMPLETED' && match.winnerId === match.teamAId && (
              <div className="text-6xl mb-4 animate-bounce z-10">🏆</div>
            )}
            <div aria-live="polite" aria-atomic="true" className="text-[80px] sm:text-[180px] font-black leading-none tracking-tighter tabular-nums mb-4 drop-shadow-xl z-10 select-none">
              {activeSet <= totalSets ? scoreA : '-'}
            </div>
            
            {/* Gesture Overlay for Score */}
            {!scoringDisabled && (
              <div className="absolute inset-0 flex flex-col z-20">
                <button 
                  onClick={() => handleScore('A', -1)} 
                  className="h-16 w-full flex-none active:bg-red-500/10 transition-colors rounded-t-lg flex items-center justify-center bg-red-500/5 hover:bg-red-500/10 border-b border-red-500/10"
                >
                  <Minus className="w-8 h-8 text-red-500/50" />
                </button>
                <button 
                  onClick={() => handleScore('A', 1)} 
                  className="flex-1 w-full active:bg-white/5 transition-colors rounded-b-lg flex items-center justify-center opacity-0 hover:opacity-100"
                >
                  {/* Plus area covers the rest */}
                </button>
              </div>
            )}
          </div>

          <div className="p-3 shrink-0 flex justify-between items-center bg-slate-900/30">
            <button
              disabled={scoringDisabled || match.timeoutsRemainingA === 0}
              onClick={() => handleTimeout('A')}
              className={clsx(
                "px-3 py-1.5 rounded text-xs font-bold transition-colors",
                match.timeoutsRemainingA > 0 && !scoringDisabled 
                  ? "bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 active:bg-amber-500/40" 
                  : "bg-slate-800 text-slate-500 opacity-50"
              )}
            >
              <Timer className="w-3.5 h-3.5 inline mr-1" />
              T/O ({match.timeoutsRemainingA})
            </button>
            {match.currentServe === 'A' && (
              <span className="text-emerald-500 font-bold text-xs animate-pulse flex items-center">
                <Flag className="w-3.5 h-3.5 mr-1"/> Serve
              </span>
            )}
          </div>
        </div>

        {/* Team B */}
        <div className="flex-1 card flex flex-col relative overflow-hidden" style={{ borderTop: `4px solid ${tBColor}` }}>
          {match.currentServe === 'B' && <div className="absolute inset-0 ring-2 ring-emerald-500 rounded-lg pointer-events-none" />}
          
          <div className="p-4 shrink-0 flex justify-between items-center bg-slate-900/30">
            <h2 className="text-lg sm:text-2xl font-bold truncate pr-2">{match.teamBName}</h2>
            <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1 rounded-md">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Sets</span>
              <span className="text-sm font-black text-white">{match.setsWonB}</span>
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
            {match.status === 'COMPLETED' && match.winnerId === match.teamBId && (
              <div className="text-6xl mb-4 animate-bounce z-10">🏆</div>
            )}
            <div aria-live="polite" aria-atomic="true" className="text-[80px] sm:text-[180px] font-black leading-none tracking-tighter tabular-nums mb-4 drop-shadow-xl z-10 select-none">
              {activeSet <= totalSets ? scoreB : '-'}
            </div>
            {/* Gesture Overlay for Score */}
            {!scoringDisabled && (
              <div className="absolute inset-0 flex flex-col z-20">
                <button 
                  onClick={() => handleScore('B', -1)} 
                  className="h-16 w-full flex-none active:bg-red-500/10 transition-colors rounded-t-lg flex items-center justify-center bg-red-500/5 hover:bg-red-500/10 border-b border-red-500/10"
                >
                  <Minus className="w-8 h-8 text-red-500/50" />
                </button>
                <button 
                  onClick={() => handleScore('B', 1)} 
                  className="flex-1 w-full active:bg-white/5 transition-colors rounded-b-lg flex items-center justify-center opacity-0 hover:opacity-100"
                >
                  {/* Plus area covers the rest */}
                </button>
              </div>
            )}
          </div>

          <div className="p-3 shrink-0 flex justify-between items-center bg-slate-900/30">
            <button
              disabled={scoringDisabled || match.timeoutsRemainingB === 0}
              onClick={() => handleTimeout('B')}
              className={clsx(
                "px-3 py-1.5 rounded text-xs font-bold transition-colors",
                match.timeoutsRemainingB > 0 && !scoringDisabled 
                  ? "bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 active:bg-amber-500/40" 
                  : "bg-slate-800 text-slate-500 opacity-50"
              )}
            >
              <Timer className="w-3.5 h-3.5 inline mr-1" />
              T/O ({match.timeoutsRemainingB})
            </button>
            {match.currentServe === 'B' && (
              <span className="text-emerald-500 font-bold text-xs animate-pulse flex items-center">
                <Flag className="w-3.5 h-3.5 mr-1"/> Serve
              </span>
            )}
          </div>
        </div>

      </div>

      <div className="px-4 pb-8">
        <CourtVisualizer 
          teamAColor={swappedSides ? tBColor : tAColor} 
          teamBColor={swappedSides ? tAColor : tBColor} 
          serve={match.currentServe ? (swappedSides ? (match.currentServe === 'A' ? 'B' : 'A') : match.currentServe) : null} 
        />
      </div>

      {/* History Bottom Sheet */}
      <AnimatePresence>
        {showHistory && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistory(false)}
              className="absolute inset-0 bg-black/60 z-[110] backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute bottom-0 left-0 right-0 bg-slate-900 rounded-t-3xl p-6 z-[120] border-t border-white/10 shadow-2xl"
            >
              <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-6 opacity-50" />
              <h3 className="font-bold text-xl text-white mb-6 flex items-center">
                <History className="w-5 h-5 mr-2 text-primary" /> Set History
              </h3>
              
              <div className="space-y-3 mb-8">
                {Array.from({ length: totalSets }).map((_, i) => {
                  const setNum = i + 1;
                  const { a, b } = getSetScore(match, setNum);
                  return (
                    <div
                      key={setNum}
                      className={clsx(
                        "flex justify-between items-center p-4 rounded-xl",
                        activeSet === setNum ? "bg-primary/20 ring-1 ring-primary border border-primary/50" : "bg-slate-800/50"
                      )}
                    >
                      <span className="text-slate-300 font-medium">
                        Set {setNum}
                        {setNum === totalSets && totalSets > 1 && (
                          <span className="text-xs text-accent ml-2 px-2 py-0.5 rounded-full bg-accent/20">deciding</span>
                        )}
                      </span>
                      <span className="font-black text-lg text-white tabular-nums tracking-widest">{a} - {b}</span>
                    </div>
                  );
                })}
              </div>

              {!isCompleted && (match.setsWonA >= setsToWin || match.setsWonB >= setsToWin) && isManager && (
                <button onClick={handleCompleteMatch} className="btn btn-primary w-full py-4 text-lg font-bold">
                  <Trophy className="w-5 h-5 mr-2" /> Complete Match
                </button>
              )}

              {(justCompleted || isCompleted) && match.winnerId && (
                <div className="p-4 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl text-center font-bold text-lg">
                  🏆 Winner: {match.winnerId === match.teamAId ? match.teamAName : match.teamBName}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
