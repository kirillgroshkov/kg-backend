class ProcessUtil {
  memoryUsage (): any {
    const m = process.memoryUsage()
    return {
      rss: Math.round(m.rss / (1024 * 1024)),
      heapTotal: Math.round(m.heapTotal / (1024 * 1024)),
      heapUsed: Math.round(m.heapUsed / (1024 * 1024)),
      external: Math.round((m as any).external / (1024 * 1024)),
    }
  }
}

export const processUtil = new ProcessUtil()
