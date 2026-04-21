
async function debugFetch() {
  try {
    const scriptUrl = "https://script.google.com/macros/s/AKfycbx5dryxS1R5zp6myFfUlP1QPimufTqh5hcPcFMNcAJ-FiC-hyQL9mCkgHSbLkOiWTibeg/exec";
    const response = await fetch(`${scriptUrl}?sheetName=Master&action=getSheetData`);
    const result = await response.json();
    console.log("Success:", result.success);
    if (result.success && result.data) {
        console.log("Total rows:", result.data.length);
        console.log("First 5 rows:", JSON.stringify(result.data.slice(0, 5), null, 2));
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

debugFetch();
