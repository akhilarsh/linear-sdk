import { getIssuesByTeamAndPriority } from './teamsCFDStats';

async function main() {
  try {
    await getIssuesByTeamAndPriority('CFD');
  } catch (error) {
    console.error('Failed to fetch issue statistics:', error);
  }
}

main();

