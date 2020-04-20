/* eslint-disable @typescript-eslint/no-use-before-define */
import mongoose from "mongoose";
import supertest from "supertest";

import app from "../app";
import logger from "../utils/logger";
import Key from "../models/key";
import Phone from "../models/phone";
import { getUsers, createUser } from "../controllers/user";

import * as httpCode from "../utils/constants";
import User from "../models/user";

const request = supertest(app);
const dbService = process.env.TEST_DB_SERVICE;
const databaseName = "testDB";

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

  it("should return with empty list of user", async (done) => {
    const expectResult = {
      status: httpCode.HTTP_OK,
      message: "Users retrieved.",
      data: [],
    };

    const res = await request.get("/user");
    expect(res.status).toBe(httpCode.HTTP_OK);
    expect(res.body).toEqual(expectResult);
    done();
  });
});

describe("UserController.createUser", () => {
  it("should have a createUser function", () => {
    expect(typeof createUser).toBe("function");
  });

  it("should not create a user with missing body", async (done) => {
    const res = await request.post("/user");
    expect(res.status).toBe(httpCode.HTTP_BAD_REQUEST);
    done();
  });

  it("should not create a user with empty body", async (done) => {
    const res = await request.post("/user").send({});
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

    const res = await request.post("/user").send(body);
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

    const res = await request.post("/user").send(body);
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

    const res = await request.post("/user").send(body);
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

    const res = await request.post("/user").send(body);
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

    const res = await request.post("/user").send(body);
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

    const res = await request.post("/user").send(body);
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

    const res = await request.post("/user").send(body);
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

    const res = await request.post("/user").send(body);
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

    const res = await request.post("/user").send(body);
    expect(res.status).toBe(httpCode.HTTP_BAD_REQUEST);
    done();
  });

  // it("should create a user with valid body", async (done) => {
  //   const body = {
  //     email: "test@freshturf.org",
  //     firstName: "Test",
  //     lastName: "User",
  //     phone: {
  //       countryCode: "65",
  //       number: "12345678",
  //     },
  //     password: "12345678",
  //   };

  //   const res = await request
  //     .post("/user")
  //     .send(body)
  //     .query({
  //       developerId: developerId,
  //     })
  //     ;

  //   expect(res.status).toBe(httpCode.HTTP_OK);
  //   done();
  // });

  // it("should not create a duplicated user with identical email", async (done) => {
  //   const userOne = {
  //     email: "test@freshturf.org",
  //     firstName: "Test",
  //     lastName: "User",
  //     phone: {
  //       countryCode: "65",
  //       number: "12345678",
  //     },
  //     password: "12345678",
  //   };

  //   const userTwo = {
  //     email: "test@freshturf.org",
  //     firstName: "Test",
  //     lastName: "User",
  //     phone: {
  //       countryCode: "65",
  //       number: "87654321",
  //     },
  //     password: "12345678",
  //   };

  //   // First create an identical user for testing purpose
  //   await request
  //     .post("/user")
  //     .send(userOne)
  //     .query({
  //       developerId: developerId,
  //     })
  //     ;

  //   const res = await request
  //     .post("/user")
  //     .send(userTwo)
  //     .query({
  //       developerId: developerId,
  //     })
  //     ;

  //   expect(res.status).toBe(httpCode.HTTP_CONFLICT);
  //   done();
  // });

  // it("should not create a duplicated user with identical phone", async (done) => {
  //   const userOne = {
  //     email: "userone@freshturf.org",
  //     firstName: "Test",
  //     lastName: "User",
  //     phone: {
  //       countryCode: "65",
  //       number: "12345678",
  //     },
  //     password: "12345678",
  //   };

  //   const userTwo = {
  //     email: "usertwo@freshturf.org",
  //     firstName: "Test",
  //     lastName: "User",
  //     phone: {
  //       countryCode: "65",
  //       number: "12345678",
  //     },
  //     password: "12345678",
  //   };

  //   // First create an identical user for testing purpose
  //   await request
  //     .post("/user")
  //     .send(userOne)
  //     .query({
  //       developerId: developerId,
  //     })
  //     ;

  //   const res = await request
  //     .post("/user")
  //     .send(userTwo)
  //     .query({
  //       developerId: developerId,
  //     })
  //     ;

  //   expect(res.status).toBe(httpCode.HTTP_CONFLICT);
  //   done();
  // });

  // afterEach(async done => {
  //   done();
  // });
});
