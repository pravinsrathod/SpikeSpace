import React, { useMemo } from 'react';
import { useTeams, useMatches } from '../context/TournamentContext';
import { Trophy } from 'lucide-react';
import { clsx } from 'clsx';

interface StandingsTableProps {
  phaseId?: string;
  poolTeamIds?: string[];
}

export const StandingsTable: React.FC<StandingsTableProps> = ({ phaseId }) => {
  const teams = useTeams();
  const matches = useMatches();

  const standings = useMemo(() => {
    const stats = teams.map(team => ({
      ...team,
      played: 0, won: 0, lost: 0, setsWon: 0, setsLost: 0, points: 0,
      pointsScored: 0, pointsConceded: 0
    }));

    matches.forEach(match => {
      if (match.status !== 'COMPLETED') return;
      if (phaseId && match.phaseId !== phaseId) return; // Filter by phase
      
      const tA = stats.find(t => t.id === match.teamAId);
      const tB = stats.find(t => t.id === match.teamBId);

      if (tA && tB) {
        tA.played++; tB.played++;
        tA.setsWon += match.setsWonA; tB.setsWon += match.setsWonB;
        tA.setsLost += match.setsWonB; tB.setsLost += match.setsWonA;

        if (match.winnerId === tA.id) {
          tA.won++; tB.lost++; tA.points += 3;
        } else if (match.winnerId === tB.id) {
          tB.won++; tA.lost++; tB.points += 3;
        }

        const ptsA = (match.set1ScoreA||0) + (match.set2ScoreA||0) + (match.set3ScoreA||0) + (match.set4ScoreA||0) + (match.set5ScoreA||0);
        const ptsB = (match.set1ScoreB||0) + (match.set2ScoreB||0) + (match.set3ScoreB||0) + (match.set4ScoreB||0) + (match.set5ScoreB||0);
        
        tA.pointsScored += ptsA;
        tA.pointsConceded += ptsB;
        tB.pointsScored += ptsB;
        tB.pointsConceded += ptsA;
      }
    });

    return stats.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const setDiffA = a.setsWon - a.setsLost;
      const setDiffB = b.setsWon - b.setsLost;
      if (setDiffB !== setDiffA) return setDiffB - setDiffA;
      const ptDiffA = a.pointsScored - a.pointsConceded;
      const ptDiffB = b.pointsScored - b.pointsConceded;
      if (ptDiffB !== ptDiffA) return ptDiffB - ptDiffA;
      return b.pointsScored - a.pointsScored;
    });
  }, [teams, matches, phaseId]);

  // If a phase is selected, show teams that belong to this phase
  const displayStandings = useMemo(() => {
    if (!phaseId) return standings;
    
    // Find all team IDs that are scheduled to play in this phase
    const teamsInPhase = new Set<string>();
    matches.forEach(m => {
      if (m.phaseId === phaseId) {
        if (m.teamAId && !m.teamAId.startsWith('TBD')) teamsInPhase.add(m.teamAId);
        if (m.teamBId && !m.teamBId.startsWith('TBD')) teamsInPhase.add(m.teamBId);
      }
    });

    return standings.filter(t => teamsInPhase.has(t.id));
  }, [standings, phaseId, matches]);

  return (
    <>
      {/* Desktop Table View */}
      <div className="card overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-400 uppercase bg-slate-900/80 border-b border-white/10">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3 min-w-[150px]">Team</th>
                <th className="px-4 py-3 text-center">P</th>
                <th className="px-4 py-3 text-center">W</th>
                <th className="px-4 py-3 text-center">L</th>
                <th className="px-4 py-3 text-center" title="Set Difference">S.Diff</th>
                <th className="px-4 py-3 text-center" title="Point Difference">P.Diff</th>
                <th className="px-4 py-3 text-center text-primary font-bold">PTS</th>
              </tr>
            </thead>
            <tbody>
              {displayStandings.map((team, idx) => (
                <tr 
                  key={team.id} 
                  className={clsx(
                    "border-b border-white/5 hover:bg-white/5 transition-colors",
                    idx === 0 && "bg-amber-500/10 text-amber-500"
                  )}
                >
                  <td className="px-4 py-3 font-medium">
                    {idx === 0 ? <Trophy className="w-4 h-4 text-amber-500" /> : idx + 1}
                  </td>
                  <td className="px-4 py-3 font-semibold flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: team.colorHex }} />
                    {team.name}
                  </td>
                  <td className="px-4 py-3 text-center">{team.played}</td>
                  <td className="px-4 py-3 text-center text-emerald-500">{team.won}</td>
                  <td className="px-4 py-3 text-center text-red-500">{team.lost}</td>
                  <td className="px-4 py-3 text-center">{team.setsWon - team.setsLost > 0 ? `+${team.setsWon - team.setsLost}` : team.setsWon - team.setsLost}</td>
                  <td className="px-4 py-3 text-center text-slate-300">
                    {team.pointsScored - team.pointsConceded > 0 ? `+${team.pointsScored - team.pointsConceded}` : team.pointsScored - team.pointsConceded}
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-lg">{team.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3 pb-4">
        {displayStandings.map((team, idx) => (
          <div 
            key={team.id} 
            className={clsx(
              "bg-slate-900 border rounded-xl p-4",
              idx === 0 ? "border-amber-500/30" : "border-white/5"
            )}
          >
            {/* Top Row: Rank, Team, Points */}
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center flex-1 pr-2">
                <div className="w-8 flex justify-center items-start">
                  {idx === 0 ? <Trophy className="w-5 h-5 text-amber-500" /> : <span className="font-bold text-lg text-slate-400">{idx + 1}</span>}
                </div>
                <div className="w-3 h-3 rounded-full mr-3 shrink-0" style={{ backgroundColor: team.colorHex }} />
                <span 
                  className={clsx("font-bold text-lg truncate", idx === 0 ? "text-amber-500" : "text-white")}
                >
                  {team.name}
                </span>
              </div>
              <div className="bg-primary/20 px-3 py-1.5 rounded-lg border border-primary/20 shrink-0">
                <span className="text-primary font-bold">{team.points} PTS</span>
              </div>
            </div>
            
            {/* Bottom Row: Detailed Stats Grid */}
            <div className="flex justify-between bg-slate-950/50 rounded-lg p-3 border border-white/5">
              <div className="flex flex-col items-center flex-1 border-r border-white/5">
                <span className="text-[10px] text-slate-500 font-bold uppercase mb-1">Played</span>
                <span className="font-bold text-white">{team.played}</span>
              </div>
              <div className="flex flex-col items-center flex-1 border-r border-white/5">
                <span className="text-[10px] text-slate-500 font-bold uppercase mb-1">W - L</span>
                <span className="font-bold text-emerald-400">{team.won} <span className="text-slate-500 font-normal">-</span> <span className="text-red-400">{team.lost}</span></span>
              </div>
              <div className="flex flex-col items-center flex-1 border-r border-white/5">
                <span className="text-[10px] text-slate-500 font-bold uppercase mb-1">S.Diff</span>
                <span className="font-bold text-white">
                  {team.setsWon - team.setsLost > 0 ? `+${team.setsWon - team.setsLost}` : team.setsWon - team.setsLost}
                </span>
              </div>
              <div className="flex flex-col items-center flex-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase mb-1">P.Diff</span>
                <span className="font-bold text-slate-300">
                  {team.pointsScored - team.pointsConceded > 0 ? `+${team.pointsScored - team.pointsConceded}` : team.pointsScored - team.pointsConceded}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};
