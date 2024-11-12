import express from 'express';
import UserController from '../controller/UserController';
import { userValidations } from '../controller/validations/userValidations';

const router = express.Router();

router.post('/', userValidations.create, UserController.createUser);
router.put('/:id', userValidations.update, UserController.updateUser);
router.delete('/:id', UserController.deleteUser);

export default router;
