
const scriptUrl = "https://script.google.com/macros/s/AKfycbx5dryxS1R5zp6myFfUlP1QPimufTqh5hcPcFMNcAJ-FiC-hyQL9mCkgHSbLkOiWTibeg/exec";

async function testParam(params) {
    try {
        const url = `${scriptUrl}?${params}`;
        console.log(`Testing: ${params}`);
        const res = await fetch(url);
        const json = await res.json();
        if (json.success && json.data && json.data.length > 0) {
            console.log(`First row: ${JSON.stringify(json.data[0])}`);
        } else {
            console.log("No data or failed");
        }
    } catch (e) {
        console.log("Error");
    }
}

async function run() {
    await testParam("sheet=Master&action=fetch");
    await testParam("sheetName=Master&action=fetch");
    await testParam("sheetName=Master&action=getSheetData");
    await testParam("sheet=Master&action=getData");
}

run();
