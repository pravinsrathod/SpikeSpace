import type { Team, Match, TournamentPhase } from '../firebase/db';
import { v4 as uuidv4 } from 'uuid';

export const generateDynamicTournament = (tournamentId: string, teams: Team[], phases: TournamentPhase[]): Match[] => {
  if (teams.length < 2 || phases.length === 0) return [];
  
  const matches: Match[] = [];
  let posCount = 0;
  let globalRoundOffset = 0; // to keep rounds sequentially increasing across phases

  // Helper to create a base match
  const createMatchTemplate = (r: number, pos: number, phaseId: string): Match => ({
    id: uuidv4(),
    tournamentId,
    teamAId: null, teamBId: null, teamAName: 'TBD', teamBName: 'TBD',
    round: r, position: pos, phaseId, nextMatchId: null, status: 'PENDING',
    totalSets: 1, pointsPerSet: 21, pointsLastSet: 21,
    setsWonA: 0, setsWonB: 0,
    set1ScoreA: 0, set1ScoreB: 0, set2ScoreA: 0, set2ScoreB: 0, set3ScoreA: 0, set3ScoreB: 0,
    set4ScoreA: 0, set4ScoreB: 0, set5ScoreA: 0, set5ScoreB: 0,
    winnerId: null, currentServe: null,
    timeoutsRemainingA: 2, timeoutsRemainingB: 2,
    updatedAt: new Date(),
  });

  // Track the participants for the current phase.
  let currentParticipants: Array<{ id: string, name: string }> = teams.map(t => ({ id: t.id, name: t.name }));

  for (let phaseIdx = 0; phaseIdx < phases.length; phaseIdx++) {
    const phase = phases[phaseIdx];
    const isFirstPhase = phaseIdx === 0;

    // If teamIds is specified, this phase uses specific starting teams (e.g., for Pools)
    if (phase.teamIds && phase.teamIds.length > 0) {
      currentParticipants = teams
        .filter(t => phase.teamIds!.includes(t.id))
        .map(t => ({ id: t.id, name: t.name }));
    }

    if (phase.type === 'ROUND_ROBIN') {
      const players = [...currentParticipants];
      if (isFirstPhase) {
        players.sort(() => Math.random() - 0.5);
      }

      if (players.length % 2 !== 0) {
        players.push({ id: 'BYE', name: 'BYE' });
      }

      const numRounds = players.length - 1;
      const halfSize = players.length / 2;

      const phaseMatchesByRound: Match[][] = [];

      for (let r = 0; r < numRounds; r++) {
        const roundMatches: Match[] = [];
        for (let i = 0; i < halfSize; i++) {
          const tA = players[i];
          const tB = players[players.length - 1 - i];

          if (tA.id !== 'BYE' && tB.id !== 'BYE') {
            const m = createMatchTemplate(globalRoundOffset + r + 1, 0, phase.id); // pos assigned later
            m.teamAId = tA.id;
            m.teamBId = tB.id;
            m.teamAName = tA.name;
            m.teamBName = tB.name;
            roundMatches.push(m);
          }
        }
        phaseMatchesByRound.push(roundMatches);
        players.splice(1, 0, players.pop()!);
      }

      // Optimize round boundaries to avoid consecutive matches
      const getSharedCount = (m1: Match, m2: Match) => {
        let count = 0;
        if (m1.teamAId && (m1.teamAId === m2.teamAId || m1.teamAId === m2.teamBId)) count++;
        if (m1.teamBId && (m1.teamBId === m2.teamAId || m1.teamBId === m2.teamBId)) count++;
        return count;
      };

      for (let r = 1; r < phaseMatchesByRound.length; r++) {
        const prevRound = phaseMatchesByRound[r - 1];
        if (prevRound.length === 0) continue;
        const lastMatch = prevRound[prevRound.length - 1];
        const currentRound = phaseMatchesByRound[r];
        if (currentRound.length === 0) continue;

        let bestIdx = 0;
        let minShared = getSharedCount(lastMatch, currentRound[0]);
        for (let i = 1; i < currentRound.length; i++) {
          const shared = getSharedCount(lastMatch, currentRound[i]);
          if (shared < minShared) {
            minShared = shared;
            bestIdx = i;
          }
          if (minShared === 0) break;
        }

        if (bestIdx !== 0) {
          const temp = currentRound[0];
          currentRound[0] = currentRound[bestIdx];
          currentRound[bestIdx] = temp;
        }
      }

      // Assign positions and push to matches
      for (const roundMatches of phaseMatchesByRound) {
        for (const m of roundMatches) {
          m.position = posCount++;
          matches.push(m);
        }
      }

      globalRoundOffset += numRounds;

    } else if (phase.type === 'KNOCKOUT') {
      // Generate knockout bracket
      const nextPowerOf2 = Math.pow(2, Math.ceil(Math.log2(currentParticipants.length)));
      const byesNeeded = nextPowerOf2 - currentParticipants.length;

      const koParticipants: Array<{ id: string, name: string } | null> = [...currentParticipants];
      for (let i = 0; i < byesNeeded; i++) {
        koParticipants.push(null);
      }
      
      // Shuffle only if it's the first phase, otherwise keep seeding order from previous phase
      if (isFirstPhase) {
        koParticipants.sort(() => Math.random() - 0.5);
      } else {
        // Typical seeding: 1 vs 4, 2 vs 3, etc.
        // For simplicity, we just use the array order which is already sorted by previous phase standings.
        // E.g. [1st, 2nd, 3rd, 4th] -> 1 plays 4, 2 plays 3
        const seeded = [];
        for (let i = 0; i < koParticipants.length / 2; i++) {
          seeded.push(koParticipants[i]);
          seeded.push(koParticipants[koParticipants.length - 1 - i]);
        }
        // Replace koParticipants with seeded order
        koParticipants.length = 0;
        koParticipants.push(...seeded);
      }

      const totalKoRounds = Math.log2(nextPowerOf2);
      let currentRoundMatches: Match[] = [];
      const phaseMatches: Match[] = [];

      for (let r = totalKoRounds; r >= 1; r--) {
        const matchesInRound = Math.pow(2, totalKoRounds - r);
        const previousRoundMatches = currentRoundMatches;
        currentRoundMatches = [];

        for (let pos = 0; pos < matchesInRound; pos++) {
          const m = createMatchTemplate(globalRoundOffset + r, posCount++, phase.id);
          
          if (r < totalKoRounds) {
            const parentMatch = previousRoundMatches[Math.floor(pos / 2)];
            m.nextMatchId = parentMatch.id;
          }
          currentRoundMatches.push(m);
          phaseMatches.push(m);
        }
      }
      
      // Assign participants to the first round of knockout (the matches with round == globalRoundOffset + 1)
      const firstRoundKoMatches = phaseMatches.filter(m => m.round === globalRoundOffset + 1).sort((a, b) => a.position - b.position);
      let pIdx = 0;
      for (const m of firstRoundKoMatches) {
        const tA = koParticipants[pIdx++];
        const tB = koParticipants[pIdx++];
        
        m.teamAName = tA ? tA.name : 'BYE';
        m.teamBName = tB ? tB.name : 'BYE';

        m.teamAId = tA ? tA.id : null;
        m.teamBId = tB ? tB.id : null;
        
        if (!tA || !tB) {
          m.status = 'COMPLETED';
          if (tA || tB) {
            const winner = tA || tB;
            m.winnerId = winner!.id; // for phase 1 this is real id, for phase 2 it's placeholder ID
            m.setsWonA = tA ? 2 : 0;
            m.setsWonB = tB ? 2 : 0;
          }
        }
      }

      // Propagate BYEs within this phase
      const propagateByes = (mList: Match[]) => {
        let changed = true;
        while (changed) {
          changed = false;
          for (const match of mList) {
            if (match.status === 'COMPLETED' && match.winnerId && match.nextMatchId) {
              const nextMatch = mList.find(m => m.id === match.nextMatchId);
              if (nextMatch) {
                const isTeamA = match.position % 2 === 0;
                const winnerName = match.winnerId === match.teamAId ? match.teamAName : match.teamBName;
                const winnerId = match.winnerId;

                if (isTeamA && nextMatch.teamAId !== winnerId) {
                  nextMatch.teamAId = winnerId;
                  nextMatch.teamAName = winnerName;
                  changed = true;
                } else if (!isTeamA && nextMatch.teamBId !== winnerId) {
                  nextMatch.teamBId = winnerId;
                  nextMatch.teamBName = winnerName;
                  changed = true;
                }
                
                if (nextMatch.teamAId && nextMatch.teamBName === 'BYE' && nextMatch.status !== 'COMPLETED') {
                  nextMatch.status = 'COMPLETED';
                  nextMatch.winnerId = nextMatch.teamAId;
                  nextMatch.setsWonA = 2;
                  changed = true;
                } else if (nextMatch.teamBId && nextMatch.teamAName === 'BYE' && nextMatch.status !== 'COMPLETED') {
                  nextMatch.status = 'COMPLETED';
                  nextMatch.winnerId = nextMatch.teamBId;
                  nextMatch.setsWonB = 2;
                  changed = true;
                }
              }
            }
          }
        }
      };
      propagateByes(phaseMatches);

      matches.push(...phaseMatches);
      globalRoundOffset += totalKoRounds;
    } else if (phase.type === 'PAGE_PLAYOFFS') {
      // PAGE PLAYOFFS expects exactly 4 participants!
      // If we are coming from two pools, currentParticipants will be Pool A 1st, 2nd, Pool B 1st, 2nd.
      // If we are coming from one Round Robin, currentParticipants will be 1st, 2nd, 3rd, 4th.
      // So participants are: [Rank 1, Rank 2, Rank 3, Rank 4]
      // Or: [Pool A 1, Pool A 2, Pool B 1, Pool B 2]
      // We need to map them properly to the IPL format:
      // Qualifier 1 (Top 2): Rank 1 vs Rank 2 (or Pool A 1 vs Pool B 1)
      // Eliminator (Bottom 2): Rank 3 vs Rank 4 (or Pool A 2 vs Pool B 2)
      
      let top2: typeof currentParticipants = [];
      let bot2: typeof currentParticipants = [];
      
      // If exactly 4 participants passed down (Pool A & Pool B give 2 each, or RR gives 4)
      if (currentParticipants.length === 4) {
        // Assume order: Pool A 1st, Pool A 2nd, Pool B 1st, Pool B 2nd
        // (This happens if Pool A was phase 1, Pool B was phase 2, and both had 2 advancing)
        // Wait, currentParticipants from previous phases is overwritten by the LAST phase.
        // We need to handle this by having a special ID lookup or just rely on the placeholders.
        // If we generated 4 placeholders for this phase: TBD_1..4
        top2 = [currentParticipants[0], currentParticipants[1]]; // Q1
        bot2 = [currentParticipants[2], currentParticipants[3]]; // Eliminator
      } else {
        // Fallback if not exactly 4 (e.g. testing)
        top2 = [
          { id: `TBD_1_${phase.id}`, name: 'Qualifier 1 Team A' },
          { id: `TBD_2_${phase.id}`, name: 'Qualifier 1 Team B' }
        ];
        bot2 = [
          { id: `TBD_3_${phase.id}`, name: 'Eliminator Team A' },
          { id: `TBD_4_${phase.id}`, name: 'Eliminator Team B' }
        ];
      }

      // Qualifier 1 (Round 1)
      const q1 = createMatchTemplate(globalRoundOffset + 1, posCount++, phase.id);
      q1.name = 'Qualifier 1';
      q1.teamAId = top2[0].id;
      q1.teamAName = top2[0].name;
      q1.teamBId = top2[1].id;
      q1.teamBName = top2[1].name;

      // Eliminator (Round 1)
      const elim = createMatchTemplate(globalRoundOffset + 1, posCount++, phase.id);
      elim.name = 'Eliminator';
      elim.teamAId = bot2[0].id;
      elim.teamAName = bot2[0].name;
      elim.teamBId = bot2[1].id;
      elim.teamBName = bot2[1].name;

      // Qualifier 2 (Round 2)
      // Loser of Q1 vs Winner of Eliminator
      const q2 = createMatchTemplate(globalRoundOffset + 2, posCount++, phase.id);
      q2.name = 'Qualifier 2';
      q2.teamAId = `TBD_L_${q1.id}`;
      q2.teamAName = `Loser of Qualifier 1`;
      q2.teamBId = `TBD_W_${elim.id}`;
      q2.teamBName = `Winner of Eliminator`;
      
      // Link Elim winner to Q2
      elim.nextMatchId = q2.id;
      // Note: We can't easily auto-link Q1 loser without custom propagation logic, so we use string placeholders.

      // Final (Round 3)
      // Winner of Q1 vs Winner of Q2
      const finalMatch = createMatchTemplate(globalRoundOffset + 3, posCount++, phase.id);
      finalMatch.name = 'Final';
      finalMatch.teamAId = `TBD_W_${q1.id}`;
      finalMatch.teamAName = `Winner of Qualifier 1`;
      finalMatch.teamBId = `TBD_W_${q2.id}`;
      finalMatch.teamBName = `Winner of Qualifier 2`;

      q1.nextMatchId = finalMatch.id;
      q2.nextMatchId = finalMatch.id;

      matches.push(q1, elim, q2, finalMatch);
      globalRoundOffset += 3;
    }

    // Set up participants for the NEXT phase based on teamsAdvancing
    if (phase.teamsAdvancing > 0) {
      // If we have multiple pool phases back-to-back, we need to ACCUMULATE participants!
      // If the current phase has teamIds (it's a Pool), we shouldn't wipe out previous pools' advancing teams.
      if (!phase.teamIds || phaseIdx === 0) {
        currentParticipants = [];
      }
      for (let i = 1; i <= phase.teamsAdvancing; i++) {
        // Placeholders for the next phase
        // e.g. TBD_1_phase_1, name: "1st Place (Phase 1)"
        currentParticipants.push({
          id: `TBD_${i}_${phase.id}`,
          name: `${i}${i===1?'st':i===2?'nd':i===3?'rd':'th'} Place (${phase.name})`
        });
      }
    }
  }

  return matches;
};
