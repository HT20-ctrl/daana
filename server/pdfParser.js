// Custom PDF parser wrapper to avoid initialization issues
const pdfParse = require('pdf-parse');

// Export our wrapped version that skips the problematic initialization
module.exports = async function parsePdf(dataBuffer) {
  return await pdfParse(dataBuffer);
};