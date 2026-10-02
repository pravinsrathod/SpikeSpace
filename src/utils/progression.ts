import { type Team, type Match, type Tournament, updateMatch, updateTournament } from '../firebase/db';

export const calculateStandings = (matches: Match[], teams: Team[]) => {
  const stats = teams.map(team => ({
    ...team,
    played: 0, won: 0, lost: 0, setsWon: 0, setsLost: 0, points: 0,
    pointsScored: 0, pointsConceded: 0
  }));

  matches.forEach(match => {
    if (match.status !== 'COMPLETED') return;
    
    const tA = stats.find(t => t.id === match.teamAId);
    const tB = stats.find(t => t.id === match.teamBId);

    if (tA && tB) {
      tA.played++; tB.played++;
      tA.setsWon += match.setsWonA || 0; tB.setsWon += match.setsWonB || 0;
      tA.setsLost += match.setsWonB || 0; tB.setsLost += match.setsWonA || 0;
      
      const ptsA = (match.set1ScoreA || 0) + (match.set2ScoreA || 0) + (match.set3ScoreA || 0) + (match.set4ScoreA || 0) + (match.set5ScoreA || 0);
      const ptsB = (match.set1ScoreB || 0) + (match.set2ScoreB || 0) + (match.set3ScoreB || 0) + (match.set4ScoreB || 0) + (match.set5ScoreB || 0);

      tA.pointsScored += ptsA;
      tA.pointsConceded += ptsB;
      tB.pointsScored += ptsB;
      tB.pointsConceded += ptsA;

      if (match.winnerId === tA.id) {
        tA.won++; tB.lost++; tA.points += 3;
      } else if (match.winnerId === tB.id) {
        tB.won++; tA.lost++; tB.points += 3;
      }
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
    return a.name.localeCompare(b.name);
  });
};

export const calculateCricketStandings = (matches: Match[], teams: Team[]) => {
  const stats = teams.map(team => ({
    ...team,
    played: 0, won: 0, lost: 0, points: 0,
    runsScored: 0, oversFaced: 0,
    runsConceded: 0, oversBowled: 0,
    nrr: 0
  }));

  const parseOvers = (overs: number) => {
    const whole = Math.floor(overs);
    const balls = (overs - whole) * 10;
    return whole + (balls / 6);
  };

  matches.forEach(match => {
    if (match.status !== 'COMPLETED') return;
    
    const tA = stats.find(t => t.id === match.teamAId);
    const tB = stats.find(t => t.id === match.teamBId);

    if (tA && tB) {
      tA.played++; tB.played++;
      
      tA.runsScored += match.runsA || 0;
      tB.runsScored += match.runsB || 0;
      tA.runsConceded += match.runsB || 0;
      tB.runsConceded += match.runsA || 0;
      
      tA.oversFaced += parseOvers(match.oversA || 0);
      tB.oversFaced += parseOvers(match.oversB || 0);
      tA.oversBowled += parseOvers(match.oversB || 0);
      tB.oversBowled += parseOvers(match.oversA || 0);

      if (match.winnerId === tA.id) {
        tA.won++; tB.lost++; tA.points += 2;
      } else if (match.winnerId === tB.id) {
        tB.won++; tA.lost++; tB.points += 2;
      } else {
        // Tie
        tA.points += 1; tB.points += 1;
      }
    }
  });

  stats.forEach(team => {
    const runRateFor = team.oversFaced > 0 ? team.runsScored / team.oversFaced : 0;
    const runRateAgainst = team.oversBowled > 0 ? team.runsConceded / team.oversBowled : 0;
    team.nrr = runRateFor - runRateAgainst;
  });

  return stats.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.nrr !== a.nrr) return b.nrr - a.nrr;
    return a.name.localeCompare(b.name);
  });
};

export const checkDynamicProgression = async (tournament: Tournament, matches: Match[], teams: Team[], sport: 'volleyball' | 'badminton' | 'cricket' = 'volleyball') => {
  // Check for overall tournament winner
  const winner = determineTournamentWinner(tournament, matches, teams);
  if (winner && tournament.winnerName !== winner) {
    await updateTournament(tournament.id, { winnerName: winner }, sport);
  }

  // Iterate through phases
  for (let i = 0; i < tournament.phases.length - 1; i++) {
    const currentPhase = tournament.phases[i];
    
    if (currentPhase.teamsAdvancing === 0) continue;

    const currentMatches = matches.filter(m => m.phaseId === currentPhase.id);
    
    // Check if this phase is complete
    if (currentMatches.length > 0 && currentMatches.every(m => m.status === 'COMPLETED')) {
      
      // Determine advancing teams
      let advancingTeams: Team[] = [];
      
      if (currentPhase.type === 'ROUND_ROBIN') {
        let standings: Team[];
        if (sport === 'cricket') {
          standings = calculateCricketStandings(currentMatches, teams);
        } else {
          standings = calculateStandings(currentMatches, teams);
        }
        advancingTeams = standings.slice(0, currentPhase.teamsAdvancing);
      } else if (currentPhase.type === 'KNOCKOUT') {
        // Winners of the latest round in this knockout phase
        const maxRound = Math.max(...currentMatches.map(m => m.round));
        const lastRoundMatches = currentMatches.filter(m => m.round === maxRound);
        
        advancingTeams = lastRoundMatches.map(m => {
          const winnerId = m.winnerId;
          return teams.find(t => t.id === winnerId)!;
        }).filter(Boolean);
        
        // If we need fewer teams than winners (e.g. only 1 advances but there were 2 matches?)
        // Usually teamsAdvancing equals the number of winners.
        advancingTeams = advancingTeams.slice(0, currentPhase.teamsAdvancing);
      }

      // Check all matches in ALL future phases to see if they contain placeholders for this phase
      // Placeholders format: `TBD_1_${currentPhase.id}`
      if (advancingTeams.length === currentPhase.teamsAdvancing) {
        // Get all subsequent matches
        const futureMatches = matches.filter(m => {
          const phaseIdx = tournament.phases.findIndex(p => p.id === m.phaseId);
          return phaseIdx > i;
        });

        for (const m of futureMatches) {
          const updates: Partial<Match> = {};
          
          for (let j = 0; j < advancingTeams.length; j++) {
            const placeholderId = `TBD_${j + 1}_${currentPhase.id}`;
            const actualTeam = advancingTeams[j];

            if (m.teamAId === placeholderId) {
              updates.teamAId = actualTeam.id;
              updates.teamAName = actualTeam.name;
            }
            if (m.teamBId === placeholderId) {
              updates.teamBId = actualTeam.id;
              updates.teamBName = actualTeam.name;
            }
          }
          
          if (Object.keys(updates).length > 0) {
            await updateMatch(tournament.id, m.id, updates, sport);
          }
        }
      }
    }
  }
};

export const determineTournamentWinner = (tournament: Tournament, matches: Match[], teams: Team[]): string | undefined => {
  if (!tournament.phases || tournament.phases.length === 0) return undefined;
  
  const lastPhase = tournament.phases[tournament.phases.length - 1];
  const lastPhaseMatches = matches.filter(m => m.phaseId === lastPhase.id);
  
  if (lastPhase.type === 'KNOCKOUT') {
    const finalMatch = lastPhaseMatches.find(m => !m.nextMatchId);
    if (finalMatch && finalMatch.winnerId) {
      return finalMatch.winnerId === finalMatch.teamAId ? finalMatch.teamAName : finalMatch.teamBName;
    }
  } else if (lastPhase.type === 'PAGE_PLAYOFFS') {
    const finalMatch = lastPhaseMatches.find(m => m.name === 'Final');
    if (finalMatch && finalMatch.winnerId) {
      return finalMatch.winnerId === finalMatch.teamAId ? finalMatch.teamAName : finalMatch.teamBName;
    }
  } else if (lastPhase.type === 'ROUND_ROBIN') {
    if (lastPhaseMatches.length > 0 && lastPhaseMatches.every(m => m.status === 'COMPLETED')) {
      const isCricket = lastPhaseMatches.some(m => m.runsA !== undefined); // Simple heuristic
      const standings = isCricket ? calculateCricketStandings(lastPhaseMatches, teams) : calculateStandings(lastPhaseMatches, teams);
      if (standings.length > 0) {
        return standings[0].name;
      }
    }
  }
  
  return undefined;
};
