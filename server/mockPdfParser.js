// Mock PDF parser for development that doesn't rely on the problematic pdf-parse library
module.exports = async function parsePdf(dataBuffer) {
  // Simply return a text representation - in a real app, we'd parse the PDF properly
  // but for development purposes this bypasses the initialization error
  return {
    text: "PDF content extracted successfully. This is a placeholder for actual PDF content.",
    numpages: 1,
    info: {},
    metadata: {},
    version: "1.0"
  };
};