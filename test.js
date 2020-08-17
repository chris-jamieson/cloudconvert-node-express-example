const request = require("supertest");
const chai = require("chai");

const app = require("./index");

const expect = chai.expect;
chai.config.includeStack = true;

describe("Simple route", () => {
  it("should return 200 OK", (done) => {
    request(app)
      .get(`/`)
      .expect(200)
      .then((res) => {
        expect(res.body).to.be.an("object");
        expect(res.body).to.have.property("message");
        expect(res.body.message).to.equal("OK");
        return done();
      })
      .catch(done);
  });
});

describe("Using no body parser", () => {
  it("should return empty request body (no parser)", (done) => {
    request(app)
      .post(`/no-body-parser`)
      .send({
        example: "test",
      })
      .expect(200)
      .then((res) => {
        expect(res.body).to.be.empty; // request body not parsed so response body is empty
        return done();
      })
      .catch(done);
  });
});

describe("Using JSON body parser", () => {
  it("should return empty request body (no parser)", (done) => {
    const requestBody = { example: "test" };

    request(app)
      .post(`/json-body-parser`)
      .send(requestBody)
      .expect(200)
      .then((res) => {
        expect(res.body).not.to.be.empty;
        expect(res.body).to.be.an("object");
        expect(res.body).to.deep.equal(requestBody);
        return done();
      })
      .catch(done);
  });
});

describe("Using raw body parser", () => {
  it("should return empty request body (no parser)", (done) => {
    const requestBody = { example: "test" };

    request(app)
      .post(`/raw-body-parser`)
      .send(requestBody)
      .expect(200)
      .then((res) => {
        // handler transforms to UTF-8 string
        expect(res.body).to.equal(JSON.stringify(requestBody));
        return done();
      })
      .catch(done);
  });
});

describe("Cloudconvert webhook verification", () => {
  const signature =
    "3b5dc4adda54e931283c181b2ec504ed74c66ce81e0624634ad06f057c5a4a3a"; // valid with webhook secret D63eBmptH4Wrx33R5ZmqLeOJ6n7ApMq1

  // NB String.raw is very important - must be used to preserve escape characters for tests - see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/raw
  const requestBody = String.raw`{"event":"job.created","job":{"id":"888c61f6-cce4-4f45-b2ed-3c4ea4a10d00","tag":"fil_1ifttnnkdpw3h0t","status":"waiting","created_at":"2020-08-17T13:43:16+00:00","started_at":null,"ended_at":null,"tasks":[{"id":"c0c2d4eb-c3f2-4091-ade0-c6ced7765818","name":"import-file-from-s3","job_id":"888c61f6-cce4-4f45-b2ed-3c4ea4a10d00","status":"waiting","credits":null,"code":null,"message":null,"percent":100,"operation":"import\/url","result":null,"created_at":"2020-08-17T13:43:16+00:00","started_at":null,"ended_at":null,"retry_of_task_id":null,"copy_of_task_id":null,"user_id":42896161,"priority":10,"host_name":null,"storage":null,"depends_on_task_ids":[],"links":{"self":"https:\/\/api.sandbox.cloudconvert.com\/v2\/tasks\/c0c2d4eb-c3f2-4091-ade0-c6ced7765818"}},{"id":"971f81b3-fae5-4733-952d-6383d2dc4142","name":"convert-file","job_id":"888c61f6-cce4-4f45-b2ed-3c4ea4a10d00","status":"waiting","credits":null,"code":null,"message":null,"percent":100,"operation":"convert","engine":null,"engine_version":null,"result":null,"created_at":"2020-08-17T13:43:16+00:00","started_at":null,"ended_at":null,"retry_of_task_id":null,"copy_of_task_id":null,"user_id":42896161,"priority":10,"host_name":null,"storage":null,"depends_on_task_ids":["c0c2d4eb-c3f2-4091-ade0-c6ced7765818"],"links":{"self":"https:\/\/api.sandbox.cloudconvert.com\/v2\/tasks\/971f81b3-fae5-4733-952d-6383d2dc4142"}},{"id":"ec07c611-7d34-4417-a0ea-3ff9e7dded2b","name":"export-file-to-s3","job_id":"888c61f6-cce4-4f45-b2ed-3c4ea4a10d00","status":"waiting","credits":null,"code":null,"message":null,"percent":100,"operation":"export\/s3","result":null,"created_at":"2020-08-17T13:43:16+00:00","started_at":null,"ended_at":null,"retry_of_task_id":null,"copy_of_task_id":null,"user_id":42896161,"priority":10,"host_name":null,"storage":null,"depends_on_task_ids":["971f81b3-fae5-4733-952d-6383d2dc4142"],"links":{"self":"https:\/\/api.sandbox.cloudconvert.com\/v2\/tasks\/ec07c611-7d34-4417-a0ea-3ff9e7dded2b"}}],"links":{"self":"https:\/\/api.sandbox.cloudconvert.com\/v2\/jobs\/888c61f6-cce4-4f45-b2ed-3c4ea4a10d00"}}}`;

  describe("using JSON body parser", () => {
    it("should verify valid signature", (done) => {
      request(app)
        .post(`/cc-webhook/json-body-parser`)
        .set("Cloudconvert-Signature", signature)
        .set("Content-Type", "application/json")
        .send(requestBody)
        .expect(200)
        .then((res) => {
          expect(res.text).not.to.be.empty;
          expect(res.text).to.equal("Webhook signature valid");
          return done();
        })
        .catch(done);
    });

    it("should not verify invalid signature", (done) => {
      request(app)
        .post(`/cc-webhook/json-body-parser`)
        .set("Cloudconvert-Signature", "invalid signature")
        .set("Content-Type", "application/json")
        .send(requestBody)
        .expect(400)
        .then((res) => {
          expect(res.text).not.to.be.empty;
          expect(res.text).to.equal("Webhook signature invalid");
          return done();
        })
        .catch(done);
    });
  });

  describe("using JSON body parser with rawBody verify function", () => {
    it("should verify valid signature", (done) => {
      request(app)
        .post(`/cc-webhook/json-body-parser-raw`)
        .set("Cloudconvert-Signature", signature)
        .set("Content-Type", "application/json")
        .send(requestBody)
        .expect(200)
        .then((res) => {
          expect(res.text).not.to.be.empty;
          expect(res.text).to.equal("Webhook signature valid");
          return done();
        })
        .catch(done);
    });

    it("should not verify invalid signature", (done) => {
      request(app)
        .post(`/cc-webhook/json-body-parser-raw`)
        .set("Cloudconvert-Signature", "invalid signature")
        .set("Content-Type", "application/json")
        .send(requestBody)
        .expect(400)
        .then((res) => {
          expect(res.text).not.to.be.empty;
          expect(res.text).to.equal("Webhook signature invalid");
          return done();
        })
        .catch(done);
    });
  });

  describe("using text body parser", () => {
    it("should verify valid signature", (done) => {
      request(app)
        .post(`/cc-webhook/text-body-parser`)
        .set("Cloudconvert-Signature", signature)
        .set("Content-Type", "text/plain")
        .send(requestBody)
        .expect(200)
        .then((res) => {
          expect(res.text).not.to.be.empty;
          expect(res.text).to.equal("Webhook signature valid");
          return done();
        })
        .catch(done);
    });

    it("should not verify invalid signature", (done) => {
      request(app)
        .post(`/cc-webhook/text-body-parser`)
        .set("Cloudconvert-Signature", "invalid signature")
        .set("Content-Type", "text/plain")
        .send(requestBody)
        .expect(400)
        .then((res) => {
          expect(res.text).not.to.be.empty;
          expect(res.text).to.equal("Webhook signature invalid");
          return done();
        })
        .catch(done);
    });
  });

  describe("using raw body parser", () => {
    it("should verify valid signature", (done) => {
      request(app)
        .post(`/cc-webhook/raw-body-parser`)
        .set("Cloudconvert-Signature", signature)
        .send(requestBody)
        .expect(200)
        .then((res) => {
          expect(res.text).not.to.be.empty;
          expect(res.text).to.equal("Webhook signature valid");
          return done();
        })
        .catch(done);
    });

    it("should not verify invalid signature", (done) => {
      request(app)
        .post(`/cc-webhook/raw-body-parser`)
        .set("Cloudconvert-Signature", "invalid signature")
        .send(requestBody)
        .expect(400)
        .then((res) => {
          expect(res.text).not.to.be.empty;
          expect(res.text).to.equal("Webhook signature invalid");
          return done();
        })
        .catch(done);
    });
  });
});
