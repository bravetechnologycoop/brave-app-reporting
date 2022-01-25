// Third-party dependencies
const dotenv = require('dotenv')
const pg = require('pg')
const twilio = require('twilio')

// In-house dependencies
const googlesheets = require('./googlesheets')

async function main() {
  // Setup environment variables
  dotenv.config()

  // Setup twilio client
  const twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN)

  // Connect to destination database
  const pool = new pg.Pool({
    host: process.env.PG_HOST,
    port: process.env.PG_PORT,
    user: process.env.PG_USER,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    ssl: true,
  })

  // Connect to Google APIs
  const oAuth2Client = await googlesheets.authorize(
    process.env.GOOGLE_API_CLIENT_SECRET,
    process.env.GOOGLE_API_CLIENT_ID,
    process.env.GOOGLE_API_REDIRECT_URI,
  )

  // Get Supporter Logs from Google Sheets
  // Reference: https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/get
  const LOG_TIMESTAMP = 0
  const SUPPORTER_EMAIL = 1
  const CALL_DATE = 3
  const RESCUE_STARTED = 9
  const SUPPORTER_EMOTIONAL_DIFFICULTY_RATING = 16
  const SUPPORTER_ENERGY_RATING = 17
  const SUPPORTER_REQUESTS_FOLLOWUP = 19

  console.log('Inserting supporter logs...')
  try {
    const supporterLogRows = await googlesheets.getSheetsValues(process.env.SUPPORTER_LOG_GOOGLE_SHEET_ID, 'A2:T', oAuth2Client)
    for (let i = 0; i < supporterLogRows.length; i += 1) {
      const supportLogRow = supporterLogRows[i]

      supportLogRow[LOG_TIMESTAMP] = googlesheets.formatDateTime(supportLogRow[LOG_TIMESTAMP])
      supportLogRow[SUPPORTER_EMAIL] = googlesheets.formatLowercaseString(supportLogRow[SUPPORTER_EMAIL])
      supportLogRow[CALL_DATE] = googlesheets.formatDate(supportLogRow[CALL_DATE])
      supportLogRow[RESCUE_STARTED] = googlesheets.formatBoolean(supportLogRow[RESCUE_STARTED])
      supportLogRow[SUPPORTER_EMOTIONAL_DIFFICULTY_RATING] = googlesheets.formatInteger(supportLogRow[SUPPORTER_EMOTIONAL_DIFFICULTY_RATING])
      supportLogRow[SUPPORTER_ENERGY_RATING] = googlesheets.formatInteger(supportLogRow[SUPPORTER_ENERGY_RATING])
      supportLogRow[SUPPORTER_REQUESTS_FOLLOWUP] = googlesheets.formatBoolean(supportLogRow[SUPPORTER_REQUESTS_FOLLOWUP])

      try {
        await pool.query(
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
            supporter_requests_followup
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
          ON CONFLICT (log_timestamp, supporter_email)
          DO NOTHING
          `,
          Array.from({ ...supportLogRow, length: 20 }), // Fill in the missing data with undefined
        )
      } catch (e) {
        console.log(
          `*** ERROR inserting supporter low row ${supportLogRow[LOG_TIMESTAMP]} ${supportLogRow[SUPPORTER_EMAIL]}. This is likely due to unexpected formatting in the Google Sheet. Please go check it out and correct it, if possible.`,
          e,
        )
      }
    }
  } catch (e) {
    console.log('Error getting the updated call logs from Google Sheets', e)
  }

  // TODO investigate getting older call logs from the other spreadsheet

  // Get Twilio call logs for the last 13 months
  // Reference: https://www.twilio.com/docs/libraries/node#iterate-through-records
  console.log('Inserting Twilio calls for the last 13 months. This can take 2-5 minutes...')
  try {
    const calls = await twilioClient.calls.list()
    calls.forEach(async call => {
      try {
        await pool.query(
          `
          INSERT INTO calls (sid, start_time, end_time, duration, from_number, to_number, direction, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (sid)
          DO
            UPDATE SET start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time, duration = EXCLUDED.duration, from_number = EXCLUDED.from_number, to_number = EXCLUDED.to_number, direction = EXCLUDED.direction, status = EXCLUDED.status;
          `,
          [call.sid, call.startTime, call.endTime, call.duration, call.from, call.to, call.direction, call.status],
        )
      } catch (e) {
        console.log('Error inserting Twilio call into the DB', e)
      }
    })
  } catch (e) {
    console.log('Error getting the Twilio calls', e)
  }

  // TOOD investigate getting Twilio call logs from > 13 months ago
  // References:
  //   https://www.twilio.com/docs/usage/bulkexport
  //   https://www.twilio.com/docs/voice/changes-availability-call-and-conference-logs

  // Disconnect from destination database
  try {
    await pool.end()
  } catch (e) {
    console.log('Error closing the DB pool', e)
  }
}

main()
