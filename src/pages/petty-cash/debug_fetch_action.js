
async function debugFetchAction() {
  try {
    const scriptUrl = "https://script.google.com/macros/s/AKfycbx5dryxS1R5zp6myFfUlP1QPimufTqh5hcPcFMNcAJ-FiC-hyQL9mCkgHSbLkOiWTibeg/exec";
    // Try using action=fetch instead of getSheetData
    const response = await fetch(`${scriptUrl}?sheet=Master&action=fetch`);
    const result = await response.json();
    console.log("Success:", result.success);
    if (result.success && result.data) {
        console.log("Total rows:", result.data.length);
        console.log("First 5 rows:", JSON.stringify(result.data.slice(0, 5), null, 2));
    } else {
        console.log("Failed or no data:", result);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

debugFetchAction();
