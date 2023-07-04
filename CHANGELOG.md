# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Please note that the date associated with a release is the date the code
was committed to the `main` branch. This is not necessarily the date that
the code was deployed.

## [Unreleased]

## [3.0.0] - 2023-06-09

## Added

- Download and store the Android download data for whitelabel clients.
- Download and store the Apple download data for whitelabel clients.
- As much time series data as I could from the Apple App store and stored it in `apple_data` table.

### Changed

- Renamed the `appledownloads` table to `apple_data` and two of its columns (`download_date` is now `data_date` and `download_count` is now `first_time_downloads_count`).

## [2.1.0] - 2023-04-24

### Added

- `client` column to each table to track which whitelabel client the row is for.
- Download and store the Twilio call data for whitelabel clients.

### Changed

- README instructions.
- Twilio configuration moved from `.env` to new `clients.json`.
- DB migration process.

### Security

- Upgraded dependencies (CU-860phzbq5).

## [2.0.0] - 2022-09-06

### Security

- Updated Google Sheets OAuth2 process.

## [1.1.0] - 2022-07-29

### Changed

- Upgraded NodeJS.

## [1.0.0] - 2022-05-24

- First fully-working version.

## [0.1.0] - 2022-01-21

### Added

- Initial commit

[unreleased]: https://github.com/bravetechnologycoop/brave-app-reporting/compare/v3.0.0...HEAD
[3.0.0]: https://github.com/bravetechnologycoop/brave-app-reporting/compare/v2.1.0...3.0.0
[2.1.0]: https://github.com/bravetechnologycoop/brave-app-reporting/compare/v2.0.0...2.1.0
[2.0.0]: https://github.com/bravetechnologycoop/brave-app-reporting/compare/v1.1.0...2.0.0
[1.1.0]: https://github.com/bravetechnologycoop/brave-app-reporting/compare/v1.0.0...1.1.0
[1.0.0]: https://github.com/bravetechnologycoop/brave-app-reporting/compare/v0.1.0...1.0.0
[0.1.0]: https://github.com/bravetechnologycoop/brave-app-reporting/releases/tag/v0.1.0
