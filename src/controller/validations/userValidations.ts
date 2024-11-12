import { body } from "express-validator";
import moment from "moment-timezone";

const create = [
  body("firstName").notEmpty().trim().withMessage("First name is required."),
  body("lastName").notEmpty().trim().withMessage("Last name is required."),
  body("email").isEmail().withMessage("Enter a valid email address."),
  body("birthday")
    .notEmpty()
    .withMessage('Birthday is required.')
    .isISO8601()
    .withMessage("Birthday must be in ISO 8601 format.")
    .custom((value) => {
      if (moment(value).isAfter(moment())) {
        throw new Error('Birthday cannot be a future date.');
      }
      return true;
    }),
  body('location')
    .notEmpty()
    .isString()
    .withMessage('Location is required')
    .custom((value) => {
      if (!moment.tz.zone(value)) {
        throw new Error('Invalid timezone format.');
      }
      return true;
    }),
];

const update = [
  body("firstName").optional().notEmpty().trim().withMessage("First name is required."),
  body("lastName").optional().notEmpty().trim().withMessage("Last name is required."),
  body("email").optional().isEmail().withMessage("Enter a valid email address."),
  body("birthday")
    .optional()
    .isISO8601()
    .withMessage("Birthday must be in ISO 8601 format.")
    .custom((value) => {
      if (moment(value).isAfter(moment())) {
        throw new Error('Birthday cannot be a future date.');
      }
      return true;
    }),
  body("location")
    .optional()
    .isString()
    .custom((value) => {
      if (!moment.tz.zone(value)) {
        throw new Error('Invalid timezone format.');
      }
      return true;
    }),
];

export const userValidations = { create, update };
