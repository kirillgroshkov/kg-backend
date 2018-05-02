import { slackService } from '@src/srv/slack.service'

test('send', async () => {
  await slackService.sendMsg({
    channel: 'test',
    text: 'hej!',
  })
})
