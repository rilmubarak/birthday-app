import axios from 'axios';
import { delay } from '../utils/helper';
import { IUser, MessageType } from '../utils/interfaces';
import { CONCURRENCY_LIMIT, EMAIL_SERVICE_URL, MESSAGE_STATUS } from '../utils/constants';
import { calculateNextBirthdayNotification } from '../utils/calculateNotification';

export const sendMessage = async (user: IUser, messageType: MessageType) => {
  const maxRetries = 3;
  let attempt = 0;
  let success = false;

  const message = generateMessage(user, messageType);

  const delays = [30000, 60000, 120000]; // 30s, 60s, 120s

  while (attempt < maxRetries && !success) {
    try {
      const response = await axios.post(
        EMAIL_SERVICE_URL,
        {
          email: user.email,
          message,
        },
        { timeout: 5000 }
      );

      if (response.status === 200) {
        success = true;

        // Update user message status
        user.messageStatus = MESSAGE_STATUS.SENT;

        // Calculate next birthday notification
        user.nextBirthdayNotification = calculateNextBirthdayNotification(
          user.birthday,
          user.location
        );
        await user.save();

        console.log('Message sent successfully:', response.data);
      } else if (response.status >= 400 && response.status < 500) {
        // Client error, do not retry
        user.messageStatus = MESSAGE_STATUS.FAILED_PERMANENT;
        await user.save();
        console.error(
          `Permanent failure sending message to user ${user.email}:`,
          `Unexpected response status: ${response.status}`
        );
        return;
      } else {
        // Server error or other non-200 response, retry
        throw new Error(`Unexpected response status: ${response.status}`);
      }
    } catch (err: any) {
      attempt++;
      const statusCode = err.response?.status;

      if (statusCode && statusCode >= 400 && statusCode < 500) {
        // Client error, do not retry
        user.messageStatus = MESSAGE_STATUS.FAILED_PERMANENT;
        await user.save();
        console.error(
          `Permanent failure sending message to user ${user.email}:`,
          err.message
        );
        return;
      } else if (attempt >= maxRetries) {
        // Max retries exceeded
        user.messageStatus = MESSAGE_STATUS.FAILED;
        await user.save();
        console.error(
          `Failed to send message to user ${user.email} after ${maxRetries} attempts.`
        );
      } else {
        console.error(
          `Error sending message to user ${user.email} (attempt ${attempt}):`,
          err.message
        );
        // Exponential backoff
        const delayTime = delays[attempt - 1] || 120000; // Use 120s if attempt exceeds
        await delay(delayTime);
      }
    }
  }
};

// Generates the message content based on the message type and user data.
export const generateMessage = (user: IUser, messageType: MessageType): string => {
  switch (messageType) {
    case 'birthday':
      return `Hey, ${user.firstName} ${user.lastName}, it’s your birthday`;
    case 'anniversary':
      return `Happy Anniversary, ${user.firstName} ${user.lastName}!`;
    default:
      return '';
  }
};

// Function to send messages to users in batches with concurrency control.
export const sendMessagesInBatches = async (users: IUser[], messageType: MessageType): Promise<void> => {
  let index = 0;

  while (index < users.length) {
    const batch = users.slice(index, index + CONCURRENCY_LIMIT);
    index += CONCURRENCY_LIMIT;

    await Promise.all(
      batch.map(async (user: IUser) => {
        try {
          await sendMessage(user, messageType);
        } catch (err) {
          console.error(`Failed to send message to ${user.email}:`, err);
        }
      })
    );
  }
};
