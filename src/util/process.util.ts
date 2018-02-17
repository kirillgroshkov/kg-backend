import * as os from 'os'

function mb (b: number): number {
  return Math.round(b / (1024 * 1024))
}

class ProcessUtil {
  memoryUsage (): any {
    const m = process.memoryUsage()
    return {
      rss: mb(m.rss),
      heapTotal: mb(m.heapTotal),
      heapUsed: mb(m.heapUsed),
      external: mb((m as any).external),
      totalMem: mb(os.totalmem()),
      freeMem: mb(os.freemem()),
    }
  }

  cpuAvg (): any {
    const avg = os.loadavg()
    return {
      avg1: avg[0].toFixed(2),
      avg5: avg[1].toFixed(2),
      avg15: avg[2].toFixed(2),
    }
  }

  async cpuPercent (ms: number): Promise<any> {
    const stats1 = this.getCPUInfo()
    const startIdle = stats1.idle
    const startTotal = stats1.total

    return new Promise(resolve => {
      setTimeout(() => {
        const stats2 = this.getCPUInfo()
        const endIdle = stats2.idle
        const endTotal = stats2.total

        const idle = endIdle - startIdle
        const total = endTotal - startTotal
        const perc = idle / total

        resolve(Math.round((1 - perc) * 100))
      }, ms)
    })
  }

  private getCPUInfo () {
    return os.cpus().reduce(
      (r, cpu) => {
        r['idle'] += cpu.times.idle
        Object.values(cpu.times).forEach(m => (r['total'] += m))
        return r
      },
      {
        idle: 0,
        total: 0,
      },
    )
  }
}

export const processUtil = new ProcessUtil()
