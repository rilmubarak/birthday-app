import cron from 'node-cron';
import User from '../models/User';
import { IUser } from '../utils/interfaces';
import { MESSAGE_STATUS, TIME_WINDOW_MS } from '../utils/constants';
import { sendMessagesInBatches } from '../services/messageService';

// Function to start the birthday message scheduler
export const startBirthdayMessageScheduler = () => {
  cron.schedule('* * * * *', async () => {
    const nowUTC = new Date();
    const windowStart = new Date(nowUTC.getTime() - TIME_WINDOW_MS);
    const windowEnd = nowUTC;

    try {
      // Fetch users whose nextBirthdayNotification is within the current minute window and are pending
      const users: IUser[] = await User.find({
        messageStatus: MESSAGE_STATUS.PENDING,
        nextBirthdayNotification: { $gte: windowStart, $lte: windowEnd },
      }).exec();

      if (users.length > 0) {
        await sendMessagesInBatches(users, 'birthday');
      }
    } catch (err) {
      console.error('Error in birthday scheduler:', err);
    }
  });
};

// Function to start the unsent message recovery scheduler
export const startRecoverUnsentMessageScheduler = () => {
  cron.schedule('0 0 * * *', async () => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    try {
      // Fetch users with failed or pending messages from the last 24 hours
      const users: IUser[] = await User.find({
        messageStatus: { $in: [MESSAGE_STATUS.FAILED, MESSAGE_STATUS.PENDING] },
        nextBirthdayNotification: { $gte: yesterday, $lte: now },
      }).exec();

      if (users.length > 0) {
        await sendMessagesInBatches(users, 'birthday');
      }
    } catch (err) {
      console.error('Error in unsent message recovery scheduler:', err);
    }
  });
};
