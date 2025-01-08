import { cycleEndDate, cycleStartDate, linearClient } from './linearClient';
import { logger } from './logger';
import { startOfDay, endOfDay, addDays } from 'date-fns';

interface TeamIssuesCount {
  team: string;
  Urgent: number;
  High: number;
  Medium: number;
  Low: number;
  'No Priority': number;
  total: number;
}

export async function getIssuesByTeamAndPriority(projectName: string) {
  try {
    if (!projectName) {
      throw new Error('Project name is required');
    }

    // Calculate the current two-week cycle
    const baseDate = new Date('2024-12-16'); // Starting point of the cycles
    const today = new Date();
    const daysSinceBase = Math.floor(
      (today.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const cycleNumber = Math.floor(daysSinceBase / 14);
    logger.info(`Cycle number: ${cycleNumber}`);
    logger.info(`Days since base: ${daysSinceBase}`);

    // Calculate current cycle dates
    const cycleStart = cycleStartDate ? new Date(cycleStartDate) : startOfDay(addDays(baseDate, cycleNumber * 14));
    const cycleEnd = cycleEndDate ? new Date(cycleEndDate) : endOfDay(addDays(cycleStart, 13)); // 14 days - 1

    // Fetch issues with specific filters
    const issues = await linearClient.issues({
      filter: {
        and: [
          { project: { name: { eq: projectName } } },
          {
            createdAt: {
              gte: cycleStart.toISOString(),
              lte: cycleEnd.toISOString(),
            },
          },
          {
            state: {
              name: {
                nin: ['Duplicate', 'Cancelled', 'Not Applicable', 'No Work Required', "Won't Do"],
              },
            },
          },
          {
            labels: {
              name: {
                in: ['CFD'],
              },
            },
          },
        ],
      },
    });

    // Create a map to store team and priority counts
    const teamStats = new Map<string, TeamIssuesCount>();

    // Process all issues
    for (const issue of issues.nodes) {
      const teamName = (await issue.team)?.name || 'Unassigned';
      const priorityLabel = issue.priorityLabel || 'No Priority';

      if (!teamStats.has(teamName)) {
        teamStats.set(teamName, {
          team: teamName,
          Urgent: 0,
          High: 0,
          Medium: 0,
          Low: 0,
          'No Priority': 0,
          total: 0,
        });
      }

      const teamStat = teamStats.get(teamName)!;
      // teamStat.set(priorityLabel, (teamStat.get(priorityLabel) || 0) + 1);
      teamStat[priorityLabel] += 1;
      teamStat.total += 1;
    }

    // Format and return the results
    const results = Array.from(teamStats.values()).reduce(
      (acc, stat) => {
        acc[stat.team] = {
          Urgent: stat.Urgent,
          High: stat.High,
          Medium: stat.Medium,
          Low: stat.Low,
          'No Priority': stat['No Priority'],
          Total: stat.total,
        };
        return acc;
      },
      {} as Record<string, Record<string, number>>,
    );

    logger.info(`Project: ${projectName}`);
    logger.info(`Date Range: ${cycleStart} to ${cycleEnd}`);
    logger.info('\nIssues by Team and Priority:');
    logger.info('\n' + formatAsTable(results));

    return {
      dateRange: {
        from: cycleStart,
        to: cycleEnd
      },
      stats: results,
    };
  } catch (error) {
    logger.error('Error fetching Linear issues:', error);
    throw error;
  }
}

function calculateTotalCounts(
  data: Record<string, Record<string, number>>,
): Record<string, number> {
  const totals = {
    Urgent: 0,
    High: 0,
    Medium: 0,
    Low: 0,
    'No Priority': 0,
    Total: 0,
  };

  Object.values(data).forEach((teamCounts) => {
    totals.Urgent += teamCounts.Urgent || 0;
    totals.High += teamCounts.High || 0;
    totals.Medium += teamCounts.Medium || 0;
    totals.Low += teamCounts.Low || 0;
    totals['No Priority'] += teamCounts['No Priority'] || 0;
    totals.Total += teamCounts.Total || 0;
  });

  return totals;
}

export function formatAsTable(data: Record<string, Record<string, number>>): string {
  const headers = ['Team', 'Urgent', 'High', 'Medium', 'Low', 'No Priority', 'Total'];
  const rows = Object.entries(data).map(([team, counts]) => [
    team,
    counts.Urgent,
    counts.High,
    counts.Medium,
    counts.Low,
    counts['No Priority'],
    counts.Total,
  ]);

  // Calculate and add total row
  const totalCounts = calculateTotalCounts(data);
  const totalRow = [
    'Total',
    totalCounts.Urgent,
    totalCounts.High,
    totalCounts.Medium,
    totalCounts.Low,
    totalCounts['No Priority'],
    totalCounts.Total,
  ];

  // Add total row to rows array
  rows.push(totalRow);

  // Calculate column widths
  const colWidths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => String(r[i]).length)),
  );

  // Create separator line
  const separator = '+-' + colWidths.map((w) => '-'.repeat(w)).join('-+-') + '-+';

  // Format headers
  const headerRow = '| ' + headers.map((h, i) => h.padEnd(colWidths[i])).join(' | ') + ' |';

  // Format data rows
  const dataRows = rows.map(
    (row) => '| ' + row.map((cell, i) => String(cell).padEnd(colWidths[i])).join(' | ') + ' |',
  );

  // Add separator before total row
  const totalSeparatorIndex = dataRows.length - 1;
  dataRows.splice(totalSeparatorIndex, 0, separator);

  return [separator, headerRow, separator, ...dataRows, separator].join('\n');
}
