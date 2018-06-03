import { EmailMsg, sendgridService } from '@src/srv/sendgrid.service'

test('send', async () => {
  const msg: EmailMsg = {
    to: {
      email: '1@inventix.ru',
      name: 'Kir',
    },
    subject: 'Testing sendgrid',
    content: '<b>Hello world</b><br><br>plain<br>text',
  }

  const r = await sendgridService.send(msg)
  console.log(r)
})
