import { templatesDir } from '@src/cnst/paths.cnst'
import { memo } from '@src/decorators/memo.decorator'
import * as Nunjucks from 'nunjucks'
import { promisify } from 'util'

type RenderFn = (templatePath: string, data: any) => Promise<string>

class NunjucksService {
  @memo()
  private nunjucks (): typeof Nunjucks {
    const n = Nunjucks
    // So it does NOT escape e.g <br> tags in our email templates
    n.configure({ autoescape: false })
    return n
  }

  @memo()
  private renderFn (): RenderFn {
    return promisify<RenderFn>(this.nunjucks().render.bind(this.nunjucks()))
  }

  /**
   * templatePath - relative to /src/templates
   */
  async render (templatePath: string, data: any = {}): Promise<string> {
    return this.renderFn()(`${templatesDir}/${templatePath}`, data)
  }
}

export const nunjucksService = new NunjucksService()
