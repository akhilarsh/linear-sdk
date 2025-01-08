import axios from 'axios';
import { logger } from './logger';

export async function postToSlack(message: string, webhookUrl?: string) {
  try {
    const slackWebhookUrl = webhookUrl || process.env.SLACK_WEBHOOK_TRR_QA_BOT;
    if (!slackWebhookUrl) {
      throw new Error('Slack webhook URL not found in environment variables');
    }

    await axios.post(slackWebhookUrl, {
      text: message,
    });
    logger.info('Message posted to Slack successfully');
  } catch (error) {
    if (process.env.GITHUB_EVENT_NAME === 'schedule') {
      // Only throw error for scheduled runs
      logger.error('Error posting to Slack:', error);
      throw error;
    } else {
      // Just log the error for non-scheduled runs
      logger.warn('Slack posting skipped or failed (non-scheduled run)');
    }
  }
}

