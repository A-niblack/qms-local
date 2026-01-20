/**
 * Simulates parsing a CMM file (PDF, XLS, XLSX).
 * In a real application, this would use libraries like 'pdf-parse' or 'xlsx'
 * to read the file content and extract measurement data.
 *
 * This mock version returns a promise that resolves with dummy data.
 *
 * @param {File} file The file object from the input.
 * @returns {Promise<object>} A promise that resolves with parsed data.
 */
export const parseCMMFile = (file) => {
  console.log(`Simulating parse for file: ${file.name}, type: ${file.type}`);

  return new Promise((resolve, reject) => {
    // Simulate parsing time
    setTimeout(() => {
      // Simulate a random parse failure 10% of the time
      if (Math.random() < 0.1) {
        reject(new Error("Mock Error: Failed to parse CMM file. File may be corrupt or in an unknown format."));
      }
      
      // Simulate a random pass/fail result
      const isPass = Math.random() > 0.2; // 80% chance of passing
      
      const features = [
        { name: 'Feat-001_OD', nominal: 10.5, actual: 10.51, status: 'pass' },
        { name: 'Feat-002_ID', nominal: 5.0, actual: 5.03, status: 'pass' },
        { name: 'Feat-003_POS', nominal: 0.0, actual: isPass ? 0.05 : 0.15, status: isPass ? 'pass' : 'fail' },
        { name: 'Feat-004_FLAT', nominal: 0.1, actual: 0.08, status: 'pass' },
      ];

      // Resolve with the simulated data structure
      resolve({
        fileName: file.name,
        parseDate: new Date().toISOString(),
        featuresChecked: 4,
        featuresPassed: isPass ? 4 : 3,
        featuresFailed: isPass ? 0 : 1,
        overallStatus: isPass ? 'pass' : 'fail',
        details: features,
      });
    }, 1500); // Simulate 1.5 second parse time
  });
};
