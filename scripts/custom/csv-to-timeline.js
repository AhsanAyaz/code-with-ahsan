// Import the package
const csv = require('csv')
const fs = require('fs')
const path = require('path')

const content = fs.readFileSync(path.resolve(__dirname, '../../temp/source.csv'))

// Run the pipeline
csv
  .parse(content, {
    delimiter: ',',
    relax_quotes: true,
    columns: true,
  })
  // Transform each value into uppercase
  .pipe(
    csv.transform((record) => {
      let recordInTime = record['Record In']
      if (record['Notes'].includes('Marker')) {
        return []
      }
      recordInTime = recordInTime
        .split(':')
        .map((val, i, arr) => {
          if (i === 0) {
            return (Number(val) - 1).toString().padStart(2, 0)
          } else if (i === arr.length - 1) {
            return ''
          }
          return val
        })
        .filter((val) => !!val)
        .join(':')
      return [`${recordInTime} - ${record['Notes']}`]
    })
  )
  // Convert objects into a stream
  .pipe(
    csv.stringify({
      quoted: false,
    })
  )
  // Print the CSV stream to stdout
  .pipe(process.stdout)
