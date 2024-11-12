import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import UserService from '../services/UserService';

class UserController {
  static async createUser(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }
      const user = await UserService.createUser(req.body);
      res.status(201).json(user);
    } catch (err:any) {
      res.status(500).json({ error: 'Server Error' });
    }
  }

  static async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }
      const userId = req.params.id;
      const user = await UserService.updateUser(userId, req.body);
      
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return 
      }

      res.status(200).json(user);
    } catch (err:any) {
      res.status(500).json({ error: 'Server Error' });
    }
  }

  static async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.id;
      const user = await UserService.deleteUser(userId);
      
      if (!user) {
        res.status(404).send({ error: "User not found" });
        return 
      }
      
      res.status(200).json({ message: 'User deleted successfully' });
    } catch (err:any) {
      res.status(500).json({ error: 'Server Error' });
    }
  }
}

export default UserController;
