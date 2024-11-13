import mongoose, { Schema } from 'mongoose';
import { IUser } from '../utils/interfaces';
import { MESSAGE_STATUS } from '../utils/constants';

const UserSchema: Schema = new Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  birthday: { type: Date, required: true },
  location: { type: String, required: true },
  nextBirthdayNotification: { type: Date, required: true },
  messageStatus: {
    type: String,
    enum: Object.values(MESSAGE_STATUS),
    default: MESSAGE_STATUS.PENDING,
  }
});

UserSchema.index({ nextBirthdayNotification: 1, messageStatus: 1 });

export default mongoose.model<IUser>('User', UserSchema);
