// Third-party dependencies
const dotenv = require('dotenv')
const pg = require('pg')
const twilio = require('twilio')
const fs = require('fs').promises

// In-house dependencies
const google = require('./google')
const apple = require('./apple')

async function main() {
  // Avoid self-signed certificate error (https://stackoverflow.com/questions/12180552/openssl-error-self-signed-certificate-in-certificate-chain#answer-55220462)
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

  const log = ['SUCCESS Started']

  // Setup environment variables
  dotenv.config()
  log.push('SUCCESS Set up environment variables')

  // Setup clients
  const clientsRaw = await fs.readFile('clients.json', 'ascii')
  const clients = JSON.parse(clientsRaw)
  log.push('SUCCESS Imported clients.json')

  // Connect to destination database
  const pool = new pg.Pool({
    host: process.env.PG_HOST,
    port: process.env.PG_PORT,
    user: process.env.PG_USER,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    ssl: { rejectUnauthorized: false }, // Note, to make this work on a Mac, this needs to change to false
  })
  log.push('SUCCESS Connected to database')

  // Connect to Google Sheets APIs (requires user action)
  let oAuth2Client
  try {
    oAuth2Client = await google.authorize(process.env.GOOGLE_API_CLIENT_SECRET, process.env.GOOGLE_API_CLIENT_ID)
    log.push('SUCCESS Logged into Google Sheets API')
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Error authenticating with Google Sheets API', e)
    log.push('FAIL    Did not log into Google Sheets API')
  }

  // Get Supporter Logs from Google Sheets
  // Reference: https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/get
  // eslint-disable-next-line no-console
  console.log('Inserting supporter logs (Brave). This takes less than 1 minute...')
  const LOG_TIMESTAMP = 0
  const SUPPORTER_EMAIL = 1
  const CALL_DATE = 3
  const RESCUE_STARTED = 9
  const SUPPORTER_EMOTIONAL_DIFFICULTY_RATING = 16
  const SUPPORTER_ENERGY_RATING = 17
  const SUPPORTER_REQUESTS_FOLLOWUP = 19
  try {
    const supporterLogRows = await google.getSheetsValues(process.env.SUPPORTER_LOG_GOOGLE_SHEET_ID, 'A2:T', oAuth2Client)
    const queries = []
    for (let i = 0; i < supporterLogRows.length; i += 1) {
      const supportLogRow = supporterLogRows[i]

      supportLogRow[LOG_TIMESTAMP] = google.formatDateTime(supportLogRow[LOG_TIMESTAMP])
      supportLogRow[SUPPORTER_EMAIL] = google.formatLowercaseString(supportLogRow[SUPPORTER_EMAIL])
      supportLogRow[CALL_DATE] = google.formatDate(supportLogRow[CALL_DATE])
      supportLogRow[RESCUE_STARTED] = google.formatBoolean(supportLogRow[RESCUE_STARTED])
      supportLogRow[SUPPORTER_EMOTIONAL_DIFFICULTY_RATING] = google.formatInteger(supportLogRow[SUPPORTER_EMOTIONAL_DIFFICULTY_RATING])
      supportLogRow[SUPPORTER_ENERGY_RATING] = google.formatInteger(supportLogRow[SUPPORTER_ENERGY_RATING])
      supportLogRow[SUPPORTER_REQUESTS_FOLLOWUP] = google.formatBoolean(supportLogRow[SUPPORTER_REQUESTS_FOLLOWUP])

      queries.push(
        pool.query(
          `
          INSERT INTO supporterlogs (
            log_timestamp,
            supporter_email,
            supporter_name,
            call_date,
            call_type,
            call_duration,
            call_challenges,
            call_screenshots,
            caller_type,
            rescue_started,
            rescue_outcome,
            caller_used,
            caller_administration_route,
            caller_location_us,
            caller_location_ca,
            caller_feedback,
            supporter_emotional_difficulty_rating,
            supporter_energy_rating,
            supporter_feedback,
            supporter_requests_followup,
            client
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, 'Brave')
          ON CONFLICT (client, log_timestamp)
          DO UPDATE SET
            supporter_name = EXCLUDED.supporter_name,
            call_date = EXCLUDED.call_date,
            call_type = EXCLUDED.call_type,
            call_duration = EXCLUDED.call_duration,
            call_challenges = EXCLUDED.call_challenges,
            call_screenshots = EXCLUDED.call_screenshots,
            caller_type = EXCLUDED.caller_type,
            rescue_started = EXCLUDED.rescue_started,
            rescue_outcome = EXCLUDED.rescue_outcome,
            caller_used = EXCLUDED.caller_used,
            caller_administration_route = EXCLUDED.caller_administration_route,
            caller_location_us = EXCLUDED.caller_location_us,
            caller_location_ca = EXCLUDED.caller_location_ca,
            caller_feedback = EXCLUDED.caller_feedback,
            supporter_emotional_difficulty_rating = EXCLUDED.supporter_emotional_difficulty_rating,
            supporter_energy_rating = EXCLUDED.supporter_energy_rating,
            supporter_feedback = EXCLUDED.supporter_feedback,
            supporter_requests_followup = EXCLUDED.supporter_requests_followup
          `,
          Array.from({ ...supportLogRow, length: 20 }), // Fill in the missing data with undefined
        ),
      )
    }

    await Promise.all(queries)
    log.push('SUCCESS Stored supporter call logs from Google Sheets (Brave)')
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Error getting the updated call logs from Google Sheets and storing them in the DB (Brave)', e)
    log.push('FAIL    Did not store the supporter call logs from Google Sheets')
  }

  // eslint-disable-next-line no-console
  console.log('\n\n')

  // Get Google Play Console installation stats by territory
  // References: https://support.google.com/googleplay/android-developer/answer/6135870?visit_id=637816704425781255-3386620922&p=stats_export&rd=1#export
  //   https://cloud.google.com/storage/docs/reference/libraries#client-libraries-install-nodejs
  //   https://github.com/googleapis/nodejs-storage/blob/main/samples/downloadIntoMemory.js
  // eslint-disable-next-line no-console
  for (const client of clients) {
    if (client.googleCloudStorageBucket === null || client.googleCloudStorageFilePrefix === null) {
      log.push(`skip    Did not store the Android user downloads (${client.name})`)
      continue
    }

    console.log(`Inserting Android user downloads by country (${client.name}). This takes less than 1 minute...`)
    try {
      const queries = []
      const androidDownloads = await google.getAndroidDownloads(client.googleCloudStorageBucket, client.googleCloudStorageFilePrefix)
      for (const androidDownload of androidDownloads) {
        const downloadCount = androidDownload[7]
        if (downloadCount !== '0') {
          const territory = androidDownload[2]
          const downloadDate = androidDownload[0]
          queries.push(
            pool.query(
              `
                INSERT INTO androiddownloads (territory, download_date, download_count, client)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (client, territory, download_date)
                DO UPDATE SET
                  download_count = EXCLUDED.download_count
                `,
              [territory, downloadDate, downloadCount, client.name],
            ),
          )
        }
      }

      await Promise.all(queries)
      log.push(`SUCCESS Stored Android user downloads (${client.name})`)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(`Error getting the Android user downloads and storing them in the DB (${client.name})`, e)
      log.push(`FAIL    Did not store the Android user downloads (${client.name})`)
    }

    // eslint-disable-next-line no-console
    console.log('\n\n')
  }

  // Get Apple Connect first time downloads stats by territory (requires user action)
  // eslint-disable-next-line no-console
  for (const client of clients) {
    if (client.appleAppId === null) {
      log.push(`skip    Did not store the Apple Data (${client.name})`)
      continue
    }

    console.log(`Inserting Apple data by territory (${client.name}). This can take about 5 minutes...`)
    try {
      const appleData = await apple.getAllAppleData(client.appleAppId)

      const queries = []
      for (const [k, d] of Object.entries(appleData)) {
        const territoryName = d.territoryName
        const date = d.date
        const firstTimeDownloadsCount = d.units
        const redownloadsCount = d.redownloads
        const totalDownloadsCount = d.totalDownloads
        const totalDeviceImpressionsCount = d.impressionsTotal
        const uniqueDeviceImpressionsCount = d.impressionsTotalUnique
        const totalProductPageViewsCount = d.pageViewCount
        const uniqueProductPageViewsCount = d.pageViewUnique
        const updatesCount = d.updates
        const conversionRate = d.conversionRate
        const installationsCount = d.installs
        const sessionsCount = d.sessions
        const totalActiveDevicesCount = d.activeDevices
        const activeInLast30DaysDevicesCount = d.rollingActiveDevices
        const deletionsCount = d.uninstalls
        queries.push(
          pool.query(
            `
                INSERT INTO apple_data (territory, data_date, client, first_time_downloads_count, redownloads_count, total_downloads_count, total_device_impressions_count, unique_device_impressions_count, total_product_page_views_count, unique_product_page_views_count, updates_count, conversion_rate, installations_count, sessions_count, total_active_devices_count, active_in_last_30_days_devices_count, deletions_count)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
                ON CONFLICT (client, territory, data_date)
                DO UPDATE SET
                  first_time_downloads_count = EXCLUDED.first_time_downloads_count,
                  redownloads_count = EXCLUDED.redownloads_count,
                  total_downloads_count = EXCLUDED.total_downloads_count,
                  total_device_impressions_count = EXCLUDED.total_device_impressions_count,
                  unique_device_impressions_count = EXCLUDED.unique_device_impressions_count,
                  total_product_page_views_count = EXCLUDED.total_product_page_views_count,
                  unique_product_page_views_count = EXCLUDED.unique_product_page_views_count,
                  updates_count = EXCLUDED.updates_count,
                  conversion_rate = EXCLUDED.conversion_rate,
                  installations_count = EXCLUDED.installations_count,
                  sessions_count = EXCLUDED.sessions_count,
                  total_active_devices_count = EXCLUDED.total_active_devices_count,
                  active_in_last_30_days_devices_count = EXCLUDED.active_in_last_30_days_devices_count,
                  deletions_count = EXCLUDED.deletions_count
                `,
            [
              territoryName,
              date,
              client.name,
              firstTimeDownloadsCount,
              redownloadsCount,
              totalDownloadsCount,
              totalDeviceImpressionsCount,
              uniqueDeviceImpressionsCount,
              totalProductPageViewsCount,
              uniqueProductPageViewsCount,
              updatesCount,
              conversionRate,
              installationsCount,
              sessionsCount,
              totalActiveDevicesCount,
              activeInLast30DaysDevicesCount,
              deletionsCount,
            ],
          ),
        )
      }

      await Promise.all(queries)
      log.push(`SUCCESS Stored Apple Data (${client.name})`)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(`Error getting the Apple Data and storing them in the DB (${client.name})`, e)
      log.push(`FAIL    Did not store the Apple Data (${client.name})`)
    }

    // eslint-disable-next-line no-console
    console.log('\n\n')
  }

  // Get Twilio call logs for the last 13 months
  // Reference: https://www.twilio.com/docs/libraries/node#iterate-through-records
  // eslint-disable-next-line no-console
  for (const client of clients) {
    if (client.twilioSid === null || client.twilioToken === null) {
      log.push(`skip    Did not store the Twilio call logs (${client.name})`)
      continue
    }

    console.log(`Inserting Twilio calls (${client.name}) for the last 13 months. This can take about 10 minutes...`)
    try {
      const twilioClient = twilio(client.twilioSid, client.twilioToken)
      const calls = await twilioClient.calls.list()
      const queries = []
      for (let i = 0; i < calls.length; i += 1) {
        const call = calls[i]
        queries.push(
          pool.query(
            `
              INSERT INTO calls (
                sid,
                start_time,
                end_time,
                duration,
                from_number,
                to_number,
                direction,
                status,
                client
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
              ON CONFLICT (sid)
              DO UPDATE SET
                start_time = EXCLUDED.start_time,
                end_time = EXCLUDED.end_time,
                duration = EXCLUDED.duration,
                from_number = EXCLUDED.from_number,
                to_number = EXCLUDED.to_number,
                direction = EXCLUDED.direction,
                status = EXCLUDED.status,
                client = EXCLUDED.client
              `,
            [call.sid, call.startTime, call.endTime, call.duration, call.from, call.to, call.direction, call.status, client.name],
          ),
        )
      }

      await Promise.all(queries)
      log.push(`SUCCESS Stored Twilio call logs (${client.name})`)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(`Error getting the Twilio calls (${client.name}) and storing them in the DB`, e)
      log.push(`FAIL    Did not store the Twilio call logs (${client.name})`)
    }
  }

  // Disconnect from destination database
  try {
    await pool.end()
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Error closing the DB pool', e)
  }

  // eslint-disable-next-line no-console
  console.log(`\n\nSummary:\n  ${log.join('\n  ')}`)
}

main()
