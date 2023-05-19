// Code inspired by https://developer.apple.com/forums/thread/667147

// Third-party dependencies
const axios = require('axios')
const readline = require('readline')

const url = 'https://appstoreconnect.apple.com/analytics/api/v1/data/time-series'

async function getAppleFirstTimeDownloads(appId) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  // eslint-disable-next-line no-console
  console.log(
    "Authorize this app by visiting this url, logging in using your Apple ID: https://appstoreconnect.apple.com/login, and selecting the whitelabel client's account",
  )
  const cookies = await new Promise(resolve => {
    rl.question('Copy all the cookies sent to "/providerNews" from the Developer Console Network tab and enter them here : ', resolve)
  })
  rl.close()

  const response = await axios({
    method: 'post',
    url,
    data: {
      adamId: [appId],
      measures: ['units'],
      frequency: 'day',
      startTime: '2018-09-01T00:00:00Z', // Month where we first have Brave App data
      endTime: `${new Date().toISOString().substring(0, 10)}T00:00:00Z`,
      group: {
        metric: 'units',
        dimension: 'storefront',
        rank: 'DESCENDING',
        limit: 10,
      },
    },
    headers: {
      Host: 'appstoreconnect.apple.com',
      'X-Requested-By': 'dev.apple.com',
      Cookie: cookies,
      'Content-Type': 'application/json',
    },
  })

  return response.data.results
}

module.exports = {
  getAppleFirstTimeDownloads,
}
