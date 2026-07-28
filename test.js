const fetch = require('node-fetch');

async function testBCB() {
  const res = await fetch('https://www.bcb.gob.bo/');
  const html = await res.text();
  
  // Find "11,54" or any similar rate block
  const match = html.match(/<div[^>]*class="[^"]*bcbx-tc__rate[^"]*"[^>]*>\s*([\d,\.]+)\s*<\/div>/i);
  console.log("Class match:", match ? match[1] : 'not found');
  
  const m2 = html.match(/Bolivianos por d[oó]lar.*?([\d,\.]+)/i);
  console.log("Text match:", m2 ? m2[1] : 'not found');
  
  const m3 = html.match(/11[,.]54/);
  console.log("Literal 11.54:", m3 ? m3[0] : 'not found');

  const m4 = html.match(/<div class="bcbx-tc__rate">([\d,\.]+)<\/div>/);
  console.log("Simple class match:", m4 ? m4[1] : 'not found');
}

testBCB();
