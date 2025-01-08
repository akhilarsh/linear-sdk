import { linearClient } from './linearClient';
import { logger } from './logger';

async function getMyIssues() {
  const me = await linearClient.viewer;
  const myIssues = await me.assignedIssues();

  if (myIssues.nodes.length) {
    myIssues.nodes.map((issue) => logger.debug(`${me.displayName} has issue: ${issue.title}`));
  } else {
    logger.debug(`${me.displayName} has no issues`);
  }
}

getMyIssues();
