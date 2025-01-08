import { getIssuesByTeamAndPriority, formatAsTable } from './teamsCFDStats';
import { formatDate } from './date';
import { postToSlack } from './slack';
import { logger } from './logger';

async function main() {
  try {
    const yourTableData = await getIssuesByTeamAndPriority('CFD');
    const reportData = formatAsTable(yourTableData.stats)
    const fromDate = formatDate(yourTableData.dateRange.from);
    const toDate = formatDate(yourTableData.dateRange.to);

    // Format the data for Slack
    const slackMessage = `
    Bi-Weekly CFD Report (${fromDate} - ${toDate})
\`\`\`
${reportData}
\`\`\`
`;
    // Check if this is a scheduled run
    const isScheduledRun = process.env.GITHUB_EVENT_NAME === 'schedule';

    if (isScheduledRun) {
      logger.debug('Scheduled run detected - posting to Slack');
      logger.debug(slackMessage);
      const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
      await postToSlack(slackMessage, slackWebhookUrl);
    } else {
      logger.debug('Non-scheduled run -posting to testinqabot');
      await postToSlack(slackMessage);
      logger.debug(slackMessage);
    }

  } catch (error) {
    logger.error('Failed to fetch issue statistics:', error);
  }
}

main();

