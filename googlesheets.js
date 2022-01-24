// Copied from https://developers.google.com/people/quickstart/nodejs and then modified

// Third-party dependencies
const readline = require('readline')
const { google } = require('googleapis')
const { parse } = require('date-format-parse')

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly']

async function authorize(client_secret, client_id, redirect_uri) {
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uri)

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  })
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
  const sheetsService = google.sheets({ version: 'v4', auth })
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
  return value !== undefined ? parse(value, 'M/D/YYYY') : null
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

module.exports = {
  authorize,
  formatBoolean,
  formatDate,
  formatDateTime,
  formatInteger,
  formatLowercaseString,
  getSheetsValues,
}
