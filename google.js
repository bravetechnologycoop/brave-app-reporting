// Copied from https://developers.google.com/people/quickstart/nodejs and then modified

// Third-party dependencies
const readline = require('readline')
const { google: googleapis } = require('googleapis')
const { parse } = require('date-format-parse')
const { Storage } = require('@google-cloud/storage')

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly']

async function authorize(client_secret, client_id, redirect_uri) {
  const oAuth2Client = new googleapis.auth.OAuth2(client_id, client_secret, redirect_uri)

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  })
  // eslint-disable-next-line no-console
  console.log('Authorize this app by visiting this url:', authUrl)

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  const code = await new Promise(resolve => {
    rl.question('Enter the code from that page here: ', resolve)
  })
  rl.close()

  const results = await oAuth2Client.getToken(code)
  oAuth2Client.setCredentials(results.tokens)

  return oAuth2Client
}

async function getSheetsValues(spreadsheetId, range, auth) {
  const sheetsService = googleapis.sheets({ version: 'v4', auth })
  const values = await sheetsService.spreadsheets.values.get({
    spreadsheetId,
    range,
  })

  return values.data.values
}

function formatBoolean(value) {
  return value === undefined || value.trim() === '' ? null : value.trim() === 'Yes'
}

function formatDate(value) {
  return value !== undefined && value !== null && value.trim() !== '' ? parse(value, 'M/D/YYYY') : null
}

function formatDateTime(value) {
  return parse(value, 'M/D/YYYY H:mm:ss')
}

function formatInteger(value) {
  return value !== undefined && value !== '' ? parseInt(value, 10) : null
}

function formatLowercaseString(value) {
  return value.trim().toLowerCase()
}

async function getAndroidDownloads() {
  // Get the names of all the download statistics reports for the Brave App
  const storage = new Storage()
  const [files] = await storage.bucket(process.env.GOOGLE_CLOUD_STORAGE_BUCKET).getFiles({
    prefix: process.env.GOOGLE_CLOUD_STORAGE_FILE_PREFIX,
  })

  // Read all the downloads-by-country files, split the results into rows, and add to the results array
  const results = []
  const countryFileNames = files.filter(f => f.name.indexOf('_country.csv') > 0).map(f => f.name)
  for (const countryFileName of countryFileNames) {
    const [contents] = await storage.bucket(process.env.GOOGLE_CLOUD_STORAGE_BUCKET).file(countryFileName).download()
    contents
      .toString('utf16le') // decode Buffer
      .split('\n') // split into rows
      .slice(1, -1) // remove header (Date,Package Name,Country,Daily Device Installs,Daily Device Uninstalls,Daily Device Upgrades,Total User Installs,Daily User Installs,Daily User Uninstalls,Active Device Installs,Install events,Update events,Uninstall events) and empty row at the end
      .map(row => results.push(row.split(','))) // split into columns
  }

  return results
}

module.exports = {
  authorize,
  formatBoolean,
  formatDate,
  formatDateTime,
  formatInteger,
  formatLowercaseString,
  getAndroidDownloads,
  getSheetsValues,
}
