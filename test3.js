import { v4 as uuidv4 } from 'uuid';

const createMatchTemplate = (round, position, phaseId) => ({
  id: uuidv4(),
  teamAId: null,
  teamBId: null,
  teamAName: 'TBD',
  teamBName: 'TBD',
  round,
  position,
  phaseId,
  nextMatchId: null,
  status: 'PENDING',
  setsWonA: 0,
  setsWonB: 0,
});

const getSharedCount = (m1, m2) => {
  let c = 0;
  if (m1.teamAId === m2.teamAId || m1.teamAId === m2.teamBId) c++;
  if (m1.teamBId === m2.teamAId || m1.teamBId === m2.teamBId) c++;
  return c;
};

const generateDynamicTournament = (tournamentId, teams, phases) => {
  if (teams.length < 2 || phases.length === 0) return [];

  const matches = [];
  let globalRoundOffset = 0;
  let posCount = 0;

  let currentParticipants = teams.map(t => ({ id: t.id, name: t.name }));

  for (let phaseIdx = 0; phaseIdx < phases.length; phaseIdx++) {
    const phase = phases[phaseIdx];
    const isFirstPhase = phaseIdx === 0;

    if (phase.teamIds && phase.teamIds.length > 0) {
      currentParticipants = teams
        .filter(t => phase.teamIds.includes(t.id))
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

      const phaseMatchesByRound = [];

      for (let r = 0; r < numRounds; r++) {
        const roundMatches = [];
        for (let i = 0; i < halfSize; i++) {
          const tA = players[i];
          const tB = players[players.length - 1 - i];

          if (tA.id !== 'BYE' && tB.id !== 'BYE') {
            const m = createMatchTemplate(globalRoundOffset + r + 1, 0, phase.id);
            m.tournamentId = tournamentId;
            m.teamAId = tA.id;
            m.teamBId = tB.id;
            m.teamAName = tA.name;
            m.teamBName = tB.name;
            roundMatches.push(m);
          }
        }
        phaseMatchesByRound.push(roundMatches);
        players.splice(1, 0, players.pop());
      }

      for (let r = 0; r < phaseMatchesByRound.length; r++) {
        const currentRound = phaseMatchesByRound[r];
        if (r > 0 && currentRound.length > 0) {
          const prevRound = phaseMatchesByRound[r - 1];
          if (prevRound.length > 0) {
            const lastMatch = prevRound[prevRound.length - 1];
            let bestIdx = 0;
            let minShared = getSharedCount(lastMatch, currentRound[0]);
            for (let i = 1; i < currentRound.length; i++) {
              const c = getSharedCount(lastMatch, currentRound[i]);
              if (c < minShared) {
                minShared = c;
                bestIdx = i;
              }
            }
            if (bestIdx > 0) {
              const temp = currentRound[0];
              currentRound[0] = currentRound[bestIdx];
              currentRound[bestIdx] = temp;
            }
          }
        }
        for (let i = 0; i < currentRound.length; i++) {
          currentRound[i].position = posCount++;
          matches.push(currentRound[i]);
        }
      }
      globalRoundOffset += numRounds;

    } else if (phase.type === 'PAGE_PLAYOFFS') {
      let top2 = [];
      let bot2 = [];
      
      if (currentParticipants.length === 4) {
        top2 = [currentParticipants[0], currentParticipants[1]]; 
        bot2 = [currentParticipants[2], currentParticipants[3]]; 
      } else {
        top2 = [
          { id: `TBD_1_${phase.id}`, name: 'Qualifier 1 Team A' },
          { id: `TBD_2_${phase.id}`, name: 'Qualifier 1 Team B' }
        ];
        bot2 = [
          { id: `TBD_3_${phase.id}`, name: 'Eliminator Team A' },
          { id: `TBD_4_${phase.id}`, name: 'Eliminator Team B' }
        ];
      }

      const q1 = createMatchTemplate(globalRoundOffset + 1, posCount++, phase.id);
      q1.teamAId = top2[0].id;
      q1.teamAName = top2[0].name;
      q1.teamBId = top2[1].id;
      q1.teamBName = top2[1].name;

      const elim = createMatchTemplate(globalRoundOffset + 1, posCount++, phase.id);
      elim.teamAId = bot2[0].id;
      elim.teamAName = bot2[0].name;
      elim.teamBId = bot2[1].id;
      elim.teamBName = bot2[1].name;

      const q2 = createMatchTemplate(globalRoundOffset + 2, posCount++, phase.id);
      q2.teamAId = `TBD_L_${q1.id}`;
      q2.teamAName = `Loser of Qualifier 1`;
      q2.teamBId = `TBD_W_${elim.id}`;
      q2.teamBName = `Winner of Eliminator`;
      
      elim.nextMatchId = q2.id;

      const finalMatch = createMatchTemplate(globalRoundOffset + 3, posCount++, phase.id);
      finalMatch.teamAId = `TBD_W_${q1.id}`;
      finalMatch.teamAName = `Winner of Qualifier 1`;
      finalMatch.teamBId = `TBD_W_${q2.id}`;
      finalMatch.teamBName = `Winner of Qualifier 2`;

      q1.nextMatchId = finalMatch.id;
      q2.nextMatchId = finalMatch.id;

      matches.push(q1, elim, q2, finalMatch);
      globalRoundOffset += 3;
    }

    if (phase.teamsAdvancing > 0) {
      if (!phase.teamIds || phaseIdx === 0) {
        currentParticipants = [];
      }
      for (let i = 1; i <= phase.teamsAdvancing; i++) {
        currentParticipants.push({
          id: `TBD_${i}_${phase.id}`,
          name: `${i}${i===1?'st':i===2?'nd':i===3?'rd':'th'} Place (${phase.name})`
        });
      }
    }
  }

  return matches;
};

const teams = [
  { id: '1', name: 'A' },
  { id: '2', name: 'B' },
  { id: '3', name: 'C' },
  { id: '4', name: 'D' },
  { id: '5', name: 'E' },
];

const phases = [
  { id: 'p1', name: 'Group Stage', type: 'ROUND_ROBIN', teamsAdvancing: 4 },
  { id: 'p2', name: 'Playoffs', type: 'PAGE_PLAYOFFS', teamsAdvancing: 0 }
];

try {
  const matches = generateDynamicTournament('t1', teams, phases);
  console.log("SUCCESS. Matches generated: " + matches.length);
} catch (e) {
  console.error("ERROR GENERATING:", e);
}
