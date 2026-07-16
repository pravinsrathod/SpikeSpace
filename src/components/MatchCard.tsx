
import type { Match } from '../firebase/db';
import { clsx } from 'clsx';
import { useTeams } from '../context/TournamentContext';

interface MatchCardProps {
  match: Match;
  onClick?: () => void;
}

export function MatchCard({ match, onClick }: MatchCardProps) {
  const teams = useTeams();
  
  const teamA = teams.find(t => t.id === match.teamAId);
  const teamB = teams.find(t => t.id === match.teamBId);

  const getStatusColor = () => {
    switch (match.status) {
      case 'LIVE': return 'text-emerald-500 bg-emerald-500/10';
      case 'COMPLETED': return 'text-slate-400 bg-slate-800/50';
      default: return 'text-sky-500 bg-sky-500/10';
    }
  };

  const getScoresA = () => {
    const scores = [];
    if (match.set1ScoreA || match.set1ScoreB) scores.push(match.set1ScoreA || 0);
    if (match.set2ScoreA || match.set2ScoreB) scores.push(match.set2ScoreA || 0);
    if (match.set3ScoreA || match.set3ScoreB) scores.push(match.set3ScoreA || 0);
    if (match.set4ScoreA || match.set4ScoreB) scores.push(match.set4ScoreA || 0);
    if (match.set5ScoreA || match.set5ScoreB) scores.push(match.set5ScoreA || 0);
    return scores;
  };

  const getScoresB = () => {
    const scores = [];
    if (match.set1ScoreA || match.set1ScoreB) scores.push(match.set1ScoreB || 0);
    if (match.set2ScoreA || match.set2ScoreB) scores.push(match.set2ScoreB || 0);
    if (match.set3ScoreA || match.set3ScoreB) scores.push(match.set3ScoreB || 0);
    if (match.set4ScoreA || match.set4ScoreB) scores.push(match.set4ScoreB || 0);
    if (match.set5ScoreA || match.set5ScoreB) scores.push(match.set5ScoreB || 0);
    return scores;
  };

  return (
    <div 
      onClick={onClick}
      className={clsx(
        "card p-4 cursor-pointer transition-all hover:border-primary/50 group relative min-w-[240px]",
        match.status === 'LIVE' && "border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
      )}
    >
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs font-medium text-slate-500">{match.name || `Match ${match.position + 1}`}</span>
        <span className={clsx("text-xs font-bold px-2 py-0.5 rounded-full", getStatusColor())}>
          {match.status}
        </span>
      </div>

      <div className="space-y-2">
        <div className={clsx(
          "flex justify-between items-center p-2 rounded bg-white/5",
          match.winnerId === match.teamAId && "bg-primary/10"
        )}>
          <div className="flex items-center gap-2 truncate">
            {teamA && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: teamA.colorHex }} />}
            <span className={clsx(
              "font-semibold truncate",
              match.winnerId === match.teamAId ? "text-white" : "text-slate-300"
            )}>
              {match.teamAName}
            </span>
          </div>
          <div className="flex items-center">
            {match.status === 'COMPLETED' && (
              <div className="flex gap-1.5 text-[11px] text-slate-400 mr-3 font-mono">
                {getScoresA().map((s, i) => (
                  <span key={i} className="w-4 text-center">{s}</span>
                ))}
              </div>
            )}
            <span className="font-bold text-white ml-1 w-4 text-center">{match.setsWonA ?? 0}</span>
          </div>
        </div>

        <div className={clsx(
          "flex justify-between items-center p-2 rounded bg-white/5",
          match.winnerId === match.teamBId && "bg-primary/10"
        )}>
          <div className="flex items-center gap-2 truncate">
            {teamB && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: teamB.colorHex }} />}
            <span className={clsx(
              "font-semibold truncate",
              match.winnerId === match.teamBId ? "text-white" : "text-slate-300"
            )}>
              {match.teamBName}
            </span>
          </div>
          <div className="flex items-center">
            {match.status === 'COMPLETED' && (
              <div className="flex gap-1.5 text-[11px] text-slate-400 mr-3 font-mono">
                {getScoresB().map((s, i) => (
                  <span key={i} className="w-4 text-center">{s}</span>
                ))}
              </div>
            )}
            <span className="font-bold text-white ml-1 w-4 text-center">{match.setsWonB ?? 0}</span>
          </div>
        </div>
      </div>
      
      {match.status === 'LIVE' && (
        <div className="mt-3 text-center text-xs text-emerald-400 animate-pulse">
          Live Match in Progress
        </div>
      )}

    </div>
  );
};
