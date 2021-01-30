# The Movie DB Test

[![Test Status](https://travis-ci.com/Filipoliko/tmdb-api-test.svg?branch=master)](https://travis-ci.com/Filipoliko/tmdb-api-test)

This repository contains test suite for [The Movie Database](https://www.themoviedb.org/) API.

## Setup

**Requirements:**
- Node.js (tested with v14)

Run `npm install` to install neccessary dependencies.

You also need to configure following environment variables before running the tests.

```
TMDB_USERNAME
TMDB_PASSWORD
TMDB_READ_ACCESS_TOKEN
```

Alternatively, you can edit `config.js` file and fill the values manually.

## Running Tests

Run following command to start the test run.

```bash
npm test
```
