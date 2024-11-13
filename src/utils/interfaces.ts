import { Document } from 'mongoose';
import { MESSAGE_STATUS } from './constants';

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  birthday: Date;
  location: string;
  nextBirthdayNotification: Date;
  messageStatus: typeof MESSAGE_STATUS[keyof typeof MESSAGE_STATUS];
}

export type MessageType = 'birthday' | 'anniversary';