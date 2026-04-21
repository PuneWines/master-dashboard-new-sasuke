
const scriptUrl = "https://script.google.com/macros/s/AKfycbx5dryxS1R5zp6myFfUlP1QPimufTqh5hcPcFMNcAJ-FiC-hyQL9mCkgHSbLkOiWTibeg/exec";

async function testRange() {
    try {
        // Try requesting specific range or different action
        const url = `${scriptUrl}?sheetName=Master&action=getSheetData&range=A1:H10`;
        console.log(`Testing range param...`);
        const res = await fetch(url);
        const json = await res.json();
        if (json.success && json.data) {
           console.log("First row:", JSON.stringify(json.data[0]));
        } else {
           console.log("No success");
        }
    } catch (e) { console.log(e); }
}

testRange();
