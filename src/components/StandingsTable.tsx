import React, { useMemo } from 'react';
import { useTeams, useMatches } from '../context/TournamentContext';
import { Trophy } from 'lucide-react';
import { clsx } from 'clsx';

import { calculateStandings, calculateCricketStandings } from '../utils/progression';

interface StandingsTableProps {
  phaseId?: string;
  poolTeamIds?: string[];
  sport?: 'volleyball' | 'badminton' | 'cricket';
}

export const StandingsTable: React.FC<StandingsTableProps> = ({ phaseId, sport = 'volleyball' }) => {
  const teams = useTeams();
  const matches = useMatches();

  const standings = useMemo(() => {
    const phaseMatches = phaseId ? matches.filter(m => m.phaseId === phaseId) : matches;
    if (sport === 'cricket') {
      return calculateCricketStandings(phaseMatches, teams);
    } else {
      return calculateStandings(phaseMatches, teams);
    }
  }, [teams, matches, phaseId, sport]);

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
                {sport === 'cricket' ? (
                  <>
                    <th className="px-4 py-3 text-center" title="Net Run Rate">NRR</th>
                    <th className="px-4 py-3 text-center" title="Runs/Overs">R/O</th>
                  </>
                ) : (
                  <>
                    <th className="px-4 py-3 text-center" title="Set Difference">S.Diff</th>
                    <th className="px-4 py-3 text-center" title="Point Difference">P.Diff</th>
                  </>
                )}
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
                  {sport === 'cricket' ? (
                    <>
                      <td className="px-4 py-3 text-center">{(team as any).nrr > 0 ? `+${(team as any).nrr.toFixed(2)}` : (team as any).nrr.toFixed(2)}</td>
                      <td className="px-4 py-3 text-center text-slate-300">
                        {(team as any).runsScored}/{((team as any).oversFaced).toFixed(1)}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-center">{(() => { const diff = ((team as any).setsWon || 0) - ((team as any).setsLost || 0); return diff > 0 ? `+${diff}` : diff; })()}</td>
                      <td className="px-4 py-3 text-center text-slate-300">
                        {(() => { const diff = ((team as any).pointsScored || 0) - ((team as any).pointsConceded || 0); return diff > 0 ? `+${diff}` : diff; })()}
                      </td>
                    </>
                  )}
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
              "card p-4",
              idx === 0 ? "border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.15)]" : "border-white/10"
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
              {sport === 'cricket' ? (
                <>
                  <div className="flex flex-col items-center flex-1 border-r border-white/5">
                    <span className="text-[10px] text-slate-500 font-bold uppercase mb-1">NRR</span>
                    <span className="font-bold text-white">
                      {(team as any).nrr > 0 ? `+${(team as any).nrr.toFixed(2)}` : (team as any).nrr.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex flex-col items-center flex-1">
                    <span className="text-[10px] text-slate-500 font-bold uppercase mb-1">Runs/Overs</span>
                    <span className="font-bold text-slate-300">
                      {(team as any).runsScored}/{((team as any).oversFaced).toFixed(1)}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-col items-center flex-1 border-r border-white/5">
                    <span className="text-[10px] text-slate-500 font-bold uppercase mb-1">S.Diff</span>
                    <span className="font-bold text-white">
                      {(() => { const diff = ((team as any).setsWon || 0) - ((team as any).setsLost || 0); return diff > 0 ? `+${diff}` : diff; })()}
                    </span>
                  </div>
                  <div className="flex flex-col items-center flex-1">
                    <span className="text-[10px] text-slate-500 font-bold uppercase mb-1">P.Diff</span>
                    <span className="font-bold text-slate-300">
                      {(() => { const diff = ((team as any).pointsScored || 0) - ((team as any).pointsConceded || 0); return diff > 0 ? `+${diff}` : diff; })()}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
};
