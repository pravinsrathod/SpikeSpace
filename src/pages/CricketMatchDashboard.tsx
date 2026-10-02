import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTournament, useMatches, useTeams } from '../context/TournamentContext';
import { updateMatch, type CricketBallEvent } from '../firebase/db';
import { useAuth } from '../context/AuthContext';
import { Trophy, ArrowLeft, Coins, RotateCcw } from 'lucide-react';
import { CricketScorecard } from '../components/CricketScorecard';
import { checkDynamicProgression } from '../utils/progression';


export default function CricketMatchDashboard({ matchId }: { matchId: string }) {
  const { tournament } = useTournament();
  const matches = useMatches();
  const teams = useTeams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [playerModalVisible, setPlayerModalVisible] = useState(false);
  const [playerModalMode, setPlayerModalMode] = useState<'ALL' | 'BOWLER_ONLY' | 'BATSMAN_ONLY'>('ALL');
  
  const [tempStriker, setTempStriker] = useState('');
  const [tempNonStriker, setTempNonStriker] = useState('');
  const [tempBowler, setTempBowler] = useState('');
  
  // Settings
  const [tempMaxOversPerBowler, setTempMaxOversPerBowler] = useState(tournament?.oversPerInnings ? Math.ceil(tournament.oversPerInnings / 5) : 2);
  const [tempMaxWickets, setTempMaxWickets] = useState(10);

  const [isUpdating, setIsUpdating] = useState(false); // only for toss/player selection
  const [isSaving, setIsSaving] = useState(false); // subtle non-blocking indicator
  const scoringLock = useRef(false); // prevents double-tap without blocking UI
  const [pendingWicket, setPendingWicket] = useState<{ runsOffBat: number, extras: number, extraType?: 'WD'|'NB'|'B'|'LB' } | null>(null);
  const [extraModal, setExtraModal] = useState<{ type: 'WD' | 'NB' | 'B' | 'LB' } | null>(null);

  const match = matches.find(m => m.id === matchId);
  
  const onBack = () => navigate("..");

  if (!match || !tournament) return null;

  const isManager = user?.uid === tournament.managerId;

  // Fallback defaults
  const runsA = match.runsA || 0;
  const wicketsA = match.wicketsA || 0;
  const oversA = match.oversA || 0;
  
  const runsB = match.runsB || 0;
  const wicketsB = match.wicketsB || 0;
  const oversB = match.oversB || 0;

  const currentInnings = match.currentInnings || 1;
  const battingTeamId = match.battingTeamId;
  const bowlingTeamId = battingTeamId === match.teamAId ? match.teamBId : match.teamAId;
  
  const isTeamABatting = battingTeamId === match.teamAId;

  const handleTossSubmit = async (winnerId: string, decision: 'BAT' | 'BOWL') => {
    setIsUpdating(true);
    let battingId = decision === 'BAT' ? winnerId : (winnerId === match.teamAId ? match.teamBId : match.teamAId);
    
    try {
      await updateMatch(tournament.id, match.id, {
        tossWinnerId: winnerId,
        tossDecision: decision,
        battingTeamId: battingId,
        currentInnings: 1,
        status: 'LIVE',
        maxOversPerBowler: tempMaxOversPerBowler,
        maxWickets: tempMaxWickets
      }, 'cricket');
    } catch (e) {
      window.alert('Failed to save toss');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSetPlayers = async () => {
    if (playerModalMode !== 'BOWLER_ONLY') {
      if (tempStriker && tempNonStriker && tempStriker === tempNonStriker) {
        window.alert("Striker and Non-Striker cannot be the same player.");
        return;
      }
    }

    if (playerModalMode !== 'BATSMAN_ONLY') {
      if (tempBowler && tempBowler === match.lastBowler) {
        window.alert(`${tempBowler} bowled the previous over and cannot bowl consecutive overs.`);
        return;
      }
    }

    setIsUpdating(true);
    try {
      const payload: any = {};
      if (playerModalMode !== 'BOWLER_ONLY') {
        payload.strikerName = tempStriker;
        payload.nonStrikerName = tempNonStriker;
      }
      if (playerModalMode !== 'BATSMAN_ONLY') {
        payload.bowlerName = tempBowler;
      }
      await updateMatch(tournament.id, match.id, payload, 'cricket');
      setPlayerModalVisible(false);
    } catch (e) {
      window.alert('Failed to save players');
    } finally {
      setIsUpdating(false);
    }
  };

  const parseOvers = (overs: number) => {
    const w = Math.floor(overs);
    const b = Math.round((overs - w) * 10);
    return { w, b };
  };

  const addOvers = (overs: number, ballsToAdd: number) => {
    let { w, b } = parseOvers(overs);
    b += ballsToAdd;
    while (b >= 6) {
      w += 1;
      b -= 6;
    }
    return w + (b / 10);
  };

  const subtractOvers = (overs: number, ballsToSubtract: number) => {
    let { w, b } = parseOvers(overs);
    b -= ballsToSubtract;
    while (b < 0) {
      w -= 1;
      b += 6;
    }
    return Math.max(0, w + (b / 10));
  };

  const scoreBall = (runsOffBat: number, extras: number, extraType?: 'WD'|'NB'|'B'|'LB', isWicket: boolean = false, dismissedPlayerName?: string) => {
    if (!match.strikerName || !match.bowlerName) {
      window.alert('Please set Striker and Bowler first');
      setPlayerModalMode('ALL');
      setPlayerModalVisible(true);
      return;
    }

    if (isWicket && !dismissedPlayerName) {
      setPendingWicket({ runsOffBat, extras, extraType });
      return;
    }

    // Prevent double-tap via ref lock (no UI re-render)
    if (scoringLock.current) return;
    scoringLock.current = true;

    const isLegal = extraType !== 'WD' && extraType !== 'NB';
    
    const newRunsA = isTeamABatting ? runsA + runsOffBat + extras : runsA;
    const newWicketsA = isTeamABatting && isWicket ? wicketsA + 1 : wicketsA;
    const newOversA = isTeamABatting && isLegal ? addOvers(oversA, 1) : oversA;
    
    const newRunsB = !isTeamABatting ? runsB + runsOffBat + extras : runsB;
    const newWicketsB = !isTeamABatting && isWicket ? wicketsB + 1 : wicketsB;
    const newOversB = !isTeamABatting && isLegal ? addOvers(oversB, 1) : oversB;

    // Update player stats
    const statsA = { ...match.playerStatsA };
    const statsB = { ...match.playerStatsB };
    
    const batStatsMap = isTeamABatting ? statsA : statsB;
    const bowlStatsMap = isTeamABatting ? statsB : statsA;

    const striker = match.strikerName;
    const bowler = match.bowlerName;

    if (!batStatsMap[striker]) batStatsMap[striker] = { runsScored: 0, ballsFaced: 0, fours: 0, sixes: 0, oversBowled: 0, maidens: 0, runsConceded: 0, wicketsTaken: 0, isOut: false };
    if (!bowlStatsMap[bowler]) bowlStatsMap[bowler] = { runsScored: 0, ballsFaced: 0, fours: 0, sixes: 0, oversBowled: 0, maidens: 0, runsConceded: 0, wicketsTaken: 0, isOut: false };

    if (extraType !== 'WD') {
      batStatsMap[striker].ballsFaced += 1;
      batStatsMap[striker].runsScored += runsOffBat;
      if (runsOffBat === 4) batStatsMap[striker].fours += 1;
      if (runsOffBat === 6) batStatsMap[striker].sixes += 1;
    }
    
    if (isWicket && dismissedPlayerName) {
      if (!batStatsMap[dismissedPlayerName]) {
        batStatsMap[dismissedPlayerName] = { runsScored: 0, ballsFaced: 0, fours: 0, sixes: 0, oversBowled: 0, maidens: 0, runsConceded: 0, wicketsTaken: 0, isOut: false };
      }
      batStatsMap[dismissedPlayerName].isOut = true;
      bowlStatsMap[bowler].wicketsTaken += 1;
    }
    
    if (isLegal) {
      bowlStatsMap[bowler].oversBowled = addOvers(bowlStatsMap[bowler].oversBowled || 0, 1);
    }
    const bowlerRunsToAdd = (extraType === 'B' || extraType === 'LB') ? runsOffBat : (runsOffBat + extras);
    bowlStatsMap[bowler].runsConceded += bowlerRunsToAdd;

    const ballEvent: CricketBallEvent = {
      inning: currentInnings as 1 | 2,
      over: isTeamABatting ? Math.floor(oversA) : Math.floor(oversB),
      ball: isTeamABatting ? parseOvers(oversA).b + 1 : parseOvers(oversB).b + 1,
      bowlerName: bowler,
      batsmanName: striker,
      runs: runsOffBat,
      extras,
      isWicket
    };
    if (extraType) ballEvent.extraType = extraType;
    if (isWicket && dismissedPlayerName) ballEvent.dismissedPlayer = dismissedPlayerName;

    const newHistory = [...(match.ballHistory || []), ballEvent];

    // Switch strike logic
    const runsToConsider = extraType === 'WD' ? Math.max(0, extras - 1) : (extraType === 'B' || extraType === 'LB' ? extras : runsOffBat);
    let newStriker = striker;
    let newNonStriker = match.nonStrikerName || '';
    
    let shouldSwitchStrike = runsToConsider % 2 !== 0;
    
    // End of over logic
    let overEnded = false;
    if (isLegal && ((isTeamABatting ? parseOvers(newOversA).b : parseOvers(newOversB).b) === 0)) {
      shouldSwitchStrike = !shouldSwitchStrike;
      overEnded = true;
    }

    if (shouldSwitchStrike) {
      newStriker = match.nonStrikerName || '';
      newNonStriker = striker;
    }
    
    if (isWicket && dismissedPlayerName) {
      if (dismissedPlayerName === striker) {
        newStriker = '';
      } else if (dismissedPlayerName === match.nonStrikerName) {
        newNonStriker = '';
      }
    }

    const newOutPlayers = isWicket && dismissedPlayerName 
      ? [...(match.outPlayers || []), dismissedPlayerName] 
      : (match.outPlayers || []);

    // Build the single merged payload
    const updatePayload: any = {
      runsA: newRunsA,
      wicketsA: newWicketsA,
      oversA: newOversA,
      runsB: newRunsB,
      wicketsB: newWicketsB,
      oversB: newOversB,
      playerStatsA: statsA,
      playerStatsB: statsB,
      ballHistory: newHistory,
      strikerName: newStriker,
      nonStrikerName: newNonStriker,
      bowlerName: overEnded ? '' : match.bowlerName,
      outPlayers: newOutPlayers
    };
    if (overEnded) {
      updatePayload.lastBowler = match.bowlerName;
    } else if (match.lastBowler) {
      updatePayload.lastBowler = match.lastBowler;
    }

    // Check Innings End (computed from local values, no Firestore dependency)
    const oversLimit = tournament.oversPerInnings || 10;
    const activeOvers = isTeamABatting ? newOversA : newOversB;
    const activeWickets = isTeamABatting ? newWicketsA : newWicketsB;
    const maxWicketsLimit = match.maxWickets || 10;
    
    let inningsComplete = activeOvers >= oversLimit || activeWickets >= maxWicketsLimit;
    
    if (currentInnings === 2 && match.targetScore) {
      const currentRunsTotal = isTeamABatting ? newRunsA : newRunsB;
      if (currentRunsTotal >= match.targetScore) {
        inningsComplete = true;
      }
    }

    // Merge innings-end / match-end fields into the SAME write
    if (inningsComplete) {
      if (currentInnings === 1) {
        // First innings over — merge innings-switch fields
        updatePayload.currentInnings = 2;
        updatePayload.battingTeamId = bowlingTeamId;
        updatePayload.targetScore = (isTeamABatting ? newRunsA : newRunsB) + 1;
        updatePayload.strikerName = '';
        updatePayload.nonStrikerName = '';
        updatePayload.bowlerName = '';
        updatePayload.lastBowler = '';
        updatePayload.outPlayers = [];
      } else {
        // Match over — merge completion fields
        const t1Score = newRunsA;
        const t2Score = newRunsB;
        const winnerId = t1Score > t2Score ? match.teamAId : (t2Score > t1Score ? match.teamBId : null);
        updatePayload.status = 'COMPLETED';
        updatePayload.winnerId = winnerId;
      }
    }

    // Fire-and-forget: write to Firestore without blocking UI
    setIsSaving(true);
    updateMatch(tournament.id, match.id, updatePayload, 'cricket')
      .then(async () => {
        // Handle post-write side effects
        if (inningsComplete && currentInnings === 2) {
          const t1Score = newRunsA;
          const t2Score = newRunsB;
          const winnerId = t1Score > t2Score ? match.teamAId : (t2Score > t1Score ? match.teamBId : null);
          const updatedMatches = matches.map(m =>
            m.id === match.id ? { ...m, status: 'COMPLETED' as const, winnerId } : m
          );
          await checkDynamicProgression(tournament, updatedMatches, teams, 'cricket');
        }
      })
      .catch((e) => {
        console.error(e);
        window.alert('Failed to score ball');
      })
      .finally(() => {
        scoringLock.current = false;
        setIsSaving(false);
      });

    // Show UI feedback synchronously (no await needed)
    if (inningsComplete) {
      if (currentInnings === 1) {
        window.alert('First innings is over. Switching sides.');
      } else {
        window.alert('The match has ended.');
      }
    } else if (overEnded || isWicket) {
      if (overEnded && !isWicket) {
        setPlayerModalMode('BOWLER_ONLY');
      } else if (isWicket && !overEnded) {
        setPlayerModalMode('BATSMAN_ONLY');
      } else {
        setPlayerModalMode('ALL');
      }
      setPlayerModalVisible(true);
    }
  };

  const undoLastBall = () => {
    if (!match.ballHistory || match.ballHistory.length === 0) {
      window.alert('No balls to undo');
      return;
    }
    
    const lastBall = match.ballHistory[match.ballHistory.length - 1];
    if (lastBall.inning !== currentInnings) {
      window.alert('Cannot undo a ball from the previous innings.');
      return;
    }
    
    if (!window.confirm('Are you sure you want to undo the last ball?')) return;

    if (scoringLock.current) return;
    scoringLock.current = true;

    const isLegal = lastBall.extraType !== 'WD' && lastBall.extraType !== 'NB';
    
    const newRunsA = isTeamABatting ? runsA - (lastBall.runs + lastBall.extras) : runsA;
    const newWicketsA = isTeamABatting && lastBall.isWicket ? wicketsA - 1 : wicketsA;
    const newOversA = isTeamABatting && isLegal ? subtractOvers(oversA, 1) : oversA;
    
    const newRunsB = !isTeamABatting ? runsB - (lastBall.runs + lastBall.extras) : runsB;
    const newWicketsB = !isTeamABatting && lastBall.isWicket ? wicketsB - 1 : wicketsB;
    const newOversB = !isTeamABatting && isLegal ? subtractOvers(oversB, 1) : oversB;
    
    const statsA = { ...match.playerStatsA };
    const statsB = { ...match.playerStatsB };
    
    const batStatsMap = isTeamABatting ? statsA : statsB;
    const bowlStatsMap = isTeamABatting ? statsB : statsA;
    
    const striker = lastBall.batsmanName;
    const bowler = lastBall.bowlerName;
    
    if (batStatsMap[striker]) {
      if (lastBall.extraType !== 'WD') {
        batStatsMap[striker].ballsFaced = Math.max(0, batStatsMap[striker].ballsFaced - 1);
        batStatsMap[striker].runsScored = Math.max(0, batStatsMap[striker].runsScored - lastBall.runs);
        if (lastBall.runs === 4) batStatsMap[striker].fours = Math.max(0, batStatsMap[striker].fours - 1);
        if (lastBall.runs === 6) batStatsMap[striker].sixes = Math.max(0, batStatsMap[striker].sixes - 1);
      }
    }
    
    if (lastBall.isWicket && lastBall.dismissedPlayer && batStatsMap[lastBall.dismissedPlayer]) {
      batStatsMap[lastBall.dismissedPlayer].isOut = false;
      if (bowlStatsMap[bowler]) {
        bowlStatsMap[bowler].wicketsTaken = Math.max(0, bowlStatsMap[bowler].wicketsTaken - 1);
      }
    }
    
    if (bowlStatsMap[bowler]) {
      if (isLegal) {
        bowlStatsMap[bowler].oversBowled = subtractOvers(bowlStatsMap[bowler].oversBowled || 0, 1);
      }
      const bowlerRunsToSubtract = (lastBall.extraType === 'B' || lastBall.extraType === 'LB') ? lastBall.runs : (lastBall.runs + lastBall.extras);
      bowlStatsMap[bowler].runsConceded = Math.max(0, bowlStatsMap[bowler].runsConceded - bowlerRunsToSubtract);
    }
    
    let newOutPlayers = [...(match.outPlayers || [])];
    if (lastBall.isWicket && lastBall.dismissedPlayer) {
      newOutPlayers = newOutPlayers.filter(p => p !== lastBall.dismissedPlayer);
    }
    
    const newHistory = match.ballHistory.slice(0, -1);

    setIsSaving(true);
    updateMatch(tournament.id, match.id, {
      runsA: Math.max(0, newRunsA),
      wicketsA: Math.max(0, newWicketsA),
      oversA: Math.max(0, newOversA),
      runsB: Math.max(0, newRunsB),
      wicketsB: Math.max(0, newWicketsB),
      oversB: Math.max(0, newOversB),
      playerStatsA: statsA,
      playerStatsB: statsB,
      ballHistory: newHistory,
      outPlayers: newOutPlayers,
      strikerName: striker,
      bowlerName: bowler
    }, 'cricket')
      .catch((e) => {
        console.error(e);
        window.alert('Failed to undo ball');
      })
      .finally(() => {
        scoringLock.current = false;
        setIsSaving(false);
      });
  };

  // Helper to get batting stats for current innings
  const getBatStats = (name: string) => {
    const statsMap = isTeamABatting ? match.playerStatsA : match.playerStatsB;
    return (statsMap as any)?.[name || ''] || { runsScored: 0, ballsFaced: 0, fours: 0, sixes: 0 };
  };

  const getBowlStats = (name: string) => {
    const statsMap = isTeamABatting ? match.playerStatsB : match.playerStatsA;
    return (statsMap as any)?.[name || ''] || { runsConceded: 0, wicketsTaken: 0, oversBowled: 0 };
  };

  const battingRuns = isTeamABatting ? runsA : runsB;
  const battingWickets = isTeamABatting ? wicketsA : wicketsB;
  const battingOvers = isTeamABatting ? oversA : oversB;
  const battingTeamName = isTeamABatting ? match.teamAName : match.teamBName;
  const bowlingTeamName = isTeamABatting ? match.teamBName : match.teamAName;

  const oversLimit = tournament.oversPerInnings || 10;
  const runRate = battingOvers > 0 ? (battingRuns / (Math.floor(battingOvers) + (Math.round((battingOvers - Math.floor(battingOvers)) * 10) / 6))).toFixed(2) : '0.00';

  // Recent ball history (last over)
  const currentOverIndex = Math.floor(battingOvers);
  const recentBalls = (match.ballHistory || [])
    .filter(b => b.inning === currentInnings && b.over === currentOverIndex)
    .map(b => {
      if (b.isWicket) return 'W';
      if (b.extraType === 'WD') {
        return b.extras > 1 ? `${b.extras}WD` : 'WD';
      }
      if (b.extraType === 'NB') {
        const total = b.runs + b.extras;
        return b.runs > 0 ? `${total}NB` : 'NB';
      }
      if (b.extraType === 'B') {
        return `${b.extras}B`;
      }
      if (b.extraType === 'LB') {
        return `${b.extras}LB`;
      }
      return String(b.runs);
    });

  // ── SCORECARD ──
  if (match.status === 'COMPLETED') {
    return <CricketScorecard match={match} teams={teams} tournament={tournament} />;
  }

  // ── TOSS SCREEN ──
  if (!match.tossWinnerId && isManager) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Coin Icon */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30 mb-4">
              <Coins size={40} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Toss Time!</h1>
            <p className="text-slate-400 mt-1 text-sm">Who won the toss?</p>
          </div>

          {/* Match Settings */}
          <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-4 mb-8">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500" /> Match Rules
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-slate-300 block">Max Overs per Bowler</span>
                  <span className="text-[10px] text-slate-500">Standard: 1/5th of total overs</span>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setTempMaxOversPerBowler(Math.max(1, tempMaxOversPerBowler - 1))} className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center border border-white/5">-</button>
                  <span className="text-white font-bold w-4 text-center">{tempMaxOversPerBowler}</span>
                  <button type="button" onClick={() => setTempMaxOversPerBowler(tempMaxOversPerBowler + 1)} className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center border border-white/5">+</button>
                </div>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <div>
                  <span className="text-sm font-medium text-slate-300 block">Max Wickets (All Out)</span>
                  <span className="text-[10px] text-slate-500">Standard: 10 wickets</span>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setTempMaxWickets(Math.max(1, tempMaxWickets - 1))} className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center border border-white/5">-</button>
                  <span className="text-white font-bold w-4 text-center">{tempMaxWickets}</span>
                  <button type="button" onClick={() => setTempMaxWickets(Math.min(10, tempMaxWickets + 1))} className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center border border-white/5">+</button>
                </div>
              </div>
            </div>
          </div>

          {/* Team A Options */}
          <div className="space-y-3 mb-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">{match.teamAName}</p>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => handleTossSubmit(match.teamAId!, 'BAT')}
                disabled={isUpdating}
                className="bg-slate-800/80 hover:bg-slate-700 border border-white/10 rounded-xl p-4 text-center transition-all active:scale-95">
                <span className="text-white font-bold block">{match.teamAName}</span>
                <span className="text-orange-400 text-sm font-medium">Bat First 🏏</span>
              </button>
              <button type="button" onClick={() => handleTossSubmit(match.teamAId!, 'BOWL')}
                disabled={isUpdating}
                className="bg-slate-800/80 hover:bg-slate-700 border border-white/10 rounded-xl p-4 text-center transition-all active:scale-95">
                <span className="text-white font-bold block">{match.teamAName}</span>
                <span className="text-sky-400 text-sm font-medium">Bowl First 🎳</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 my-4 px-2">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-slate-500 font-bold">OR</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Team B Options */}
          <div className="space-y-3 mb-8">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">{match.teamBName}</p>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => handleTossSubmit(match.teamBId!, 'BAT')}
                disabled={isUpdating}
                className="bg-slate-800/80 hover:bg-slate-700 border border-white/10 rounded-xl p-4 text-center transition-all active:scale-95">
                <span className="text-white font-bold block">{match.teamBName}</span>
                <span className="text-orange-400 text-sm font-medium">Bat First 🏏</span>
              </button>
              <button type="button" onClick={() => handleTossSubmit(match.teamBId!, 'BOWL')}
                disabled={isUpdating}
                className="bg-slate-800/80 hover:bg-slate-700 border border-white/10 rounded-xl p-4 text-center transition-all active:scale-95">
                <span className="text-white font-bold block">{match.teamBName}</span>
                <span className="text-sky-400 text-sm font-medium">Bowl First 🎳</span>
              </button>
            </div>
          </div>

          <button type="button" onClick={onBack}
            className="w-full text-center py-3 text-slate-500 hover:text-slate-300 transition-colors text-sm">
            ← Back to Match List
          </button>
        </div>

        {isSaving && (
          <div className="fixed top-4 right-4 z-50 bg-slate-900/90 border border-orange-500/30 rounded-full px-3 py-1.5 flex items-center gap-2 shadow-lg pointer-events-none animate-in fade-in">
            <span className="animate-spin inline-block w-3 h-3 border-2 border-orange-500 border-t-transparent rounded-full" />
            <span className="text-xs text-orange-400 font-medium">Saving</span>
          </div>
        )}
      </div>
    );
  }

  // ── MAIN SCORING DASHBOARD ──
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col relative">

      {/* ── Header Bar ── */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900/80 backdrop-blur-sm border-b border-white/10 sticky top-0 z-40">
        <button type="button" onClick={onBack} className="p-2 -ml-2 hover:bg-white/5 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Innings {currentInnings}</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
        <button type="button" onClick={() => { setPlayerModalMode('ALL'); setPlayerModalVisible(true); }} className="p-2 -mr-2 hover:bg-white/5 rounded-lg transition-colors">
          <Trophy className="w-5 h-5 text-amber-500" />
        </button>
      </div>

      {/* ── Scrollable Content ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto w-full px-4 py-4 space-y-4">

          {/* ── Scoreboard Card ── */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 border border-white/10 shadow-xl">
            {/* Team Names Row */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-orange-400 uppercase tracking-widest">{battingTeamName}</span>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">vs {bowlingTeamName}</span>
            </div>

            {/* Score */}
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-6xl sm:text-7xl font-black text-white tabular-nums leading-none">{battingRuns}</span>
              <span className="text-3xl sm:text-4xl font-bold text-slate-500 leading-none">/{battingWickets}</span>
            </div>

            {/* Overs & Run Rate */}
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 text-sm">Overs</span>
                <span className="text-white font-semibold text-sm tabular-nums">{battingOvers.toFixed(1)}/{oversLimit}</span>
              </div>
              <div className="w-px h-4 bg-white/10" />
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 text-sm">CRR</span>
                <span className="text-white font-semibold text-sm tabular-nums">{runRate}</span>
              </div>
              {currentInnings === 2 && match.targetScore && (
                <>
                  <div className="w-px h-4 bg-white/10" />
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 text-sm">Need</span>
                    <span className="text-orange-400 font-bold text-sm tabular-nums">{Math.max(0, match.targetScore - battingRuns)}</span>
                  </div>
                </>
              )}
            </div>

            {currentInnings === 2 && match.targetScore && (
              <div className="mt-3 bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-1.5 inline-flex">
                <span className="text-orange-400 text-xs font-bold">Target: {match.targetScore}</span>
              </div>
            )}

            {/* Recent Balls */}
            {recentBalls.length > 0 && (
              <div className="mt-4 pt-3 border-t border-white/5">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block mb-2">This Over</span>
                <div className="flex gap-2 flex-wrap">
                  {recentBalls.map((ball, i) => (
                    <div key={i} className={`min-w-[32px] h-8 px-2 rounded-full flex items-center justify-center text-xs font-bold
                      ${ball === 'W' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                        ball === '4' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' :
                        ball === '6' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                        ball.includes('WD') || ball.includes('NB') || ball.includes('B') || ball.includes('LB') ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                        'bg-slate-700/50 text-slate-300 border border-white/5'}`}>
                      {ball}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Players on Field ── */}
          <div className="bg-slate-900/80 rounded-2xl border border-white/10 overflow-hidden">
            <div className="grid grid-cols-2 divide-x divide-white/10">
              {/* Batters */}
              <div className="p-4">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-3">Batting</span>
                {/* Striker */}
                <div className="mb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-white font-bold text-sm truncate">{match.strikerName || '—'}</span>
                      <span className="text-orange-400 text-[10px] font-bold">*</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-white font-bold text-lg tabular-nums">{getBatStats(match.strikerName || '').runsScored}</span>
                    <span className="text-slate-500 text-xs tabular-nums">({getBatStats(match.strikerName || '').ballsFaced})</span>
                    {getBatStats(match.strikerName || '').fours > 0 && <span className="text-sky-400 text-[10px]">{getBatStats(match.strikerName || '').fours}×4</span>}
                    {getBatStats(match.strikerName || '').sixes > 0 && <span className="text-emerald-400 text-[10px]">{getBatStats(match.strikerName || '').sixes}×6</span>}
                  </div>
                </div>
                {/* Non-Striker */}
                <div className="pt-2 border-t border-white/5">
                  <span className="text-slate-400 text-sm truncate block">{match.nonStrikerName || '—'}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-slate-300 font-semibold tabular-nums">{getBatStats(match.nonStrikerName || '').runsScored}</span>
                    <span className="text-slate-500 text-xs tabular-nums">({getBatStats(match.nonStrikerName || '').ballsFaced})</span>
                  </div>
                </div>
              </div>

              {/* Bowler */}
              <div className="p-4">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-3">Bowling</span>
                <span className="text-white font-bold text-sm block truncate">{match.bowlerName || '—'}</span>
                <div className="flex items-center gap-3 mt-1">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Wkts</span>
                    <span className="text-white font-bold tabular-nums">{getBowlStats(match.bowlerName || '').wicketsTaken}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Runs</span>
                    <span className="text-slate-300 font-semibold tabular-nums">{getBowlStats(match.bowlerName || '').runsConceded}</span>
                  </div>
                </div>
                {/* Assign Players Button */}
                {isManager && (
                  <button type="button" onClick={() => { setPlayerModalMode('ALL'); setPlayerModalVisible(true); }}
                    className="mt-3 text-xs text-orange-400 hover:text-orange-300 font-medium transition-colors">
                    ✏️ Set Players
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── Scoring Controls ── */}
          {isManager && match.status === 'LIVE' && (
            <div className="space-y-3 pb-6">
              {/* Run Buttons - Grid */}
              <div className="grid grid-cols-4 gap-2">
                {[0, 1, 2, 3].map(runs => (
                  <button type="button" key={runs} onClick={() => scoreBall(runs, 0)}
                    disabled={isUpdating}
                    className="bg-slate-800 hover:bg-slate-700 border border-white/10 rounded-xl py-4 text-center transition-all active:scale-95 disabled:opacity-50">
                    <span className="text-white font-bold text-xl">{runs}</span>
                  </button>
                ))}
              </div>

              {/* Boundary & Wicket */}
              <div className="grid grid-cols-3 gap-2">
                <button type="button" onClick={() => scoreBall(4, 0)} disabled={isUpdating}
                  className="bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 rounded-xl py-4 text-center transition-all active:scale-95 disabled:opacity-50">
                  <span className="text-sky-400 font-bold text-xl">4</span>
                  <span className="text-sky-500/60 text-[10px] block">FOUR</span>
                </button>
                <button type="button" onClick={() => scoreBall(6, 0)} disabled={isUpdating}
                  className="bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 rounded-xl py-4 text-center transition-all active:scale-95 disabled:opacity-50">
                  <span className="text-emerald-400 font-bold text-xl">6</span>
                  <span className="text-emerald-500/60 text-[10px] block">SIX</span>
                </button>
                <button type="button" onClick={() => scoreBall(0, 0, undefined, true)} disabled={isUpdating}
                  className="bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 rounded-xl py-4 text-center transition-all active:scale-95 disabled:opacity-50">
                  <span className="text-red-400 font-bold text-lg">OUT</span>
                  <span className="text-red-500/60 text-[10px] block">WICKET</span>
                </button>
              </div>

              {/* Extras */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'WD', extra: 'WD' as const },
                  { label: 'NB', extra: 'NB' as const },
                  { label: 'Bye', extra: 'B' as const },
                  { label: 'LB', extra: 'LB' as const },
                ].map(({ label, extra }) => (
                  <button type="button" key={extra} onClick={() => setExtraModal({ type: extra })}
                    className="bg-slate-800/60 hover:bg-slate-700 border border-white/5 rounded-lg py-3 text-center transition-all active:scale-95">
                    <span className="text-amber-400/80 font-semibold text-sm">{label}</span>
                  </button>
                ))}
              </div>

              {/* Undo */}
              <button type="button" onClick={undoLastBall}
                className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900/50 border border-white/5 rounded-xl text-slate-500 hover:text-slate-300 transition-colors">
                <RotateCcw className="w-4 h-4" />
                <span className="text-sm font-medium">Undo Last Ball</span>
              </button>
            </div>
          )}

        </div>
      </div>

      {/* ── Assign Players Modal ── */}
      {playerModalVisible && (() => {
        const battingTeam = teams.find(t => t.id === battingTeamId);
        const bowlingTeam = teams.find(t => t.id === bowlingTeamId);
        
        // Exclude OUT players from the available batting list
        const battingPlayers = (battingTeam?.players || []).filter(p => !(match.outPlayers || []).includes(p));
        
        const bowlingPlayers = bowlingTeam?.players || [];
        const maxOvers = match.maxOversPerBowler || 2;

        return (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center"
            onClick={() => setPlayerModalVisible(false)}>
            <div className="bg-slate-900 border border-white/10 rounded-t-2xl sm:rounded-2xl w-full max-w-md sm:mx-4 shadow-2xl max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}>
              <div className="p-6">
                <h3 className="text-lg font-bold text-white mb-1">Assign Players</h3>
                <p className="text-xs text-slate-500 mb-5">Tap a player name or type manually</p>

                <div className="space-y-5">
                  {/* Striker */}
                  {playerModalMode !== 'BOWLER_ONLY' && (
                  <div>
                    <label className="text-xs text-slate-400 font-medium block mb-1.5">
                      Striker * <span className="text-slate-600">({battingTeam?.name || 'Batting'})</span>
                    </label>
                    <input type="text" value={tempStriker} onChange={(e: any) => setTempStriker(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-orange-500/50 focus:border-orange-500/50 transition-colors"
                      placeholder="Enter striker name" />
                    {battingPlayers.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {battingPlayers.map(p => (
                          <button key={p} type="button" onClick={() => setTempStriker(p)}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all active:scale-95
                              ${tempStriker === p
                                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                                : 'bg-slate-800 text-slate-400 border border-white/5 hover:bg-slate-700 hover:text-white'}`}>
                            {p}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  )}

                  {/* Non-Striker */}
                  {playerModalMode !== 'BOWLER_ONLY' && (
                  <div>
                    <label className="text-xs text-slate-400 font-medium block mb-1.5">
                      Non-Striker <span className="text-slate-600">({battingTeam?.name || 'Batting'})</span>
                    </label>
                    <input type="text" value={tempNonStriker} onChange={(e: any) => setTempNonStriker(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-orange-500/50 focus:border-orange-500/50 transition-colors"
                      placeholder="Enter non-striker name" />
                    {battingPlayers.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {battingPlayers.map(p => (
                          <button key={p} type="button" onClick={() => setTempNonStriker(p)}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all active:scale-95
                              ${tempNonStriker === p
                                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                                : 'bg-slate-800 text-slate-400 border border-white/5 hover:bg-slate-700 hover:text-white'}`}>
                            {p}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  )}

                  {/* Bowler */}
                  {playerModalMode !== 'BATSMAN_ONLY' && (
                  <div>
                    <label className="text-xs text-slate-400 font-medium block mb-1.5">
                      Bowler * <span className="text-slate-600">({bowlingTeam?.name || 'Bowling'})</span>
                    </label>
                    <input type="text" value={tempBowler} onChange={(e: any) => setTempBowler(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-orange-500/50 focus:border-orange-500/50 transition-colors"
                      placeholder="Enter bowler name" />
                    {bowlingPlayers.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {bowlingPlayers.map(p => {
                          const stats = getBowlStats(p);
                          const isMaxed = stats.oversBowled >= maxOvers;
                          const isLastBowler = p === match.lastBowler && match.lastBowler !== undefined;
                          const isDisabled = isMaxed || isLastBowler;

                          return (
                            <button key={p} type="button" onClick={() => !isDisabled && setTempBowler(p)} disabled={isDisabled}
                              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all
                                ${tempBowler === p
                                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
                                  : isDisabled
                                    ? 'bg-slate-900/50 text-slate-600 border border-white/5 opacity-50 cursor-not-allowed'
                                    : 'bg-slate-800 text-slate-400 border border-white/5 hover:bg-slate-700 hover:text-white active:scale-95'}`}>
                              {p} {isMaxed ? '(Max)' : isLastBowler ? '(Last)' : ''}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 mt-6">
                  <button type="button" onClick={() => setPlayerModalVisible(false)}
                    className="py-3 border border-white/10 rounded-xl text-white font-medium text-sm hover:bg-white/5 transition-colors">
                    Cancel
                  </button>
                  <button type="button" onClick={handleSetPlayers} disabled={isUpdating}
                    className="py-3 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl text-white font-bold text-sm hover:from-orange-600 hover:to-orange-700 transition-all disabled:opacity-50 shadow-lg shadow-orange-500/20">
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Wicket Modal ── */}
      {pendingWicket && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setPendingWicket(null)}>
          <div className="bg-slate-900 border border-red-500/30 rounded-2xl p-6 w-full max-w-sm shadow-2xl shadow-red-500/10" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-2 text-center">Wicket!</h3>
            <p className="text-sm text-slate-400 mb-6 text-center">Who got out?</p>
            
            <div className="space-y-3">
              <button type="button" onClick={() => {
                scoreBall(pendingWicket.runsOffBat, pendingWicket.extras, pendingWicket.extraType, true, match.strikerName);
                setPendingWicket(null);
              }} className="w-full bg-slate-800 hover:bg-red-500/20 border border-white/5 hover:border-red-500/30 p-4 rounded-xl flex items-center justify-between transition-all group">
                <div className="text-left">
                  <span className="block text-xs text-slate-500 mb-0.5">Striker</span>
                  <span className="text-white font-bold group-hover:text-red-400">{match.strikerName}</span>
                </div>
                <span className="text-red-500/0 group-hover:text-red-500">👉</span>
              </button>

              <button type="button" onClick={() => {
                scoreBall(pendingWicket.runsOffBat, pendingWicket.extras, pendingWicket.extraType, true, match.nonStrikerName);
                setPendingWicket(null);
              }} className="w-full bg-slate-800 hover:bg-red-500/20 border border-white/5 hover:border-red-500/30 p-4 rounded-xl flex items-center justify-between transition-all group">
                <div className="text-left">
                  <span className="block text-xs text-slate-500 mb-0.5">Non-Striker</span>
                  <span className="text-white font-bold group-hover:text-red-400">{match.nonStrikerName}</span>
                </div>
                <span className="text-red-500/0 group-hover:text-red-500">👉</span>
              </button>
            </div>

            <button type="button" onClick={() => setPendingWicket(null)}
              className="w-full mt-6 py-3 text-slate-500 hover:text-white transition-colors text-sm font-medium">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Extra Modal ── */}
      {extraModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setExtraModal(null)}>
          <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-6 w-full max-w-sm shadow-2xl shadow-amber-500/10" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-1 text-center">
              {extraModal.type === 'WD' && 'Wide Ball'}
              {extraModal.type === 'NB' && 'No Ball'}
              {extraModal.type === 'B' && 'Byes'}
              {extraModal.type === 'LB' && 'Leg Byes'}
            </h3>
            <p className="text-xs text-slate-400 mb-5 text-center">
              {extraModal.type === 'WD' && 'Select additional runs (if any):'}
              {extraModal.type === 'NB' && 'Select runs scored off bat:'}
              {(extraModal.type === 'B' || extraModal.type === 'LB') && 'Select number of runs:'}
            </p>

            <div className="grid grid-cols-2 gap-2 mb-4">
              {extraModal.type === 'WD' && (
                <>
                  {[
                    { label: '1 (WD only)', runs: 0, extras: 1 },
                    { label: '2 (+1 run)', runs: 0, extras: 2 },
                    { label: '3 (+2 runs)', runs: 0, extras: 3 },
                    { label: '4 (+3 runs)', runs: 0, extras: 4 },
                    { label: '5 (+4 byes)', runs: 0, extras: 5 },
                  ].map((opt) => (
                    <button type="button" key={opt.label} onClick={() => { scoreBall(opt.runs, opt.extras, 'WD'); setExtraModal(null); }}
                      className="bg-slate-800 hover:bg-amber-500/20 border border-white/5 hover:border-amber-500/30 p-3 rounded-xl text-center transition-all">
                      <span className="text-amber-400 font-bold text-sm block">{opt.label}</span>
                    </button>
                  ))}
                </>
              )}

              {extraModal.type === 'NB' && (
                <>
                  {[
                    { label: '1 (NB only)', runs: 0, extras: 1 },
                    { label: '2 (+1 bat)', runs: 1, extras: 1 },
                    { label: '3 (+2 bat)', runs: 2, extras: 1 },
                    { label: '4 (+3 bat)', runs: 3, extras: 1 },
                    { label: '5 (+4 bat)', runs: 4, extras: 1 },
                    { label: '7 (+6 bat)', runs: 6, extras: 1 },
                  ].map((opt) => (
                    <button type="button" key={opt.label} onClick={() => { scoreBall(opt.runs, opt.extras, 'NB'); setExtraModal(null); }}
                      className="bg-slate-800 hover:bg-amber-500/20 border border-white/5 hover:border-amber-500/30 p-3 rounded-xl text-center transition-all">
                      <span className="text-amber-400 font-bold text-sm block">{opt.label}</span>
                    </button>
                  ))}
                </>
              )}

              {(extraModal.type === 'B' || extraModal.type === 'LB') && (
                <>
                  {[1, 2, 3, 4].map((count) => (
                    <button type="button" key={count} onClick={() => { scoreBall(0, count, extraModal.type); setExtraModal(null); }}
                      className="bg-slate-800 hover:bg-amber-500/20 border border-white/5 hover:border-amber-500/30 p-4 rounded-xl text-center transition-all">
                      <span className="text-amber-400 font-bold text-base block">{count} {count === 1 ? 'Run' : 'Runs'}</span>
                    </button>
                  ))}
                </>
              )}
            </div>

            <button type="button" onClick={() => setExtraModal(null)} className="w-full py-2.5 bg-slate-800 border border-white/10 rounded-xl text-slate-400 text-sm font-medium hover:bg-slate-700">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Loading Overlay ── */}
      {isSaving && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900/90 border border-orange-500/30 rounded-full px-3 py-1.5 flex items-center gap-2 shadow-lg pointer-events-none animate-in fade-in">
          <span className="animate-spin inline-block w-3 h-3 border-2 border-orange-500 border-t-transparent rounded-full" />
          <span className="text-xs text-orange-400 font-medium">Saving</span>
        </div>
      )}
    </div>
  );
}
