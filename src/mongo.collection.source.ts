import {
  DataSource,
  DataSourceError,
  log,
  OperationStatus,
  RemoveStats,
  UpdateMethod,
  UpdateStats,
} from '@alien-worlds/aw-core';
import {
  AnyBulkWriteOperation,
  ClientSession,
  Collection,
  Document,
  ObjectId,
  OptionalUnlessRequiredId,
  TransactionOptions,
  UpdateResult,
} from 'mongodb';

import { BulkUpdateOperationsError, PendingSessionError, SessionError } from './errors';
import { MongoSource } from './mongo.source';
import {
  CollectionOptions,
  MongoAggregateParams,
  MongoCountQueryParams,
  MongoDeleteQueryParams,
  MongoFindQueryParams,
  MongoUpdateQueryParams,
} from './mongo.types';
import {
  getDuplicatedDataIds,
  isBulkUpdate,
  isDuplicateError,
  isInvalidDataError,
} from './utils';

export type ObjectWithId = { _id: ObjectId };

/**
 * Represents MongoDB data source.
 * @class
 * @implements {DataSource<T>}
 */
export class MongoCollectionSource<T extends Document = Document>
  implements DataSource<T>
{
  protected collection: Collection<T>;
  protected currentSession: ClientSession;

  /**
   * Constructs a new MongoCollectionSource.
   * @constructor
   * @param {MongoSource} mongoSource - The MongoDB data source.
   * @param {string} collectionName - The name of the collection.
   * @param {CollectionOptions} [options] - The collection options.
   */
  constructor(
    protected mongoSource: MongoSource,
    public readonly collectionName: string,
    protected options?: CollectionOptions
  ) {
    this.collection = this.mongoSource.database.collection<T>(collectionName);
    this.createIndexes();
  }

  /**
   * Creates the collection if it does not exist and ensures the required indexes.
   * @private
   * @returns {Promise<void>} - A promise that resolves when the collection and indexes are created.
   */
  private async createCollection(): Promise<void> {
    const {
      collectionName,
      mongoSource: { database },
    } = this;
    return new Promise(resolve => {
      database.createCollection(collectionName, () => resolve());
    });
  }

  /**
   * Creates the required indexes for the collection if they do not already exist.
   * @private
   * @returns {Promise<void>} - A promise that resolves when the indexes are created.
   */
  private async createIndexes(): Promise<void> {
    try {
      if (this.options?.indexes.length > 0) {
        const {
          options: { indexes },
        } = this;

        await this.createCollection();

        const cursor = this.collection.listIndexes();
        const currentIndexes = await cursor.toArray();

        if (currentIndexes.length < 2) {
          await this.collection.createIndexes(indexes);
        }
      }
    } catch (error) {
      log(this.collectionName, error.message);
    }
  }

  /**
   * Throws a DataSourceError based on the provided error.
   * @private
   * @param {Error} error - The original error.
   * @returns {void}
   * @throws {DataSourceError} - The DataSourceError with the appropriate error type.
   */
  private throwDataSourceError(error: Error) {
    if (isDuplicateError(error)) {
      throw DataSourceError.createDuplicateError(error, {
        data: getDuplicatedDataIds(error),
      });
    }

    if (isInvalidDataError(error)) {
      throw DataSourceError.createInvalidDataError(error);
    }

    throw DataSourceError.createError(error);
  }

  /**
   * Finds documents in the collection based on the provided query parameters.
   * @param {MongoFindQueryParams<T>} [query] - The query parameters.
   * @returns {Promise<T[]>} - A promise that resolves to an array of found documents.
   */
  public async find(query?: MongoFindQueryParams<T>): Promise<T[]> {
    try {
      const filter = query?.filter || {};
      const options = query?.options || {};
      const cursor = this.collection.find<T>(filter, options);
      const list = await cursor.toArray();
      return list;
    } catch (error) {
      this.throwDataSourceError(error);
    }
  }

  /**
   * Counts documents in the collection based on the provided query parameters.
   * @param {MongoCountQueryParams<T>} [query] - The query parameters.
   * @returns {Promise<number>} - A promise that resolves to the count of documents.
   */
  public async count(query?: MongoCountQueryParams<T>): Promise<number> {
    try {
      const filter = query?.filter || {};
      const options = query?.options || {};
      const count = await this.collection.countDocuments(filter, options);
      return count;
    } catch (error) {
      this.throwDataSourceError(error);
    }
  }

  /**
   * Executes an aggregation pipeline on the collection.
   * @param {MongoAggregateParams} query - The aggregation query parameters.
   * @returns {Promise<AggregationType[]>} - A promise that resolves to the result of the aggregation.
   */
  public async aggregate<AggregationType = T>(
    query: MongoAggregateParams
  ): Promise<AggregationType[]> {
    try {
      const { pipeline, options } = query;
      if (options) {
        options.allowDiskUse = true;
      }
      const cursor = this.collection.aggregate<AggregationType>(pipeline, options);
      const list = await cursor.toArray();
      return list;
    } catch (error) {
      this.throwDataSourceError(error);
    }
  }

  /**
   * Updates documents in the collection based on the provided update parameters.
   * @param {MongoUpdateQueryParams<T> | AnyBulkWriteOperation<T>[]} query - The update parameters.
   * @returns {Promise<UpdateStats>} - A promise that resolves to the update statistics.
   */
  public async update(
    query: MongoUpdateQueryParams<T> | AnyBulkWriteOperation<T>[]
  ): Promise<UpdateStats> {
    try {
      if (Array.isArray(query)) {
        if (isBulkUpdate<T>(query)) {
          const updateResult = await this.collection.bulkWrite(query);
          const { matchedCount, modifiedCount, upsertedCount, upsertedIds } =
            updateResult;
          return {
            status: matchedCount > 0 ? OperationStatus.Success : OperationStatus.Failure,
            modifiedCount: modifiedCount,
            upsertedCount: upsertedCount,
            upsertedIds: upsertedIds ? Object.values(upsertedIds) : [],
          };
        }

        throw new BulkUpdateOperationsError();
      }

      const { filter, update, options, method } = query;
      let updateResult: UpdateResult;

      if (method === UpdateMethod.UpdateOne) {
        updateResult = await this.collection.updateOne(filter, update, options);
      } else {
        const updateManyResult = await this.collection.updateMany(
          filter,
          update,
          options
        );

        updateResult = updateManyResult as UpdateResult;
      }

      const { matchedCount, modifiedCount, upsertedCount, upsertedId } = updateResult;

      return {
        status: matchedCount > 0 ? OperationStatus.Success : OperationStatus.Failure,
        modifiedCount: modifiedCount,
        upsertedCount: upsertedCount,
        upsertedIds: upsertedId ? [upsertedId] : [],
      };
    } catch (error) {
      this.throwDataSourceError(error);
    }
  }

  /**
   * Inserts documents into the collection.
   * @param {OptionalUnlessRequiredId<T>[]} query - The documents to insert.
   * @returns {Promise<T[]>} - A promise that resolves to the inserted documents.
   */
  public async insert(query: OptionalUnlessRequiredId<T>[]): Promise<T[]> {
    try {
      const insertResult = await this.collection.insertMany(query);
      const insertedDocuments = query.map((document, index) => ({
        _id: insertResult.insertedIds[index],
        ...document,
      }));

      return insertedDocuments as T[];
    } catch (error) {
      this.throwDataSourceError(error);
    }
  }

  /**
   * Removes documents from the collection based on the provided query parameters.
   * @param {MongoDeleteQueryParams} query - The query parameters.
   * @returns {Promise<RemoveStats>} - A promise that resolves to the remove statistics.
   */
  public async remove(query: MongoDeleteQueryParams<T>): Promise<RemoveStats> {
    try {
      const { acknowledged, deletedCount } = await this.collection.deleteMany(
        query.filter
      );
      const status =
        acknowledged && deletedCount > 0
          ? OperationStatus.Success
          : acknowledged && deletedCount === 0
          ? OperationStatus.Failure
          : OperationStatus.Pending;

      return {
        status,
        deletedCount,
      };
    } catch (error) {
      this.throwDataSourceError(error);
    }
  }

  /**
   * Starts a transaction on the current session.
   * @param {TransactionOptions} [options] - The transaction options.
   * @returns {Promise<void>} - A promise that resolves when the transaction starts.
   */
  public async startTransaction(options?: TransactionOptions): Promise<void> {
    if (this.currentSession) {
      throw DataSourceError.createError(new PendingSessionError());
    }
    try {
      this.currentSession = this.mongoSource.client.startSession();
      this.currentSession.startTransaction(options);
    } catch (error) {
      throw DataSourceError.createError(new SessionError(error));
    }
  }

  /**
   * Commits the current transaction.
   * @returns {Promise<void>} - A promise that resolves when the transaction is committed.
   */
  public async commitTransaction(): Promise<void> {
    if (this.currentSession) {
      try {
        await this.currentSession.commitTransaction();
        await this.currentSession.endSession();
        this.currentSession = null;
      } catch (error) {
        throw DataSourceError.createError(new SessionError(error));
      }
    }
  }

  /**
   * Rolls back the current transaction.
   * @returns {Promise<void>} - A promise that resolves when the transaction is rolled back.
   */
  public async rollbackTransaction(): Promise<void> {
    if (this.currentSession) {
      try {
        await this.currentSession.abortTransaction();
        await this.currentSession.endSession();
        this.currentSession = null;
      } catch (error) {
        throw DataSourceError.createError(new SessionError(error));
      }
    }
  }
}
