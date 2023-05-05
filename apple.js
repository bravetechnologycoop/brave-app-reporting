// Code inspired by https://developer.apple.com/forums/thread/667147

// Third-party dependencies
const axios = require('axios')
const readline = require('readline')

const url = 'https://appstoreconnect.apple.com/analytics/api/v1/data/time-series'

async function downloadAppleMetrics(appId, cookies, measures) {
  const appleMetrics = {}

  for (const measure of measures) {
    const response = await axios({
      method: 'post',
      url,
      data: {
        adamId: [appId],
        measures: [measure], // Although this is an array, it will complain if I put more than two mesures in here while I am grouping by "storefront"
        frequency: 'day',
        startTime: '2018-09-01T00:00:00Z', // Month where we first have Brave App data. If this step starts to take too long, this can be reduced as long as this earlier data is already in the DB
        endTime: `${new Date().toISOString().substring(0, 10)}T00:00:00Z`,
        group: {
          metric: measure,
          dimension: 'storefront', // This is what groups it by Territory
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

    for (const results of response.data.results) {
      const territoryName = results.group.title
      if (results.meetsThreshold) {
        for (const data of results.data) {
          const formattedDate = data.date.substring(0, 10)
          const key = [formattedDate, territoryName].join('_')
          if (appleMetrics[key] === undefined) {
            appleMetrics[key] = { territoryName, date: formattedDate }
          }
          appleMetrics[key][measure] = data[measure]
        }
      }
    }

    await new Promise(r => setTimeout(r, 5000)) // Sleep to avoid rate limiting
  }

  return appleMetrics
}

async function getAllAppleData(appId) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  // eslint-disable-next-line no-console
  console.log(
    "Authorize this app by visiting this url, logging in using your Apple ID: https://appstoreconnect.apple.com/login, and selecting the whitelabel client's account",
  )
  const cookies = await new Promise(resolve => {
    rl.question('Copy all the cookies sent to "/providerNews" in Headers --> Request Headers --> Cookie from the Developer Console Network tab and enter them here : ', resolve)
  })
  rl.close()

  return await downloadAppleMetrics(appId, cookies, [
    'impressionsTotal',
    'impressionsTotalUnique',
    'conversionRate',
    'pageViewCount',
    'pageViewUnique',
    'updates',
    'units',
    'redownloads',
    'totalDownloads',
    'installs',
    'sessions',
    'activeDevices',
    'rollingActiveDevices',
    'uninstalls',
  ])
}

module.exports = {
  getAllAppleData,
}
