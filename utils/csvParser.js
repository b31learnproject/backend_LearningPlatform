const fs = require('fs');
const csv = require('csv-parser');

/**
 * Parses a CSV file with header validation, column mapping, skipping empty rows,
 * and batch processing.
 * 
 * @param {string} filePath - Path to the CSV file.
 * @param {Object} options
 * @param {string[]} options.expectedHeaders - Expected CSV headers (case-sensitive).
 * @param {Object} [options.columnMap] - Map from CSV column names to output keys.
 * @param {function} [options.transformFn] - Function to transform each row.
 * @param {number} [options.batchSize=100] - Number of rows per batch callback.
 * @param {function} [options.onBatch] - Callback invoked with each batch of rows.
 * 
 * @returns {Promise<Array<Object>>} Resolves with all parsed rows if no onBatch provided.
 */
const parseCSV = (
  filePath,
  {
    expectedHeaders,
    columnMap = {},
    transformFn,
    batchSize = 100,
    onBatch,
  } = {}
) => {
  return new Promise((resolve, reject) => {
    const results = [];
    let headersValidated = false;
    let batch = [];

    const isEmptyRow = (row) => {
      return Object.values(row).every(
        (val) => val === undefined || val === null || val.toString().trim() === ''
      );
    };

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('headers', (headers) => {
        const missing = expectedHeaders.filter((h) => !headers.includes(h));
        if (missing.length > 0) {
          return reject(new Error(`Missing expected headers: ${missing.join(', ')}`));
        }
        headersValidated = true;
      })
      .on('data', (data) => {
        if (!headersValidated) return;

        if (isEmptyRow(data)) return; // Skip empty rows

        // Map columns
        const mappedRow = Object.keys(columnMap).length
          ? Object.entries(columnMap).reduce((acc, [csvCol, key]) => {
              acc[key] = data[csvCol];
              return acc;
            }, {})
          : data;

        try {
          const transformed = transformFn ? transformFn(mappedRow) : mappedRow;

          if (onBatch) {
            batch.push(transformed);
            if (batch.length >= batchSize) {
              onBatch(batch);
              batch = [];
            }
          } else {
            results.push(transformed);
          }
        } catch (err) {
          reject(new Error(`Error transforming row: ${err.message}`));
        }
      })
      .on('end', () => {
        if (onBatch && batch.length > 0) {
          onBatch(batch);
        }
        if (!onBatch) {
          resolve(results);
        } else {
          resolve();
        }
      })
      .on('error', (err) => {
        reject(new Error(`Error reading CSV file: ${err.message}`));
      });
  });
};

module.exports = parseCSV;
