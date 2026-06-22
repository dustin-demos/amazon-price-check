
const https = require('https')
const zlib = require('zlib')

// Originally scraped a price out of a Google search result, but Google now requires JS and
// returns no price to a plain request. Amazon's product page still serves the price server-side
// in an `a-offscreen` span, so we read it straight from there. The module name and resolved
// shape are unchanged so price-check.js keeps working as-is.
const options = {
  headers: {
    'accept-encoding': 'gzip',
    'accept-language': 'en-US,en;q=0.9',
    'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  }
}

const findPrice = (html) => {
  // The first a-offscreen price on the page is the buy-box price, formatted like $23.64.
  const match = html.match(/a-offscreen">(\$[0-9]+\.[0-9]{2})</)

  return match ? match[1] : null
}

module.exports = function (asin) {
  const start = Date.now()
  const url = 'https://www.amazon.com/dp/' + asin
  let bytes = 0

  return new Promise(function (resolve) {
    const req = https.get(url, options, function (res) {
      const decompress = res.headers['content-encoding'] === 'gzip' ? zlib.createGunzip() : res

      let html = ''

      decompress.on('data', function (chunk) {
        bytes += Buffer.byteLength(chunk)
        html += chunk.toString()
      })

      decompress.on('error', function (err) {
        console.log('Error >>', err)
        resolve({ error: 'Failed to decompress the response.' })
      })

      decompress.on('end', function () {
        const price = findPrice(html)

        if (price) {
          resolve({ bytes, ms: Date.now() - start, price, asin, url })
        } else {
          resolve({ error: 'Failed to find a price for the requested ASIN.' })
        }
      })

      if (decompress !== res) {
        res.on('data', function (chunk) {
          decompress.write(chunk)
        })

        res.on('end', function () {
          decompress.end()
        })
      }
    })

    req.on('error', function (err) {
      console.log('Error >>', err)
      resolve({ error: 'Failed to resolve the request.' })
    })
  })
}
