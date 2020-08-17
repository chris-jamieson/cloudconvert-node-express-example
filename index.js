const express = require("express");
const app = express();
const CloudConvert = require("cloudconvert");

const cloudConvert = new CloudConvert("test");

const PORT = 3000;
const CC_WEBHOOK_SIGNING_SECRET = "086BbcTReh2oWiFUfx3kvgM6KrCYXfJe";

// simple root route
app.get("/", (req, res) => {
  res.status(200);
  res.json({
    message: "OK",
  });
});

// example route without body parser
app.post("/no-body-parser", (req, res) => {
  res.status(200);
  res.json(req.body);
});

// example route with JSON body parser
app.post("/json-body-parser", express.json(), (req, res) => {
  res.status(200);
  res.json(req.body);
});

// example route with raw body parser
app.post(
  "/raw-body-parser",
  express.raw({ type: "application/json" }),
  (req, res) => {
    // req.body will be a buffer
    res.status(200);
    const responseBody = req.body.toString("utf8");
    res.json(responseBody);
  }
);

// verify Cloudconvert webhook signature - text body parser
app.post(
  "/cc-webhook/text-body-parser",
  express.text({ type: "*/*" }),
  (req, res) => {
    const payloadString = req.body;
    const signature = req.get("Cloudconvert-Signature"); // The value of the "CloudConvert-Signature" header

    const isValid = cloudConvert.webhooks.verify(
      payloadString,
      signature,
      CC_WEBHOOK_SIGNING_SECRET
    );

    if (isValid) {
      res.status(200);
      res.send("Webhook signature valid");
    } else {
      res.status(400);
      res.send("Webhook signature invalid");
    }
  }
);

// verify Cloudconvert webhook signature - raw body parser
app.post(
  "/cc-webhook/raw-body-parser",
  express.raw({ type: "*/*" }),
  (req, res) => {
    const signature = req.get("Cloudconvert-Signature"); // The value of the "CloudConvert-Signature" header

    const isValid = cloudConvert.webhooks.verify(
      req.body,
      signature,
      CC_WEBHOOK_SIGNING_SECRET
    );

    if (isValid) {
      res.status(200);
      res.send("Webhook signature valid");
    } else {
      res.status(400);
      res.send("Webhook signature invalid");
    }
  }
);

// verify Cloudconvert webhook signature - JSON body parser
app.post("/cc-webhook/json-body-parser", express.json(), (req, res) => {
  let payloadString = JSON.stringify(req.body, null, 0); // stringify with no spaces
  payloadString = payloadString.replace(/\//g, "\\/"); // then escape backslashes - replace "/" with "\/"

  const signature = req.get("Cloudconvert-Signature"); // The value of the "CloudConvert-Signature" header

  const isValid = cloudConvert.webhooks.verify(
    payloadString,
    signature,
    CC_WEBHOOK_SIGNING_SECRET
  );

  if (isValid) {
    res.status(200);
    res.send("Webhook signature valid");
  } else {
    res.status(400);
    res.send("Webhook signature invalid");
  }
});

// verify Cloudconvert webhook signature - JSON body parser
app.post(
  "/cc-webhook/json-body-parser-raw",
  // uses a handy function suggested by Flavio Copes: https://flaviocopes.com/express-get-raw-body/
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  }),
  (req, res) => {
    const signature = req.get("Cloudconvert-Signature"); // The value of the "CloudConvert-Signature" header

    const isValid = cloudConvert.webhooks.verify(
      req.rawBody,
      signature,
      CC_WEBHOOK_SIGNING_SECRET
    );

    if (isValid) {
      res.status(200);
      res.send("Webhook signature valid");
    } else {
      res.status(400);
      res.send("Webhook signature invalid");
    }
  }
);

app.listen(PORT, () => {
  console.log(`Example app listening at http://localhost:${PORT}`);
});

module.exports = app;
