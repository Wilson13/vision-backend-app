/* eslint-disable @typescript-eslint/no-use-before-define */
import mongoose from "mongoose";
import supertest from "supertest";

import app from "../app";
import logger from "../utils/logger";
import Key from "../models/key";
import Phone from "../models/phone";
import { generateJwt } from "../utils/auth_helper";
import { getUsers, createUser } from "../controllers/user";

import * as httpCode from "../utils/constants";
import User from "../models/user";

const request = supertest(app);
// Test key can be swapped out with any valid RSA key
// and can be changed to read from text file if preferred.
const testKey = {
  public: [
    "-----BEGIN PUBLIC KEY-----",
    "MIGeMA0GCSqGSIb3DQEBAQUAA4GMADCBiAKBgHkNUG05cHnCiWRf1GqV4IBMAiTV",
    "uL3Ao/V0QjKEfIyCVjPjofZpd6yaE4avS87vfHSzKWDs0wDmTJHVNKuWfttea31C",
    "Pk6jT4Q6FdCcOUhlJgpKHp8FbtGiybdqNUKKSckppAB4MrbNSpELC0ojqXDvQWeW",
    "isjIvdl8J8uH5MO3AgMBAAE=",
    "-----END PUBLIC KEY-----",
  ],
  private: [
    "-----BEGIN RSA PRIVATE KEY-----",
    "MIICWwIBAAKBgHkNUG05cHnCiWRf1GqV4IBMAiTVuL3Ao/V0QjKEfIyCVjPjofZp",
    "d6yaE4avS87vfHSzKWDs0wDmTJHVNKuWfttea31CPk6jT4Q6FdCcOUhlJgpKHp8F",
    "btGiybdqNUKKSckppAB4MrbNSpELC0ojqXDvQWeWisjIvdl8J8uH5MO3AgMBAAEC",
    "gYAGnrPHRVzhS8I3uwXizk94tK9pVEbGGcLdqX31RUmKZZZRQCGbWCkzRznKI8wB",
    "hRdJSoL4yfrAEdgeIYq/13sYcM92eKy+ZUQ+dwBwFLXw9GML85WHAW9TZYuW3i+6",
    "euV12RS/9bhPuMef74YjqaiuMb89eRGBExnyAyPE2JlgAQJBALN23eDrLs84z8yS",
    "C18LRNKOC8WxldiyT+Fy37n1zbdb/CW6h4/F0xNZH2AaBOc6vIyt/SqhV8u4e+Iq",
    "V38N7U8CQQCsrT7MhgxBnUuf4PqV5HdoBa8vv7U/tnKM1xlGokQQpb9nufgo+jcT",
    "tEADpsHSaG3tC3ivadwWhQAYbysmrjkZAkBFdWsYw02hrFZY0emOxpjDeXC6+imJ",
    "7jGWi1Rl7+nH3tUvcQtIrQMtyN+o3UkqiYQyWqDSoBGP6n4gIc0tgqFnAkEApZNy",
    "FjerZPdpXqMiZbyvasWYmJahO7i82qQfDoXl8nicst+2P8S+L1y1zUqHrDSKw7Qu",
    "QzWk3sslrkha/jotcQJABqCt9qLkok9xsrjOwrGyIruPdadJ2Ib3OY3r3+9rVc+y",
    "0FA8StFBAwNrbY3EFfddrQwzLxTa8/1DSJX4hqI20Q==",
    "-----END RSA PRIVATE KEY-----",
  ],
  developerId: "tester",
};
const dbService = process.env.TEST_DB_SERVICE;
const databaseName = "testDB";
const developerId = "tester";

const privateKeyArr = testKey.private;
const privateKey = privateKeyArr.join("\n");
let token;

/**
 * FIXME:
 * Might want to try running in-memory MongoDB application to drop external dependencies,
 * as Jest doesn't provide a way to stop test programmatically, so even if Mongoose connection
 * fails, the tests still run until "jest.setTimeout.Error: Timeout" is encountered.
 */

// Async handling: callback style
beforeAll(async () => {
  const url = `mongodb://${dbService}/${databaseName}`;
  try {
    await mongoose.connect(url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 500, // Keep trying to send operations for 5 seconds
    });

    // Save key into test DB
    await Key.create(testKey);

    // Generate JWT Token
    token = await generateJwt(privateKey, "developerId", developerId, -1);
  } catch (err) {
    logger.info(err);
    process.exitCode = 0;
  }
});

// Async handling: Return promise style
afterEach(() => {
  return clearColletion();
});

afterAll(async (done) => {
  await Key.deleteMany({});
  await Key.collection.drop();

  await clearColletion();

  // Drop DB to prevent
  // "MongoError: cannot perform operation: a background
  // operation is currently running for collection testDB.keys"
  // await mongoose.connection.dropDatabase();
  // Closing the DB connection allows Jest to exit successfully.
  await mongoose.connection.close();
  done();
});

// Clear commonly used colletions
async function clearColletion(): Promise<void> {
  await User.deleteMany({});
  // await User.collection.drop();

  await Phone.deleteMany({});
  // await Phone.collection.drop();

  return;
}

describe("UserController.getusers", () => {
  it("should have a getUsers function", () => {
    expect(typeof getUsers).toBe("function");
  });

  it("should require a bearer token", async (done) => {
    const res = await request.get("/user");
    expect(res.status).toBe(httpCode.HTTP_UNAUTHORIZED);
    done();
  });

  it("should require a developer ID", async (done) => {
    const res = await request
      .get("/user")
      .set("Authorization", "Bearer " + token);

    expect(res.status).toBe(httpCode.HTTP_BAD_REQUEST);
    done();
  });

  it("should return with empty list of user", async (done) => {
    const expectResult = {
      status: httpCode.HTTP_OK,
      message: "Users retrieved.",
      data: [],
    };

    const res = await request
      .get("/user")
      .query({
        developerId: developerId,
      })
      .set("Authorization", "Bearer " + token);

    expect(res.status).toBe(httpCode.HTTP_OK);
    expect(res.body).toEqual(expectResult);
    done();
  });
});

describe("UserController.createUser", () => {
  it("should have a createUser function", () => {
    expect(typeof createUser).toBe("function");
  });

  it("should require a bearer token", async (done) => {
    const res = await request.get("/user");
    expect(res.status).toBe(httpCode.HTTP_UNAUTHORIZED);
    done();
  });

  it("should require a developer ID", async (done) => {
    const res = await request
      .post("/user")
      .set("Authorization", "Bearer " + token);

    expect(res.status).toBe(httpCode.HTTP_BAD_REQUEST);
    done();
  });

  it("should not create a user with missing body", async (done) => {
    const res = await request
      .post("/user")
      .query({
        developerId: developerId,
      })
      .set("Authorization", "Bearer " + token);

    expect(res.status).toBe(httpCode.HTTP_BAD_REQUEST);
    done();
  });

  it("should not create a user with empty body", async (done) => {
    const res = await request
      .post("/user")
      .send({})
      .query({
        developerId: developerId,
      })
      .set("Authorization", "Bearer " + token);

    expect(res.status).toBe(httpCode.HTTP_BAD_REQUEST);
    done();
  });

  it("should not create a user with missing email", async (done) => {
    const body = {
      firstName: "Test",
      lastName: "User",
      phone: {
        countryCode: "65",
        number: "12345678",
      },
      password: "12345678",
    };

    const res = await request
      .post("/user")
      .send(body)
      .query({
        developerId: developerId,
      })
      .set("Authorization", "Bearer " + token);

    expect(res.status).toBe(httpCode.HTTP_BAD_REQUEST);
    done();
  });

  it("should not create a user with empty email", async (done) => {
    const body = {
      email: "",
      firstName: "Test",
      lastName: "User",
      phone: {
        countryCode: "65",
        number: "12345678",
      },
      password: "12345678",
    };

    const res = await request
      .post("/user")
      .send(body)
      .query({
        developerId: developerId,
      })
      .set("Authorization", "Bearer " + token);

    expect(res.status).toBe(httpCode.HTTP_BAD_REQUEST);
    done();
  });

  it("should not create a user with invalid email", async (done) => {
    const body = {
      email: "testemail",
      firstName: "Test",
      lastName: "User",
      phone: {
        countryCode: "65",
        number: "12345678",
      },
      password: "12345678",
    };

    const res = await request
      .post("/user")
      .send(body)
      .query({
        developerId: developerId,
      })
      .set("Authorization", "Bearer " + token);

    expect(res.status).toBe(httpCode.HTTP_BAD_REQUEST);
    done();
  });

  it("should not create a user with missing phone", async (done) => {
    const body = {
      email: "test@freshturf.org",
      firstName: "Test",
      lastName: "User",
      password: "12345678",
    };

    const res = await request
      .post("/user")
      .send(body)
      .query({
        developerId: developerId,
      })
      .set("Authorization", "Bearer " + token);

    expect(res.status).toBe(httpCode.HTTP_BAD_REQUEST);
    done();
  });

  it("should not create a user with empty phone", async (done) => {
    const body = {
      email: "test@freshturf.org",
      firstName: "Test",
      lastName: "User",
      phone: {},
      password: "12345678",
    };

    const res = await request
      .post("/user")
      .send(body)
      .query({
        developerId: developerId,
      })
      .set("Authorization", "Bearer " + token);

    expect(res.status).toBe(httpCode.HTTP_BAD_REQUEST);
    done();
  });

  it("should not create a user with missing phone.countryCode", async (done) => {
    const body = {
      email: "test@freshturf.org",
      firstName: "Test",
      lastName: "User",
      phone: {
        number: "12345678",
      },
      password: "12345678",
    };

    const res = await request
      .post("/user")
      .send(body)
      .query({
        developerId: developerId,
      })
      .set("Authorization", "Bearer " + token);

    expect(res.status).toBe(httpCode.HTTP_BAD_REQUEST);
    done();
  });

  it("should not create a user with empty phone.countryCode", async (done) => {
    const body = {
      email: "test@freshturf.org",
      firstName: "Test",
      lastName: "User",
      phone: {
        countryCode: "",
        number: "12345678",
      },
      password: "12345678",
    };

    const res = await request
      .post("/user")
      .send(body)
      .query({
        developerId: developerId,
      })
      .set("Authorization", "Bearer " + token);

    expect(res.status).toBe(httpCode.HTTP_BAD_REQUEST);
    done();
  });

  it("should not create a user with missing phone.number", async (done) => {
    const body = {
      email: "test@freshturf.org",
      firstName: "Test",
      lastName: "User",
      phone: {
        countryCode: "65",
      },
      password: "12345678",
    };

    const res = await request
      .post("/user")
      .send(body)
      .query({
        developerId: developerId,
      })
      .set("Authorization", "Bearer " + token);

    expect(res.status).toBe(httpCode.HTTP_BAD_REQUEST);
    done();
  });

  it("should not create a user with empty phone.number", async (done) => {
    const body = {
      email: "test@freshturf.org",
      firstName: "Test",
      lastName: "User",
      phone: {
        countryCode: "65",
        number: "",
      },
      password: "12345678",
    };

    const res = await request
      .post("/user")
      .send(body)
      .query({
        developerId: developerId,
      })
      .set("Authorization", "Bearer " + token);

    expect(res.status).toBe(httpCode.HTTP_BAD_REQUEST);
    done();
  });

  it("should create a user with valid body", async (done) => {
    const body = {
      email: "test@freshturf.org",
      firstName: "Test",
      lastName: "User",
      phone: {
        countryCode: "65",
        number: "12345678",
      },
      password: "12345678",
    };

    const res = await request
      .post("/user")
      .send(body)
      .query({
        developerId: developerId,
      })
      .set("Authorization", "Bearer " + token);

    expect(res.status).toBe(httpCode.HTTP_OK);
    done();
  });

  it("should not create a duplicated user with identical email", async (done) => {
    const userOne = {
      email: "test@freshturf.org",
      firstName: "Test",
      lastName: "User",
      phone: {
        countryCode: "65",
        number: "12345678",
      },
      password: "12345678",
    };

    const userTwo = {
      email: "test@freshturf.org",
      firstName: "Test",
      lastName: "User",
      phone: {
        countryCode: "65",
        number: "87654321",
      },
      password: "12345678",
    };

    // First create an identical user for testing purpose
    await request
      .post("/user")
      .send(userOne)
      .query({
        developerId: developerId,
      })
      .set("Authorization", "Bearer " + token);

    const res = await request
      .post("/user")
      .send(userTwo)
      .query({
        developerId: developerId,
      })
      .set("Authorization", "Bearer " + token);

    expect(res.status).toBe(httpCode.HTTP_CONFLICT);
    done();
  });

  it("should not create a duplicated user with identical phone", async (done) => {
    const userOne = {
      email: "userone@freshturf.org",
      firstName: "Test",
      lastName: "User",
      phone: {
        countryCode: "65",
        number: "12345678",
      },
      password: "12345678",
    };

    const userTwo = {
      email: "usertwo@freshturf.org",
      firstName: "Test",
      lastName: "User",
      phone: {
        countryCode: "65",
        number: "12345678",
      },
      password: "12345678",
    };

    // First create an identical user for testing purpose
    await request
      .post("/user")
      .send(userOne)
      .query({
        developerId: developerId,
      })
      .set("Authorization", "Bearer " + token);

    const res = await request
      .post("/user")
      .send(userTwo)
      .query({
        developerId: developerId,
      })
      .set("Authorization", "Bearer " + token);

    expect(res.status).toBe(httpCode.HTTP_CONFLICT);
    done();
  });

  // afterEach(async done => {
  //   done();
  // });
});
