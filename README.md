# Cloudconvert Express webhook signature verification example

Simple Express app with tests to demonstrate how to verify a cloudconvert webhook signature, using [cloudconvert-node](https://github.com/cloudconvert/cloudconvert-node/) package.

## Usage

- `npm install`
- `npm test`

## Body parser: raw vs JSON

As the test cases indicate, using these parameters:

- signature: `3b5dc4adda54e931283c181b2ec504ed74c66ce81e0624634ad06f057c5a4a3a`
- webhook secret: `086BbcTReh2oWiFUfx3kvgM6KrCYXfJe`

When using `cloudConvert.webhooks.verify()`:

The following input string is treated as valid:

```
{"event":"job.created","job":{"id":"888c61f6-cce4-4f45-b2ed-3c4ea4a10d00","tag":"fil_1ifttnnkdpw3h0t","status":"waiting","created_at":"2020-08-17T13:43:16+00:00","started_at":null,"ended_at":null,"tasks":[{"id":"c0c2d4eb-c3f2-4091-ade0-c6ced7765818","name":"import-file-from-s3","job_id":"888c61f6-cce4-4f45-b2ed-3c4ea4a10d00","status":"waiting","credits":null,"code":null,"message":null,"percent":100,"operation":"import\/url","result":null,"created_at":"2020-08-17T13:43:16+00:00","started_at":null,"ended_at":null,"retry_of_task_id":null,"copy_of_task_id":null,"user_id":42896161,"priority":10,"host_name":null,"storage":null,"depends_on_task_ids":[],"links":{"self":"https:\/\/api.sandbox.cloudconvert.com\/v2\/tasks\/c0c2d4eb-c3f2-4091-ade0-c6ced7765818"}},{"id":"971f81b3-fae5-4733-952d-6383d2dc4142","name":"convert-file","job_id":"888c61f6-cce4-4f45-b2ed-3c4ea4a10d00","status":"waiting","credits":null,"code":null,"message":null,"percent":100,"operation":"convert","engine":null,"engine_version":null,"result":null,"created_at":"2020-08-17T13:43:16+00:00","started_at":null,"ended_at":null,"retry_of_task_id":null,"copy_of_task_id":null,"user_id":42896161,"priority":10,"host_name":null,"storage":null,"depends_on_task_ids":["c0c2d4eb-c3f2-4091-ade0-c6ced7765818"],"links":{"self":"https:\/\/api.sandbox.cloudconvert.com\/v2\/tasks\/971f81b3-fae5-4733-952d-6383d2dc4142"}},{"id":"ec07c611-7d34-4417-a0ea-3ff9e7dded2b","name":"export-file-to-s3","job_id":"888c61f6-cce4-4f45-b2ed-3c4ea4a10d00","status":"waiting","credits":null,"code":null,"message":null,"percent":100,"operation":"export\/s3","result":null,"created_at":"2020-08-17T13:43:16+00:00","started_at":null,"ended_at":null,"retry_of_task_id":null,"copy_of_task_id":null,"user_id":42896161,"priority":10,"host_name":null,"storage":null,"depends_on_task_ids":["971f81b3-fae5-4733-952d-6383d2dc4142"],"links":{"self":"https:\/\/api.sandbox.cloudconvert.com\/v2\/tasks\/ec07c611-7d34-4417-a0ea-3ff9e7dded2b"}}],"links":{"self":"https:\/\/api.sandbox.cloudconvert.com\/v2\/jobs\/888c61f6-cce4-4f45-b2ed-3c4ea4a10d00"}}}
```

Note that the escape characters (e.g. `\/`) must be preserved for the webhook to be treated as valid. Therefore if using this string in tests, use `String.raw`

Therefore you cannot simply use `JSON.stringify()` after using `express.json()` body parser middleware.

`index.js` contains 4 variations of body parsing and how to use them to verify cloudconvert webhook signatures:

### .text()

```javascript
app.post(
  "/cc-webhook/text-body-parser",
  express.text({ type: "*/*" }),
  (req, res) => {
    const payloadString = req.body;
    const signature = req.get("Cloudconvert-Signature");

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
```

### .raw()

```javascript
app.post(
  "/cc-webhook/raw-body-parser",
  express.raw({ type: "*/*" }),
  (req, res) => {
    const payloadString = req.body.toString("utf8"); // req.body will be a buffer
    const signature = req.get("Cloudconvert-Signature");

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
```

### .json()

```javascript
app.post("/cc-webhook/json-body-parser", express.json(), (req, res) => {
  let payloadString = JSON.stringify(req.body, null, 0); // stringify with no spaces
  payloadString = payloadString.replace(/\//g, "\\/"); // then escape backslashes - replace "/" with "\/"

  const signature = req.get("Cloudconvert-Signature");

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
```

### .json() with verify function

```javascript
app.post(
  "/cc-webhook/json-body-parser-raw",
  // uses a handy function suggested by Flavio Copes: https://flaviocopes.com/express-get-raw-body/
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  }),
  (req, res) => {
    payloadString = req.rawBody.toString("utf8");

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
```
