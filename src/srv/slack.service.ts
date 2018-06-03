import { env } from '@src/environment/environment'
import { gotService } from '@src/srv/got.service'
import { timeUtil } from '@src/util/time.util'

export interface SlackMessage {
  username?: string
  channel?: string
  icon_url?: string
  icon_emoji?: string
  text: string
}

export enum SLACK_CHANNEL {
  log = 'log',
  info = 'info',
}

class SlackService {
  private get defaults (): SlackMessage {
    return {
      username: 'kg-backend',
      channel: '#' + SLACK_CHANNEL.log,
      icon_emoji: ':spider_web:',
      text: 'no text',
    }
  }

  async send (text: string, channel = SLACK_CHANNEL.log): Promise<void> {
    await this.sendMsg({
      text,
      channel: '#' + channel,
    })
  }

  async sendMsg (_msg: SlackMessage): Promise<void> {
    if (!env().slackWebhookUrl) return

    const body = {
      ...this.defaults,
      ..._msg,
    }

    this.decorateMsg(body)

    await gotService
      .post(env().slackWebhookUrl!, {
        body,
        noLog: true,
      })
      .catch(ignored => {}) // ignore, cause slack is weirdly returning non-json text "ok" response
  }

  // mutates
  private decorateMsg (msg: SlackMessage): void {
    const tokens: string[] = []

    tokens.push(timeUtil.nowPretty())
    tokens.push(msg.text)

    msg.text = tokens.join('\n')
  }
}

export const slackService = new SlackService()
