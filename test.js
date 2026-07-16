const { v4: uuidv4 } = require('uuid');

const generateDynamicTournament = (tournamentId, teams, phases) => {
  if (teams.length < 2 || phases.length === 0) return [];
  
  const matches = [];
  let posCount = 0;
  let globalRoundOffset = 0;

  const createMatchTemplate = (r, pos, phaseId) => ({
    id: 'm-' + posCount,
    tournamentId,
    teamAId: null, teamBId: null, teamAName: 'TBD', teamBName: 'TBD',
    round: r, position: pos, phaseId, nextMatchId: null, status: 'PENDING'
  });

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
            m.teamAId = tA.id; m.teamBId = tB.id;
            m.teamAName = tA.name; m.teamBName = tB.name;
            roundMatches.push(m);
          }
        }
        phaseMatchesByRound.push(roundMatches);
        players.splice(1, 0, players.pop());
      }

      for (const roundMatches of phaseMatchesByRound) {
        for (const m of roundMatches) {
          m.position = posCount++;
          matches.push(m);
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
        top2 = [{ id: 'TBD1', name: 'Q1A' }, { id: 'TBD2', name: 'Q1B' }];
        bot2 = [{ id: 'TBD3', name: 'ElimA' }, { id: 'TBD4', name: 'ElimB' }];
      }

      const q1 = createMatchTemplate(globalRoundOffset + 1, posCount++, phase.id);
      q1.teamAName = top2[0].name; q1.teamBName = top2[1].name;
      const elim = createMatchTemplate(globalRoundOffset + 1, posCount++, phase.id);
      elim.teamAName = bot2[0].name; elim.teamBName = bot2[1].name;
      const q2 = createMatchTemplate(globalRoundOffset + 2, posCount++, phase.id);
      q2.teamAName = 'Loser Q1'; q2.teamBName = 'Winner Elim';
      const finalMatch = createMatchTemplate(globalRoundOffset + 3, posCount++, phase.id);
      finalMatch.teamAName = 'Winner Q1'; finalMatch.teamBName = 'Winner Q2';
      
      matches.push(q1, elim, q2, finalMatch);
      globalRoundOffset += 3;
    }

    if (phase.teamsAdvancing > 0) {
      if (!phase.teamIds || phaseIdx === 0) {
        currentParticipants = [];
      }
      for (let i = 1; i <= phase.teamsAdvancing; i++) {
        currentParticipants.push({
          id: 'TBD_' + i, name: i + ' Place'
        });
      }
    }
  }
  return matches;
};

const teams = [{id: '1', name: 'A'}, {id: '2', name: 'B'}, {id: '3', name: 'C'}, {id: '4', name: 'D'}, {id: '5', name: 'E'}];
const phases = [
  { id: 'p1', type: 'ROUND_ROBIN', teamsAdvancing: 4 },
  { id: 'p2', type: 'PAGE_PLAYOFFS', teamsAdvancing: 0 }
];
const result = generateDynamicTournament('t1', teams, phases);
console.log(result.length, "total matches");
console.log(JSON.stringify(result, null, 2));
