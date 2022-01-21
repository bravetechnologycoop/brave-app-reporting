// Third-party dependencies
const dotenv = require('dotenv')
const pg = require('pg')

async function main() {
  // Setup environment variables
  dotenv.config()

  // Connect to destination database
  const pool = new pg.Pool({
    host: process.env.PG_HOST,
    port: process.env.PG_PORT,
    user: process.env.PG_USER,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    ssl: true,
  })

  // Disconnect from destination database
  await pool.end()

  console.log('Hello world')
}

main()
