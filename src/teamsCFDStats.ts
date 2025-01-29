import { formatDate, getCurrentCycleDate } from './date';
import { linearClient } from './linearClient';
import { logger } from './logger';
import { postCfdReportToSlack } from './slack';
interface TeamIssuesCount {
  team: string;
  Urgent: number;
  High: number;
  Medium: number;
  Low: number;
  'No Priority': number;
  total: number;
}

export async function getCfdByTeamAndPriority(projectName: string) {
  try {
    if (!projectName) {
      throw new Error('Project name is required');
    }

    // get the current two-week cycle
    const { cycleStart, cycleEnd } = getCurrentCycleDate();
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
    const urgentAndHighLinks: Record<string, string[]> = { Urgent: [], High: [] };

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

      // Collect links for urgent and high priority issues
      if (priorityLabel === 'Urgent' || priorityLabel === 'High') {
        urgentAndHighLinks[priorityLabel].push(issue.url);
      }
    }
    const results = formatCfdMapAsRecord(teamStats);

    return {
      dateRange: {
        from: cycleStart,
        to: cycleEnd,
      },
      stats: results,
      links: urgentAndHighLinks,
    };
  } catch (error) {
    logger.error('Error fetching Linear issues:', error);
    throw error;
  }
}

function countIssueByTeam(data: Record<string, Record<string, number>>): Record<string, number> {
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

function formatCfdMapAsRecord(teamStats: Map<string, TeamIssuesCount>) {
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
  return results;
}

export function formatCfdRecordAsTable(data: Record<string, Record<string, number>>): string {
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
  const totalCounts = countIssueByTeam(data);
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

export function listUrgentAndHighCfds(links: Record<string, string[]>) {
  const urgentLinks = links.Urgent || [];
  const highPriorityLinks = links.High || [];
  const formatLinks = (links: string[]) => {
    return links.length > 0 ? links.join('\n') : 'None';
  };

  const urgentAndHighLinks = `
Urgent Issues:
${formatLinks(urgentLinks)}

High Priority Issues:
${formatLinks(highPriorityLinks)}
`;
  return urgentAndHighLinks;
}

export async function prepareCfdReport(projectName: string) {
  try {
    const yourTableData = await getCfdByTeamAndPriority(projectName);
    const reportData = formatCfdRecordAsTable(yourTableData.stats);
    const urgentAndHighLinks = listUrgentAndHighCfds(yourTableData.links);
    const fromDate = formatDate(yourTableData.dateRange.from);
    const toDate = formatDate(yourTableData.dateRange.to);

    // Format the data for Slack
    const slackMessage = `
    *Bi-Weekly CFD Report (${fromDate} - ${toDate})*
\`\`\`
${reportData}
\`\`\`
*Urgent and High Priority Issue Links:*
\`\`\`
${urgentAndHighLinks}
\`\`\`
`;
    logger.info(`Project: ${projectName}`);
    logger.info(`Date Range: ${fromDate} to ${toDate}`);
    logger.info('CFDs by Team and Priority:');
    logger.info('\n' + slackMessage);

    await postCfdReportToSlack(slackMessage);
  } catch (error) {
    logger.error('Failed to fetch issue statistics:', error);
  }
}
