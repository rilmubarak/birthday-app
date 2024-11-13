import axios from 'axios';
import mongoose from 'mongoose';
import * as messageModule from '../services/messageService';
import { delay } from '../utils/helper';
import { ScheduledTask } from 'node-cron';
import { EMAIL_SERVICE_URL, MESSAGE_STATUS } from '../utils/constants';
import { IUser, MessageType } from '../utils/interfaces';

jest.mock('axios');

jest.mock('node-cron', () => ({
  schedule: jest
    .fn()
    .mockImplementation(
      (
        cronExpression: string,
        func: () => void,
        options?: any
      ): ScheduledTask => {
        const mockTask: Partial<ScheduledTask> = {
          start: jest.fn(),
          stop: jest.fn(),
        };
        func();
        return mockTask as ScheduledTask;
      }
    ),
}));

jest.mock('../utils/helper', () => ({
  delay: jest.fn(() => Promise.resolve()),
}));

mongoose.set('strictQuery', true);

describe('Send Birthday Message Tests', () => {
  const user = {
    email: 'test.user@gmail.com',
    firstName: 'Test',
    lastName: 'User',
    messageStatus: MESSAGE_STATUS.PENDING,
    birthday: new Date('1990-01-01T09:00:00Z'),
    location: 'Asia/Jakarta',
    save: jest.fn(() => Promise.resolve()),
  };

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('successfully sends a birthday message', async () => {
    const mockUser = {
      email: 'test.user@gmail.com',
      firstName: 'Test',
      lastName: 'User',
      messageStatus: MESSAGE_STATUS.PENDING,
      birthday: new Date('1990-01-01T09:00:00Z'),
      location: 'Asia/Jakarta',
      save: jest.fn(() => Promise.resolve()),
    };

    (axios.post as jest.Mock).mockResolvedValue({
      status: 200,
      data: 'Message sent',
    });

    await messageModule.sendMessage(mockUser as any, 'birthday');

    expect(axios.post).toHaveBeenCalledWith(
      EMAIL_SERVICE_URL,
      {
        email: mockUser.email,
        message: `Hey, Test User, it’s your birthday`,
      },
      { timeout: 5000 }
    );
    expect(mockUser.save).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith(
      'Message sent successfully:',
      'Message sent'
    );
  });

  it('sets message status to FAILED_PERMANENT on unsuccessful HTTP status', async () => {
    const mockUser = {
      email: 'test.user@gmail.com',
      firstName: 'Test',
      lastName: 'User',
      messageStatus: MESSAGE_STATUS.PENDING,
      birthday: new Date('1990-01-01T09:00:00Z'),
      location: 'Asia/Jakarta',
      save: jest.fn(() => Promise.resolve()),
    };

    (axios.post as jest.Mock).mockResolvedValue({
      status: 404,
      data: 'Not Found',
    }); // Simulate a 4xx status

    await messageModule.sendMessage(mockUser as any, 'birthday');

    expect(mockUser.messageStatus).toBe(MESSAGE_STATUS.FAILED_PERMANENT);
    expect(mockUser.save).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(
      `Permanent failure sending message to user ${mockUser.email}:`,
      'Unexpected response status: 404'
    );
  });

  it('handles exceptions during the API call', async () => {
    const mockUser = {
      email: 'test.user@gmail.com',
      firstName: 'Test',
      lastName: 'User',
      messageStatus: MESSAGE_STATUS.PENDING,
      birthday: new Date('1990-01-01T09:00:00Z'),
      location: 'Asia/Jakarta',
      save: jest.fn(() => Promise.resolve()),
    };

    // Simulate an error thrown by axios
    (axios.post as jest.Mock).mockRejectedValue(
      Object.assign(new Error('Network Error'), {
        response: { status: 500 },
      })
    );

    await messageModule.sendMessage(mockUser as any, 'birthday');

    expect(mockUser.messageStatus).toBe(MESSAGE_STATUS.FAILED);
    expect(axios.post).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(
      `Error sending message to user ${mockUser.email} (attempt 1):`,
      'Network Error'
    );
  });

  it('successfully sends a message on the first try', async () => {
    (axios.post as jest.Mock).mockResolvedValue({
      status: 200,
      data: 'Message sent',
    });

    await messageModule.sendMessage(user as any, 'birthday');

    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(user.save).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledWith(
      'Message sent successfully:',
      'Message sent'
    );
  });

  it('successfully sends a message on a retry', async () => {
    (axios.post as jest.Mock)
      .mockRejectedValueOnce(
        Object.assign(new Error('Failed to send'), { response: { status: 500 } })
      )
      .mockResolvedValueOnce({ status: 200, data: 'Message sent' });

    await messageModule.sendMessage(user as any, 'birthday');

    expect(axios.post).toHaveBeenCalledTimes(2);
    expect(user.save).toHaveBeenCalledTimes(1);
    expect(delay).toHaveBeenCalledWith(30000);
  });

  it('gives up after max retries', async () => {
    (axios.post as jest.Mock).mockRejectedValue(
      Object.assign(new Error('Failed to send'), { response: { status: 500 } })
    );

    await messageModule.sendMessage(user as any, 'birthday');

    expect(axios.post).toHaveBeenCalledTimes(3);
    expect(user.save).toHaveBeenCalledTimes(1); // Only once when setting status to FAILED
    expect(delay).toHaveBeenCalledTimes(2); // Delay should be called twice
    expect(console.error).toHaveBeenCalledWith(
      `Failed to send message to user ${user.email} after 3 attempts.`
    );
  });
});

describe('generateMessage Function', () => {
  it('generates a birthday message correctly', () => {
    const user = {
      firstName: 'Jane',
      lastName: 'Doe',
    };
    const message = messageModule.generateMessage(user as IUser, 'birthday');
    expect(message).toBe('Hey, Jane Doe, it’s your birthday');
  });

  it('generates an anniversary message correctly', () => {
    const user = {
      firstName: 'Jane',
      lastName: 'Doe',
    };
    const message = messageModule.generateMessage(user as IUser, 'anniversary');
    expect(message).toBe('Happy Anniversary, Jane Doe!');
  });

  it('returns an empty string for invalid message types', () => {
    const user = {
      firstName: 'Jane',
      lastName: 'Doe',
    };
    const message = messageModule.generateMessage(user as IUser, 'invalidType' as MessageType);
    expect(message).toBe('');
  });
});