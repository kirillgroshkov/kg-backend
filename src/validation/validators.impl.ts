/*
This file has _implementations_ of simple validation functions.
All functions should implement the `ValidatorFunction` interface.
 */

import { LUXON_ISO_DATE_FORMAT } from '@src/util/time.util'
import { Validator } from 'class-validator'
import { DateTime } from 'luxon'

/**
 * undefined = no error
 * string = error message
 */
export type ValidatorFunction = (v: any, ...args: any[]) => string | undefined

const validator = new Validator()

//
// General
//

export const isNotEmpty = (v: any) => {
  if (!v) return 'non-empty value expected'
}

export const validateFn = (v: any, fn: (v: any) => string | undefined) => {
  return fn(v)
}

//
// String
//

export const isStr = (v: any, minLength: number = 1, maxLength?: number) => {
  if (typeof v !== 'string') return 'string expected'
  if (minLength && v.length < minLength) return `expected length >= ${minLength}`
  if (maxLength && v.length > maxLength) return `expected length <= ${maxLength}`
}

export const isStringNotEmpty = (v: any) => {
  return isNotEmpty(v) || isStr(v)
}

export const isRegex = (v: any, regex: RegExp) => {
  const err = isStr(v)
  if (err) return err

  const m = v.match(regex)
  if (!m || m.length <= 1) return `expected to match regex: ${regex}`
}

export const isUppercase = (v: any) => {
  const err = isStr(v)
  if (err) return err

  if (!/^[A-Z]+$/.test(v)) return 'expected uppercase [A-Z] string'
}

export const isLowercase = (v: any) => {
  const err = isStr(v)
  if (err) return err

  if (!/^[a-z]+$/.test(v)) return 'expected uppercase [a-z] string'
}

export const isStringAlphanumericLowercase = (v: any) => {
  if (!/^[a-z0-9]+$/.test(v)) return 'expected alphanumeric [a-z0-9] string'
}

export const isStringId = (v: any, minLength = 6, maxLength = 32) => {
  return isStr(v, minLength, maxLength) || isStringAlphanumericLowercase(v)
}

//
// Number
//

export const isNum = (v: any, min?: number, max?: number) => {
  if (typeof v !== 'number' || isNaN(v)) return 'number expected'
  if (typeof min !== 'undefined' && v < min) return `expected number >= ${min}`
  if (typeof max !== 'undefined' && v > max) return `expected number <= ${max}`
}

export const isInteger = (v: any, min?: number, max?: number) => {
  if (!Number.isInteger(v)) return 'integer number expected'
  if (typeof min !== 'undefined' && v < min) return `expected integer number >= ${min}`
  if (typeof max !== 'undefined' && v > max) return `expected integer number <= ${max}`
}

//
// Date/Time
//

export const isUnixTimestamp = (v: any, min: string = '1970-01-01', max: string = '2500-01-01') => {
  const err = isNotEmpty(v) || isInteger(v)
  if (err) return `expected unixtime`

  if (typeof min !== 'undefined') {
    const dt = min === 'now' ? DateTime.utc() : DateTime.fromISO(min, { zone: 'utc' })
    if (v < dt) return `expected unixtime later than ${dt}`
  }
  if (typeof max !== 'undefined') {
    const dt = max === 'now' ? DateTime.utc() : DateTime.fromISO(max, { zone: 'utc' })
    if (v > dt) return `expected unixtime earlier than ${dt}`
  }
}

export const isDateStr = (v: any, min: string = '1800-01-01', max: string = '2500-01-01') => {
  const err = isNotEmpty(v) || isStr(v)
  if (err) return 'expected date string (yyyy-m-dd)'

  if (max === 'today')
    max = DateTime.utc()
      .plus({ hours: 14 })
      .toFormat(LUXON_ISO_DATE_FORMAT)
  if (min === 'today')
    max = DateTime.utc()
      .minus({ hours: 14 })
      .toFormat(LUXON_ISO_DATE_FORMAT)

  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m || m.length <= 1) return 'expected date string (yyyy-m-dd)'
  if (min && v < min) return `expected date later than ${min}`
  if (max && v > max) return `expected date earlier than ${max}`
}

//
// Other
//

export const isLength = (v: any, min?: number, max?: number) => {
  if (typeof min !== 'undefined' && v.length < min) return `expected length >= ${min}`
  if (typeof max !== 'undefined' && v.length > max) return `expected length <= ${max}`
}

export const isCountryCode = (v: any) => {
  return isStr(v, 2, 2) || isUppercase(v)
}

export const isCur = (v: any) => {
  return isStr(v, 3, 3) || isUppercase(v)
}

export const isLangCode = (v: any) => {
  const m = `expected language as "en" or "en-GB" format`
  let err = isStr(v, 2)
  if (err) return m

  if (v.length === 2) {
    // 'en'
    err = isLowercase(v)
    if (err) return m
  } else if (v.length === 5) {
    // todo: check "en-GB" format!
    return
  } else return m
}

export const isMoneyCents = (v: any) => {
  return isInteger(v, 0)
}

export const isEmailOrDeleted = (_v: any) => {
  const err = isStr(_v, 3)
  if (err) return `expected email`

  let v = _v

  if (v.endsWith('_deleted')) {
    v = v.substr(0, v.length - '_deleted'.length)
  }

  if (!validator.isEmail(v)) return `expected email`
}
