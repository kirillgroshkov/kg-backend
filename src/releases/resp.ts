export class Resp<T = any> {
  constructor (public name: string) {
    this.started = Date.now()
  }

  static create<T = any> (name = ''): Resp<T> {
    return new Resp<T>(name)
  }

  started: number // millis
  finished?: number

  body: T[] = []

  etagHits = 0
  githubRequests = 0
  firestoreReads = 0
  firestoreWrites = 0

  // mutates
  add (r: Resp<T>): void {
    this.body.push(...r.body)
    this.etagHits += r.etagHits
    this.githubRequests += r.githubRequests
    this.firestoreReads += r.firestoreReads
    this.firestoreWrites += r.firestoreWrites
  }

  finish (): void {
    this.finished = Date.now()
  }

  getLog (): string[] {
    return [
      `Resp: ${this.name}`,
      `took: ${(this.finished || Date.now()) - this.started} ms`,
      `length: ${this.body.length}`,
      `githubRequests (etagHits / misses): ${this.etagHits} / ${this.githubRequests}`,
      `firestoreReads / writes: ${this.firestoreReads} / ${this.firestoreWrites}`,
    ]
  }

  log (): void {
    console.log(this.getLog().join('\n'))
  }
}
