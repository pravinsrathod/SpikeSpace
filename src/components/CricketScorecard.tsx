import { useState } from 'react';
import type { Match, Team, Tournament, CricketPlayerStats } from '../firebase/db';
import { ArrowLeft, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  match: Match;
  teams: Team[];
  tournament: Tournament;
}

export function CricketScorecard({ match, teams, tournament }: Props) {
  const navigate = useNavigate();
  const [activeInnings, setActiveInnings] = useState<1 | 2>(2);

  const teamA = teams.find(t => t.id === match.teamAId);
  const teamB = teams.find(t => t.id === match.teamBId);

  const teamABattedFirst = (match.tossWinnerId === teamA?.id && match.tossDecision === 'BAT') ||
                           (match.tossWinnerId === teamB?.id && match.tossDecision === 'BOWL');

  const inn1BatTeam = teamABattedFirst ? teamA : teamB;
  const inn1BowlTeam = teamABattedFirst ? teamB : teamA;
  
  const inn2BatTeam = teamABattedFirst ? teamB : teamA;
  const inn2BowlTeam = teamABattedFirst ? teamA : teamB;

  const renderBattingTable = (team: Team | undefined, statsMap: Record<string, CricketPlayerStats> | undefined) => {
    if (!team || !statsMap) return null;
    const players = Object.entries(statsMap).filter(([_, stats]) => stats.ballsFaced > 0 || stats.isOut);
    
    return (
      <div className="bg-slate-900/50 rounded-xl border border-white/5 overflow-hidden mb-6">
        <div className="bg-slate-800/50 px-4 py-2 border-b border-white/5 flex justify-between items-center">
          <span className="font-bold text-white">Batting - {team.name}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-900/80 text-slate-400 text-xs uppercase">
              <tr>
                <th className="px-4 py-2 font-medium">Batter</th>
                <th className="px-4 py-2 font-medium text-right">R</th>
                <th className="px-4 py-2 font-medium text-right">B</th>
                <th className="px-4 py-2 font-medium text-right">4s</th>
                <th className="px-4 py-2 font-medium text-right">6s</th>
                <th className="px-4 py-2 font-medium text-right">SR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              {players.map(([name, stats]) => (
                <tr key={name}>
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${stats.isOut ? 'text-slate-300' : 'text-white'}`}>{name}</span>
                    <span className="text-xs text-slate-500 block">{stats.isOut ? 'out' : 'not out'}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-white">{stats.runsScored}</td>
                  <td className="px-4 py-3 text-right">{stats.ballsFaced}</td>
                  <td className="px-4 py-3 text-right">{stats.fours}</td>
                  <td className="px-4 py-3 text-right">{stats.sixes}</td>
                  <td className="px-4 py-3 text-right">
                    {stats.ballsFaced > 0 ? ((stats.runsScored / stats.ballsFaced) * 100).toFixed(1) : '0.0'}
                  </td>
                </tr>
              ))}
              {players.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-4 text-center text-slate-500 text-xs italic">No batting data</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderBowlingTable = (team: Team | undefined, statsMap: Record<string, CricketPlayerStats> | undefined) => {
    if (!team || !statsMap) return null;
    const players = Object.entries(statsMap).filter(([_, stats]) => stats.oversBowled > 0 || stats.runsConceded > 0);
    
    return (
      <div className="bg-slate-900/50 rounded-xl border border-white/5 overflow-hidden mb-6">
        <div className="bg-slate-800/50 px-4 py-2 border-b border-white/5 flex justify-between items-center">
          <span className="font-bold text-white">Bowling - {team.name}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-900/80 text-slate-400 text-xs uppercase">
              <tr>
                <th className="px-4 py-2 font-medium">Bowler</th>
                <th className="px-4 py-2 font-medium text-right">O</th>
                <th className="px-4 py-2 font-medium text-right">M</th>
                <th className="px-4 py-2 font-medium text-right">R</th>
                <th className="px-4 py-2 font-medium text-right">W</th>
                <th className="px-4 py-2 font-medium text-right">ER</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              {players.map(([name, stats]) => (
                <tr key={name}>
                  <td className="px-4 py-3 font-semibold text-white">{name}</td>
                  <td className="px-4 py-3 text-right">{stats.oversBowled.toFixed(1)}</td>
                  <td className="px-4 py-3 text-right">{stats.maidens}</td>
                  <td className="px-4 py-3 text-right">{stats.runsConceded}</td>
                  <td className="px-4 py-3 text-right font-bold text-white">{stats.wicketsTaken}</td>
                  <td className="px-4 py-3 text-right">
                    {stats.oversBowled > 0 ? (stats.runsConceded / stats.oversBowled).toFixed(1) : '0.0'}
                  </td>
                </tr>
              ))}
              {players.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-4 text-center text-slate-500 text-xs italic">No bowling data</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const inn1Score = teamABattedFirst ? `${match.runsA}/${match.wicketsA} (${match.oversA?.toFixed(1)})` : `${match.runsB}/${match.wicketsB} (${match.oversB?.toFixed(1)})`;
  const inn2Score = teamABattedFirst ? `${match.runsB}/${match.wicketsB} (${match.oversB?.toFixed(1)})` : `${match.runsA}/${match.wicketsA} (${match.oversA?.toFixed(1)})`;
  
  const matchResult = match.winnerId === teamA?.id ? `${teamA?.name} won` : match.winnerId === teamB?.id ? `${teamB?.name} won` : 'Match Tied';

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-xl border-b border-white/10 px-4 py-3 flex items-center gap-4">
        <button onClick={() => navigate("..")} className="p-2 -ml-2 hover:bg-white/5 rounded-lg transition-colors text-slate-400 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-white font-bold text-lg truncate">Scorecard</h1>
          <p className="text-xs text-slate-400 truncate">{tournament.name}</p>
        </div>
        <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center gap-1.5">
          <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider">Completed</span>
        </div>
      </div>

      <div className="flex-1 max-w-4xl w-full mx-auto p-4 lg:p-8">
        {/* Result Banner */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-white/10 rounded-2xl p-6 mb-8 text-center shadow-2xl">
          <Trophy className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h2 className="text-2xl lg:text-3xl font-black text-white mb-2">{matchResult}</h2>
          <div className="flex items-center justify-center gap-4 text-slate-400">
            <span className="font-semibold">{teamA?.name}</span>
            <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-500">VS</span>
            <span className="font-semibold">{teamB?.name}</span>
          </div>
        </div>

        {/* Innings Toggles */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setActiveInnings(1)}
            className={`flex-1 p-3 rounded-xl border text-sm font-bold transition-all ${
              activeInnings === 1 ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' : 'bg-slate-900 border-white/5 text-slate-400 hover:bg-slate-800'
            }`}>
            <div className="text-xs font-medium opacity-80 mb-0.5">1st Innings</div>
            {inn1BatTeam?.name} - {inn1Score}
          </button>
          <button onClick={() => setActiveInnings(2)}
            className={`flex-1 p-3 rounded-xl border text-sm font-bold transition-all ${
              activeInnings === 2 ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' : 'bg-slate-900 border-white/5 text-slate-400 hover:bg-slate-800'
            }`}>
            <div className="text-xs font-medium opacity-80 mb-0.5">2nd Innings</div>
            {inn2BatTeam?.name} - {inn2Score}
          </button>
        </div>

        {/* Scorecard Tables */}
        {activeInnings === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {renderBattingTable(inn1BatTeam, teamABattedFirst ? match.playerStatsA : match.playerStatsB)}
            {renderBowlingTable(inn1BowlTeam, teamABattedFirst ? match.playerStatsB : match.playerStatsA)}
          </div>
        )}
        {activeInnings === 2 && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {renderBattingTable(inn2BatTeam, teamABattedFirst ? match.playerStatsB : match.playerStatsA)}
            {renderBowlingTable(inn2BowlTeam, teamABattedFirst ? match.playerStatsA : match.playerStatsB)}
          </div>
        )}
      </div>
    </div>
  );
}
