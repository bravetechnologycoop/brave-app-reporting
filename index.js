// Third-party dependencies
const dotenv = require('dotenv')
const pg = require('pg')
const twilio = require('twilio')

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

  // Get Twilio call logs for the last 13 months
  // Reference: https://www.twilio.com/docs/libraries/node#iterate-through-records
  console.log('Inserting Twilio calls for the last 13 months. This can take 2-5 minutes.')
  await Promise.all(
    twilioClient.calls.each(async call => {
      try {
        console.log(`   ${call.sid}`)
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
        console.log(e)
      }
    }),
  )

  // TOOD investigate getting Twilio call logs from > 13 months ago
  // References:
  //   https://www.twilio.com/docs/usage/bulkexport
  //   https://www.twilio.com/docs/voice/changes-availability-call-and-conference-logs

  // Disconnect from destination database
  await pool.end()
}

main()
