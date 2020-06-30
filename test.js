const fetch = require('node-fetch');

const endpointUri = 'http://d32evckyjcdxjm.cloudfront.net/proxy-config.json';

fetch(endpointUri).then((res) => res.json().then(console.log));
