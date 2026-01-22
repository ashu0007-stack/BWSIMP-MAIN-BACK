import { body, param } from "express-validator";

export const createUserValidation = [
    body("employeeId")
        .trim()
        .notEmpty().withMessage("Employee ID is required")
        .isLength({ max: 10 }).withMessage("Employee ID max 10 characters")
        .isAlphanumeric().withMessage("Employee ID must be alphanumeric"),

    body("email")
        .trim()
        .notEmpty().withMessage("Email is required")
        .isEmail().withMessage("Invalid email format"),

    body("password")
        .notEmpty().withMessage("Password is required")
        .isStrongPassword({
            minLength: 8,
            minLowercase: 1,
            minUppercase: 1,
            minNumbers: 1,
            minSymbols: 1,
        })
        .withMessage(
            "Password must contain uppercase, lowercase, number & special character"
        ),

    body("full_name")
        .optional()
        .trim()
        .isLength({ min: 3 })
        .withMessage("Full name must be at least 3 characters"),

    body("mobno")
        .optional()
        .matches(/^[6-9]\d{9}$/)
        .withMessage("Mobile number must be 10 digits starting with 6-9"),

    body("department_id")
        .notEmpty().withMessage("Department is required")
        .isInt().withMessage("Department must be a valid ID"),

    body("role_id")
        .notEmpty().withMessage("Role is required")
        .isInt().withMessage("Role must be a valid ID"),

    body("designation_id")
        .notEmpty().withMessage("Designation is required")
        .isInt().withMessage("Designation must be a valid ID"),
];



// update validation validations

export const updateMyProfileValidation = [
  body("full_name")
    .optional()
    .trim()
    .isLength({ min: 3 })
    .withMessage("Name must be at least 3 characters"),

  body("mobno")
    .optional()
    .matches(/^[6-9]\d{9}$/)
    .withMessage("Mobile number must be valid"),
];