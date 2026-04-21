import fs from 'fs';

const FETCH_URL = "https://script.google.com/macros/s/AKfycbx5dryxS1R5zp6myFfUlP1QPimufTqh5hcPcFMNcAJ-FiC-hyQL9mCkgHSbLkOiWTibeg/exec?sheet=Login&action=fetch";

async function testLoginData() {
  const logFile = 'debug_output_v3.txt';
  const log = (msg) => {
    console.log(msg);
    fs.appendFileSync(logFile, msg + '\n');
  };

  if (fs.existsSync(logFile)) fs.unlinkSync(logFile);

  log("Fetching from: " + FETCH_URL);
  try {
    const response = await fetch(FETCH_URL);
    const result = await response.json();
    
    if (result.success && result.data) {
      log("Header Row: " + JSON.stringify(result.data[0]));
      
      const headers = result.data[0];
      const rows = result.data.slice(1);
      
      // Look for any row that might be ANGAD or SAGAR, case-insensitive
      const angad = rows.find(r => r.some(cell => cell && cell.toString().toUpperCase().includes("ANGAD")));
      const sagar = rows.find(r => r.some(cell => cell && cell.toString().toUpperCase().includes("SAGAR")));
      
      log("ANGAD row: " + JSON.stringify(angad));
      log("SAGAR row: " + JSON.stringify(sagar));
      
      const angad124_exists = rows.some(r => r.some(cell => cell && cell.toString() === "angad124"));
      log("Does 'angad124' exist anywhere in the sheet? " + angad124_exists);
      
      if (angad124_exists) {
          const row_w_pass = rows.find(r => r.some(cell => cell && cell.toString() === "angad124"));
          log("Row with 'angad124': " + JSON.stringify(row_w_pass));
      }
      
      log(`Detected Indices - User ID: ${userIdIdx}, Password: ${passwordIdx}`);
      
      if (angad) {
          log(`ANGAD ID: "${angad[userIdIdx]}", PASS: "${angad[passwordIdx]}"`);
      }
      if (sagar) {
          log(`SAGAR ID: "${sagar[userIdIdx]}", PASS: "${sagar[passwordIdx]}"`);
      }

    } else {
      log("Fetch failed: " + JSON.stringify(result));
    }
  } catch (error) {
    log("Error: " + error.message);
  }
}

testLoginData();
