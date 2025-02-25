import axios from 'axios';
import { logger } from './logger';

export async function postToSlack(message: string, webhookUrl?: string) {
  try {
    const slackWebhookUrl = webhookUrl || process.env.SLACK_WEBHOOK_TRR_QA_BOT;
    if (!slackWebhookUrl) {
      throw new Error('Slack webhook URL not found in environment variables');
    }

    const payload = {
      text: message,
      name: 'Linear CFD Bot',
    };

     await axios.post(slackWebhookUrl, payload);
    logger.info('Message posted to Slack successfully');
  } catch (error) {
      logger.error('Error posting to Slack:', error);
    throw error;
  }
}

export async function postCfdReportToSlack(slackMessage: string,) {
  // Check if this is a scheduled run
  const isScheduledRun = process.env.GITHUB_EVENT_NAME === 'schedule';
  const postToSlackEnv = process.env.POST_TO_SLACK === 'Y';

  if (isScheduledRun && postToSlackEnv) {
    logger.debug('Scheduled run detected - posting to Slack');
    logger.debug(slackMessage);
    const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
    await postToSlack(slackMessage, slackWebhookUrl);
  } else if (!isScheduledRun && postToSlackEnv) {
    logger.debug('Non-scheduled run -posting to testinqabot');
    await postToSlack(slackMessage);
  } else {
    logger.debug('Slack posting is disabled by POST_TO_SLACK environment variable');
  }
}
