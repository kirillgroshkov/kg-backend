import { AppError } from '@src/error/app.error'
import { ValidationError } from 'class-validator'

export class AppValidationError extends AppError {
  constructor (
    message: string,
    public validationErrors: ValidationError[] = [],
  ) {
    super(message)
  }
}
