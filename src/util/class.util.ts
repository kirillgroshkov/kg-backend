import { validationService } from '@src/validation/validation.service'
import { classToPlain, plainToClass } from 'class-transformer'
import { ClassType } from 'class-transformer/ClassTransformer'

class ClassUtil {
  throwOnError = true

  classToPlain (o: any, validate = true): any {
    if (validate) this.validate(o)
    return classToPlain(o)
  }

  plainToClass<T> (cls: ClassType<T>, plain: object, validate = true): T {
    const c = plainToClass(cls, plain)
    if (validate) this.validate(c)
    return c
  }

  classToClass<T> (o: any, cls: ClassType<T>, validate = true): T {
    if (validate) this.validate(o)
    const plain = classToPlain(o)
    const c = plainToClass(cls, plain)
    if (validate) this.validate(c)
    return c
  }

  private validate (o: any): void {
    // if (!o || typeof o !== 'object') throw new AppValidationError() cls.name
    const errors = validationService.validate(o, this.throwOnError)
    if (errors.length && !this.throwOnError) {
      console.warn(validationService.getValidationErrorMessage(errors))
    }
  }
}

export const classUtil = new ClassUtil()
