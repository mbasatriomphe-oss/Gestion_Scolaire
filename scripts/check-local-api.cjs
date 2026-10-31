const http = require('node:http')

http
  .get('http://127.0.0.1:8000/up', (response) => {
    response.resume()
    if (response.statusCode !== 200) {
      console.error(`Laravel health check returned HTTP ${response.statusCode}.`)
      process.exitCode = 1
      return
    }

    console.log('Laravel local API is responding at http://127.0.0.1:8000.')
  })
  .on('error', (error) => {
    console.error(`Laravel local API is unavailable: ${error.message}`)
    process.exitCode = 1
  })
