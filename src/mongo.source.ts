import * as mongoDB from 'mongodb';
import { MongoConfig } from './mongo.types';
import { buildMongoUrl } from './utils';

/**
 * Represents a MongoDB data source.
 */
export class MongoSource {
  /**
   * IoC token identifier for the MongoSource.
   */
  public static Token = 'MONGO_SOURCE';

  /**
   * Creates a new MongoSource instance and establishes a connection to the MongoDB server.
   * @param {MongoConfig} config - The configuration object for the MongoDB connection.
   * @returns {Promise<MongoSource>} A promise that resolves to a new MongoSource instance.
   */
  public static async create(config: MongoConfig): Promise<MongoSource> {
    const { database } = config;
    const client = new mongoDB.MongoClient(buildMongoUrl(config));

    await client.connect();

    return new MongoSource(client.db(database), client);
  }

  /**
   * Creates a new MongoSource instance.
   * @param {mongoDB.Db} database - The MongoDB database instance.
   * @param {mongoDB.MongoClient} [client] - The MongoDB client instance.
   */
  constructor(public database: mongoDB.Db, public client?: mongoDB.MongoClient) {}
}
