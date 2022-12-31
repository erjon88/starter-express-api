
const proxy = require('express-http-proxy');
const express = require("express");
const axios = require("axios");
const url = require('url');
const HOSTNAME = process.env.CYCLIC_APP_ID ? `${process.env.CYCLIC_APP_ID}.cyclic.app` : 'localhost:3010';

// Initialize express app
const app = express();

// Set up middleware to handle request body
app.use(express.json());

app.get("/ip", async (req, res) => {
  const resp = await axios.get('http://ip-api.com/json/?fields=61439');
  res.send(resp.data);
});
// Set up endpoint for the TV content
app.get("/tv/:id/index.m3u8", async (req, res) => {
  try{
    // Get the id from the URL parameter
    const {id} = req.params;
    const {hostname, path, apipath, macAddress, serialNumber} = req.query;
    console.log(req.query);
    // Authenticate with the server by calling the auth endpoint
    const authResponse = await axios.post(
      `${hostname}/${path}`,
      {
        macAddress,
        serialNumber,
      }
    );

    // If authentication was successful
    if (authResponse.status === 200) {
      // Get the session cookie from the response header
      const cookie = authResponse.headers["set-cookie"][0];

      // Set the cookie in the request headers for the subsequent call
      const config = {
        headers: {
          Cookie: cookie
        }
      };

      // Call the API endpoint with the id and the cookie in the headers
      const response = await axios.get(
        `${hostname}/${apipath}/${id}`,
        config
      );

      const urlObj = url.parse(response.data.playbackUrl);

      // Replace the domain with 'localhost'
      urlObj.host = `${HOSTNAME}/stream/${urlObj.host}`;
      urlObj.protocol = process.env.CYCLIC_APP_ID ? 'https' : 'http';

      // Rebuild the URL string with the new domain
      const newUrl = url.format(urlObj);
      res.redirect(newUrl);
      
    } else {
      // If authentication failed, return an error message
      res.send({ error: "Authentication failed" });
    }
  }catch(e){
    console.log(e);
    res.send({ error: "Error or bad ID" });
  }
});

app.get('/stream/:hostName/hls/live/:streamId/:streamName/:playlistName', proxy((req) => {
  const { hostName } = req.params;
  return hostName;
}, {
  proxyReqPathResolver: function (req) {
    const { playlistName, streamId, streamName } = req.params;
    const { hdnts } = req.query;
    return `/hls/live/${streamId}/${streamName}/${playlistName}?hdnts=${decodeURIComponent(hdnts)}`;
  },
  proxyReqOptDecorator: function(proxyReqOpts) {
    proxyReqOpts.headers['x-forwarded-for'] = '84.22.33.2'
    return proxyReqOpts
  }
}));

app.get('/stream/:hostName/hls/live/:streamId/:streamName/:chunkId/*', proxy((req) => {
  const { hostName } = req.params;
  return hostName;
}, {
  proxyReqPathResolver: (req) => {
    const { streamId, streamName, chunkId, 0: rest } = req.params;
    return `/hls/live/${streamId}/${streamName}/${chunkId}/${decodeURIComponent(rest)}`;
  },
  proxyReqOptDecorator: function(proxyReqOpts) {
    proxyReqOpts.headers['x-forwarded-for'] = '84.22.33.2'
    return proxyReqOpts
  }
}));

app.get('/stream/:hostName/hls/live/:streamId/:streamName/:chunkId/:tracks/ts/:segment', proxy((req) => {
  const { hostName } = req.params;
  console.log('segment');
  return hostName;
}, {
  proxyReqPathResolver: (req) => {
    const {streamId, streamName, chunkId, tracks, segment, 0: rest } = req.params;
    console.log('fetching segment', segment);
    return `/hls/live/${streamId}/${streamName}/${chunkId}/${tracks}/${decodeURIComponent(rest)}/ts/${decodeURIComponent(rest)}`;
  },
  proxyReqOptDecorator: function(proxyReqOpts) {
    proxyReqOpts.headers['x-forwarded-for'] = '84.22.33.2'
    return proxyReqOpts
  }
}));

app.get('/stream/:hostName/hls/live/:streamId/:streamName/:chunkId/:tracks/*', proxy((req) => {
  const { hostName } = req.params;
  console.log('here')
  return hostName;
}, {
  proxyReqPathResolver: (req) => {
    const { streamId, streamName, chunkId, tracks, 0: rest } = req.params;
    return `/hls/live/${streamId}/${streamName}/${chunkId}/${tracks}/${decodeURIComponent(rest)}`;
  },
  proxyReqOptDecorator: function(proxyReqOpts) {
    proxyReqOpts.headers['x-forwarded-for'] = '84.22.33.2'
    return proxyReqOpts
  }
}));
// Start the server on port 3000
app.listen(process.env.PORT);