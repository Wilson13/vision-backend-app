import mongoose from "mongoose";
mongoose.Promise = global.Promise;
let isConnected;

export function connectToDatabase(): Promise<void> {
  if (isConnected) {
    console.log("=> using existing database connection");
    return Promise.resolve();
  }

  const dbOptions = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    user: process.env.DB_USER,
    pass: process.env.DB_PASSWORD,
  };

  const dbURI = process.env.DB_URI;
  //   const db = mongoose.connection;
  console.log("=> using new database connection");
  //   return mongoose.connect(process.env.DB).then((db) => {
  //     isConnected = db.connections[0].readyState;
  //   });
  return mongoose.connect(dbURI, dbOptions).then((db) => {
    isConnected = db.connections[0].readyState;
  });
  // .catch((err) => logger.info("connect error: ", err));
}
