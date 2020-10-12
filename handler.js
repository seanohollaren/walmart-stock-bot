const fetch = require('node-fetch');

const cache = {};

// perform request and alert to Slack if it meets criteria
module.exports.heartbeat = async () => {

  try {
    // perform a request and alert if conditions are met
    const lowestAmmoObject = await performRequest(process.env.serviceEndpoint);

    // get parsed ammo price per round
    const lowestPrice = getPrice(lowestAmmoObject);

    // if the ammo met our threshold, alert slack channel
    if (lowestPrice < parseFloat(process.env.threshold)) await alertConditionMet(lowestAmmoObject, lowestPrice);

    else console.log(`The current lowest price (${lowestPrice}) does not meet the threshold (${process.env.threshold})`);

  }
  catch (e) {
    await reportError(e);
  }
};

// perform request - resolve if successful, reject on error or non-200 status
async function performRequest() {
  console.log(`Sending a request to endpoint: ${process.env.serviceEndpoint}`);

  const ammoData = await fetch('https://ammoseek.com/', {
    headers: {
      accept: 'application/json, text/javascript, */*; q=0.01',
      'accept-language': 'en-US,en;q=0.9,la;q=0.8',
      'cache-control': 'no-cache',
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
      pragma: 'no-cache',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'x-requested-with': 'XMLHttpRequest',
      cookie: '__cfduid=d4966d61ca1c94d4f26a66d753ad747791601674362; _ga=GA1.2.159529348.1601674364; fpestid=zddLhIA7Vm_E2L34gKgzJJMUK4m6LNrrF_0WaPMmhpY8c9eN9QpwgcdHyRXZf1iPEJt3mA; _gid=GA1.2.1414601275.1602008079'
    },
    referrer: 'https://ammoseek.com/ammo/9mm-luger',
    referrerPolicy: 'strict-origin-when-cross-origin',
    body: process.env.searchString,
    method: 'POST',
    mode: 'cors'
  }).then(data => data.json());

  // grab the first element in the ammo array, which is already sorted in ascending order
  return ammoData.data
    .filter(ammo => !ammo.dr)
    .filter(ammo => !['Bass Pro', 'Cabela\'s'].includes(ammo.retailer))[0];
}

// retrieve numeric price from string field
function getPrice(ammoObject) {
  return parseFloat(ammoObject.cp.split('&#')[0]);
}

// report error to Slack
async function alertConditionMet(lowestAmmoObject, lowestPrice) {
  const formattedAmmoDescription = lowestAmmoObject.descr.split('<span')[0];

  // check whether we've already alerted recently for this ammo.  If so, skip report.  If not, store in cache.
  if (existsInCache(formattedAmmoDescription)) {
    console.log(`Already reported on this ammo recently.  Skipping alert about: ${formattedAmmoDescription}`);
    return;
  }

  const slackMessage = `*AmmoBot alert* \n\n  Price per round: *${lowestPrice} cents* \n\n  *${formattedAmmoDescription}* \n\n  Retailer: *${lowestAmmoObject.retailer}* \n  Condition: ${lowestAmmoObject.condition} \n  Count: ${lowestAmmoObject.count} \n  Shipping cost: ${lowestAmmoObject.shipping}  \n\n  https://ammoseek.com${lowestAmmoObject.DT_RowData.gourl.replace('share', 'go')} \n\n  ${process.env.mentions}`;

  console.log('Posting message...');
  console.log(slackMessage);

  await fetch(process.env.slackEndpoint, {
    body: JSON.stringify({
      text: slackMessage
    }),
    method: 'POST'
  });
}

// check if we've already alerted recently on a given ammo.  If not, store it in cache.
function existsInCache(key) {
  // if this ammo description exists in cache and its cached time is more recent than an hour ago
  if (cache[key] > Date.now() - (60 * 60 * 1000)) {
    return true;
  }

  // store in cache with timestamp
  cache[key] = Date.now();
  return false;
}

// report error to Slack
async function reportError(err) {
  const slackMessage = `*AmmoBot error* \n\nRequest to endpoint failed \n\n  Endpoint:\n  ${process.env.serviceEndpoint} \n\n  Error:\n  ${err.message}`;

  if (existsInCache(err.message)) {
    console.log('Already reported this error recently: ', err.message);
    return;
  }

  console.log('Reporting error...');
  console.log(slackMessage);

  await fetch(process.env.slackEndpoint, {
    body: JSON.stringify({
      text: slackMessage
    }),
    method: 'POST'
  });
}
