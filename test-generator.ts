import { generateDynamicTournament } from './src/utils/tournamentGenerator';

const teams = [
  { id: '1', name: 'Team A' },
  { id: '2', name: 'Team B' },
  { id: '3', name: 'Team C' },
  { id: '4', name: 'Team D' },
  { id: '5', name: 'Team E' }
] as any[];

const finalPhases = [
  { id: 'phase1', name: 'Group Stage', type: 'ROUND_ROBIN', teamsAdvancing: 4 },
  { id: 'phase2', name: 'Playoffs', type: 'PAGE_PLAYOFFS', teamsAdvancing: 0 }
] as any[];

const matches = generateDynamicTournament('test_tournament', teams, finalPhases);
console.log(matches.length, "matches generated");
console.log("Phase 1 matches:", matches.filter(m => m.phaseId === 'phase1').length);
console.log("Phase 2 matches:", matches.filter(m => m.phaseId === 'phase2').length);
