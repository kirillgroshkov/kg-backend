export const FORMAT_DATETIME_PRETTY = 'yyyy-MM-dd HH:mm:ss'

class TimeUtil {
  timeBetween (ms1: number, ms2: number): string {
    let d = Math.abs(Math.round((ms1 - ms2) / 1000))
    if (d < 50) return `${d} seconds`
    d = Math.round(d / 60)
    if (d < 50) return `${d} minutes`
    d = Math.round(d / 60)
    if (d < 24) return `${d} hours`
    d = Math.round(d / 24)
    return `${d} days`
  }
}

export const timeUtil = new TimeUtil()
