class StringUtil {
  replaceAll (str: string, find: string, replace: string): string {
    return str.replace(new RegExp(find, 'g'), replace)
  }
}

export const stringUtil = new StringUtil()
