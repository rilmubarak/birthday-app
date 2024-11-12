import User from '../models/User';
import { IUser } from '../utils/interfaces';
import { MESSAGE_STATUS } from "../utils/constants";
import { calculateNextBirthdayNotification } from '../utils/calculateNotification';

class UserService {
  static async createUser(userData: any): Promise<IUser> {
    const nextBirthdayNotification = calculateNextBirthdayNotification(userData.birthday, userData.location);
    const user = new User({
      ...userData,
      nextBirthdayNotification,
      messageStatus: MESSAGE_STATUS.PENDING,
    });
    return await user.save();
  }

  static async updateUser(userId: string, userData: any): Promise<IUser | null> {
    const user = await User.findById(userId);
    if (!user) {
      return null;
    }
    
    const nextBirthdayNotification = calculateNextBirthdayNotification(userData.birthday, userData.location);
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        ...userData,
        nextBirthdayNotification,
        messageStatus: MESSAGE_STATUS.PENDING,
      },
      { new: true }
    );
    return updatedUser;
  }

  static async deleteUser(userId: string): Promise<IUser | null> {
    const user = await User.findByIdAndDelete(userId);
    return user;
  }
}

export default UserService;
