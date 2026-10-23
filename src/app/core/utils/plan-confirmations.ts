import { AttractionSummary } from '../models/attraction.model';
import { ConfirmOptions } from '../services/confirm.service';

/** The dialog shown before a stop is taken out of My Plan, wherever the remove action is. */
export function removeStopConfirmation(
  attraction: AttractionSummary,
  stopNumber: number | undefined,
  stopCount: number,
): ConfirmOptions {
  const position = stopNumber ? `It’s stop ${stopNumber} of ${stopCount} in your plan. ` : '';
  return {
    title: `Remove “${attraction.name}” from My Plan?`,
    message: `${position}You can add it again from Explore at any time.`,
    confirmLabel: 'Remove stop',
    cancelLabel: 'Keep it',
    tone: 'danger',
  };
}
