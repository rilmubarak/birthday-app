import * as cron from 'node-cron';
import { ScheduledTask } from 'node-cron';
import User from '../models/User';
import * as messageModule from '../services/messageService';
import * as schedulerModule from '../utils/scheduler';
import { MESSAGE_STATUS } from '../utils/constants';

jest.mock('axios');

jest.mock('node-cron', () => ({
  schedule: jest.fn().mockImplementation((cronExpression: string, func: () => void): ScheduledTask => {
    const mockTask: Partial<ScheduledTask> = { start: jest.fn(), stop: jest.fn() };
    func();
    return mockTask as ScheduledTask;
  }),
}));

const mockUser = {
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  birthday: new Date('1990-01-01T09:00:00Z'),
  messageStatus: MESSAGE_STATUS.PENDING,
  nextBirthdayNotification: new Date(),
  save: jest.fn(),
};

const setupConsoleMocks = () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
};

describe('Birthday Message Scheduler Tests', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    setupConsoleMocks();

    jest.spyOn(messageModule, 'sendMessage').mockImplementation(() => Promise.resolve());
    jest.spyOn(User, 'find').mockReturnValue({
      exec: jest.fn().mockResolvedValue([mockUser]),
    } as any);
  });

  it('schedules and triggers sending birthday messages', async () => {
    const cronScheduleSpy = jest.spyOn(cron, 'schedule');

    schedulerModule.startBirthdayMessageScheduler();

    expect(cronScheduleSpy).toHaveBeenCalledWith('* * * * *', expect.any(Function));

    const scheduledFunction = (cron.schedule as jest.Mock).mock.calls[0][1];
    await scheduledFunction();

    expect(messageModule.sendMessage).toHaveBeenCalledWith(expect.objectContaining({
      email: mockUser.email,
      firstName: mockUser.firstName,
      lastName: mockUser.lastName,
    }), 'birthday');
  });

  it('handles errors when User.find throws', async () => {
    const error = new Error('Database connection failed');
    (User.find as jest.Mock).mockReturnValue({ exec: jest.fn().mockRejectedValue(error) });
    const consoleErrorSpy = jest.spyOn(console, 'error');

    schedulerModule.startBirthdayMessageScheduler();
    const scheduledFunction = (cron.schedule as jest.Mock).mock.calls[0][1];
    await scheduledFunction();

    expect(consoleErrorSpy).toHaveBeenCalledWith('Error in birthday scheduler:', error);
  });
});

describe('Recovery of Unsent Messages Scheduler Tests', () => {
  const failedUser = { ...mockUser, messageStatus: MESSAGE_STATUS.FAILED, email: 'user1@gmail.com' };
  const pendingUser = { ...mockUser, messageStatus: MESSAGE_STATUS.PENDING, email: 'user2@gmail.com' };

  beforeEach(() => {
    jest.clearAllMocks();
    setupConsoleMocks();

    jest.spyOn(messageModule, 'sendMessage').mockImplementation(() => Promise.resolve());
    jest.spyOn(User, 'find').mockReturnValue({
      exec: jest.fn().mockResolvedValue([failedUser, pendingUser]),
    } as any);
  });

  it('attempts to resend unsent messages', async () => {
    schedulerModule.startRecoverUnsentMessageScheduler();
    await new Promise(process.nextTick);

    expect(messageModule.sendMessage).toHaveBeenCalledTimes(2);
    expect(messageModule.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ email: failedUser.email }),
      'birthday'
    );
    expect(messageModule.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ email: pendingUser.email }),
      'birthday'
    );
  });

  it('handles errors when User.find throws during recovery', async () => {
    const error = new Error('Database connection failed');
    (User.find as jest.Mock).mockReturnValue({ exec: jest.fn().mockRejectedValue(error) });
    const consoleErrorSpy = jest.spyOn(console, 'error');

    schedulerModule.startRecoverUnsentMessageScheduler();
    const scheduledFunction = (cron.schedule as jest.Mock).mock.calls[0][1];
    await scheduledFunction();

    expect(consoleErrorSpy).toHaveBeenCalledWith('Error in unsent message recovery scheduler:', error);
  });
});
