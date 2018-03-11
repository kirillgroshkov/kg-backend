import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator'
import { ValidatorOptions } from 'class-validator/validation/ValidatorOptions'
import {
  isCountryCode,
  isCur,
  isDateStr,
  isEmailOrDeleted,
  isInteger,
  isLangCode,
  isMoneyCents,
  isNum,
  isStr,
  isStringId,
  isStringNotEmpty,
  isUnixTimestamp,
  validateFn,
  ValidatorFunction,
} from './validators.impl'

/*
This file exports all custom validation decorators.
All implementations of validation functions are in separate file: `validators.impl.ts`.
This is to keep the public API of this file cleaner.
 */

/**
 * Allows to return custom error message
 */
class ValidatorWithMessage implements ValidatorConstraintInterface {
  constructor (private fn: ValidatorFunction) {}
  private msg?: string

  defaultMessage (): string {
    return this.msg!
  }

  validate (v: any, a: ValidationArguments = {} as any): boolean {
    this.msg = this.fn(v, ...a.constraints)
    return !this.msg
  }
}

// wrapper around registerDecorator to DRY things up
function _registerDecorator (name: string, validator: ValidatorFunction) {
  return (...constraints: any[]) => (object: Object, propertyName: string) => {
    registerDecorator({
      name,
      target: object.constructor,
      propertyName,
      constraints,
      // options, // we don't support them in this interface
      validator: new ValidatorWithMessage(validator),
    })
  }
}

export const IsStringNotEmpty = _registerDecorator('IsStringNotEmpty', isStringNotEmpty)

export const ValidateFn = _registerDecorator('ValidateFn', validateFn)

// Name conflicts with stock IsString
export const IsStr = _registerDecorator('IsStr', isStr)
export const IsNum = _registerDecorator('IsNum', isNum)
export const IsInteger = _registerDecorator('IsInteger', isInteger)

export const IsUnixTimestamp = _registerDecorator('IsUnixTimestamp', isUnixTimestamp)

export const IsStringId = _registerDecorator('IsStringId', isStringId)

// Name conflicts with stock IsDateString
export const IsDateStr = _registerDecorator('IsDateStr', isDateStr)

export const IsCountryCode = _registerDecorator('IsCountryCode', isCountryCode)
export const IsCur = _registerDecorator('IsCur', isCur)
export const IsMoneyCents = _registerDecorator('IsMoneyCents', isMoneyCents)
export const IsLangCode = _registerDecorator('IsLangCode', isLangCode)

export const IsEmailOrDeleted = _registerDecorator('IsEmailOrDeleted', isEmailOrDeleted)
