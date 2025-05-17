// Mock PDF parser for development
export default async function parsePdf(dataBuffer: Buffer) {
  // Simple mock that returns a placeholder result
  return {
    text: "PDF content extracted successfully. This is a placeholder for actual PDF content.",
    numpages: 1,
    info: {},
    metadata: {},
    version: "1.0"
  };
}