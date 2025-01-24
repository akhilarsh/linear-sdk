import { addDays, startOfDay, endOfDay } from 'date-fns';
import { logger } from './logger';
import { cycleEndDate, cycleStartDate } from './linearClient';

export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCurrentCycleDate() {
  // Calculate the current two-week cycle
  const baseDate = new Date('2024-12-16'); // Starting point of the cycles
  const today = new Date();
  const daysSinceBase = Math.floor((today.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
  const cycleNumber = Math.floor(daysSinceBase / 14) - 1;
  logger.info(`Cycle number: ${cycleNumber}`);
  logger.info(`Days since base: ${daysSinceBase}`);
  logger.info(`cycleStartDate in .env: ${cycleStartDate}`);

  // Calculate current cycle dates
  const cycleStart = cycleStartDate
    ? new Date(cycleStartDate)
    : startOfDay(addDays(baseDate, cycleNumber * 14));
  const cycleEnd = cycleEndDate ? new Date(cycleEndDate) : endOfDay(addDays(cycleStart, 13)); // 14 days - 1
  logger.info(`Cycle start: ${cycleStart}`);
  logger.info(`Cycle end: ${cycleEnd}`);
  return { cycleStart, cycleEnd };
}
