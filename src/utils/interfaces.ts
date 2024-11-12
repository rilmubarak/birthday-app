import { Document } from 'mongoose';

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  birthday: Date;
  location: string;
  nextBirthdayNotification: Date;
  messageStatus: 'PENDING' | 'SENT' | 'FAILED' | 'FAILED_PERMANENT';
  notificationType?: 'birthday' | 'anniversary' | 'all';
}
