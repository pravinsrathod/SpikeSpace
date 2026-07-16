import { generateDynamicTournament } from './src/utils/tournamentGenerator.js';

const teams = [
  { id: 't1', name: 'Team 1' },
  { id: 't2', name: 'Team 2' },
  { id: 't3', name: 'Team 3' },
  { id: 't4', name: 'Team 4' }
];

const phases = [
  { id: 'p1', name: 'Group Stage', type: 'ROUND_ROBIN', teamsAdvancing: 4 }
];

console.log('Matches length:', generateDynamicTournament('tourney1', teams as any, phases as any).length);
