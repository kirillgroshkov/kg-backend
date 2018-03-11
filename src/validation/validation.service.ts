import { validateSync, ValidationError, ValidatorOptions } from 'class-validator'
import { AppValidationError } from 'src/error/app.validation.error'

export class ValidationService {
  validate (obj: any, throwOnError = true, opts?: ValidatorOptions): ValidationError[] {
    if (!obj || typeof obj !== 'object') {
      throw new AppValidationError('Object is undefined or not an object type')
    }

    const errors = validateSync(obj, {
      // skipMissingProperties: true, // this works as automatic @IsOptional() for all fields except @IsDefined()
      ...opts,
    })

    if (throwOnError) this.throwValidationError(errors)

    return errors
  }

  throwValidationError (errors?: ValidationError[], extraMessage?: string): void {
    if (errors && errors.length) {
      throw new AppValidationError(this.getValidationErrorMessage(errors, extraMessage), errors)
    }
  }

  getValidationErrorMessage (errors: ValidationError[], message?: string): string {
    console.log(JSON.stringify(errors, undefined, 2))
    const t = []
    if (message) t.push(message, '')

    if (errors && errors.length) {
      t.push('Invalid object:', JSON.stringify(errors[0].target, undefined, 2), '')

      for (let i = 0; i < errors.length; i++) {
        const e = errors[i]
        t.push(
          `${i + 1}. ${e.property}="${e.value}"`,
          ...Object.values(e.constraints || {}),
          '', // extra \n
        )

        if (e.children.length) {
          t.push(this.getValidationErrorMessage(e.children, 'children:'))
        }
      }
    }

    return t.join('\n')
  }
}

export const validationService = new ValidationService()
