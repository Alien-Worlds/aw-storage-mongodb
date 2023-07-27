import { ClientSession, Collection, ObjectId, TransactionOptions } from 'mongodb';
import { MongoCollectionSource, ObjectWithId } from '../mongo.collection.source';
import { MongoSource } from '../mongo.source';
import { DataSourceError, OperationStatus } from '@alien-worlds/aw-core';
import { BulkUpdateOperationsError } from '../errors';
import { isBulkUpdate, isDuplicateError, isInvalidDataError } from '../utils';

jest.mock('../mongo.source');

jest.mock('../utils', () => ({
  isDuplicateError: jest.fn(),
  isInvalidDataError: jest.fn(),
  getDuplicatedDataIds: jest.fn(),
  isBulkUpdate: jest.fn(),
}));

describe('MongoCollectionSource', () => {
  let mongoSource: MongoSource;
  let collection: Collection<ObjectWithId>;
  let mongoCollectionSource: MongoCollectionSource<ObjectWithId>;

  beforeAll(() => {
    collection = {
      find: jest.fn(),
      bulkWrite: jest.fn(),
      countDocuments: jest.fn(),
      aggregate: jest.fn(),
      updateMany: jest.fn(),
      insertMany: jest.fn(),
      deleteMany: jest.fn(),
      listIndexes: jest.fn(),
      createIndexes: jest.fn(),
    } as unknown as Collection<ObjectWithId>;

    mongoSource = {
      database: {
        collection: jest.fn().mockReturnValue(collection),
        createCollection: jest.fn(),
      },
      client: {
        startSession: jest.fn().mockReturnValue({
          startTransaction: jest.fn(),
          commitTransaction: jest.fn(),
          abortTransaction: jest.fn(),
        }),
        endSession: jest.fn(),
      },
    } as unknown as MongoSource;

    mongoCollectionSource = new MongoCollectionSource(mongoSource, 'testCollection');
  });

  describe('createIndexes', () => {
    it('should create indexes when none exist', async () => {
      const indexes = [
        { name: 'index1', key: { field1: 1 } },
        { name: 'index2', key: { field2: 1 } },
      ];

      const createCollectionSpy = jest
        .spyOn(mongoCollectionSource as any, 'createCollection')
        .mockResolvedValue({} as any);

      (mongoSource.database.createCollection as jest.Mock).mockResolvedValue({});

      (collection.listIndexes as jest.Mock).mockReturnValueOnce({
        toArray: jest.fn().mockResolvedValueOnce([]),
      } as any);
      (mongoCollectionSource as any).options = { indexes };

      await (mongoCollectionSource as any).createIndexes();

      expect(collection.listIndexes).toHaveBeenCalled();
      expect(collection.createIndexes).toHaveBeenCalledWith(indexes);
      createCollectionSpy.mockClear();
    });
  });

  describe('find', () => {
    it('should find documents in the collection', async () => {
      const query = { filter: { name: 'John Doe' } };
      const expectedDocuments = [{ _id: new ObjectId(), name: 'John Doe' }];
      (collection.find as jest.Mock).mockReturnValueOnce({
        toArray: jest.fn().mockResolvedValueOnce(expectedDocuments),
      });

      const result = await mongoCollectionSource.find(query);

      expect(collection.find).toHaveBeenCalled();
      expect(result).toEqual(expectedDocuments);
    });

    it('should throw a DataSourceError if an error occurs', async () => {
      const query = { filter: { name: 'John Doe' } };
      const error = new Error('Mocked error');
      (collection.find as jest.Mock).mockReturnValueOnce({
        toArray: jest.fn().mockRejectedValueOnce(error),
      });

      try {
        await mongoCollectionSource.find(query);
        expect(true).toBe(false);
      } catch (error) {
        expect(error instanceof DataSourceError).toBe(true);
      }
    });
  });

  describe('count', () => {
    it('should count documents in the collection', async () => {
      const query = { filter: { name: 'John Doe' } };
      const expectedCount = 5;
      (collection.countDocuments as jest.Mock).mockResolvedValueOnce(expectedCount);

      const result = await mongoCollectionSource.count(query);

      expect(collection.countDocuments).toHaveBeenCalled();
      expect(result).toEqual(expectedCount);
    });

    it('should throw a DataSourceError if an error occurs', async () => {
      const query = { filter: { name: 'John Doe' } };
      const error = new Error('Mocked error');
      (collection.countDocuments as jest.Mock).mockRejectedValueOnce(error);

      await expect(mongoCollectionSource.count(query)).rejects.toThrow(DataSourceError);
    });
  });

  describe('aggregate', () => {
    it('should execute an aggregation pipeline on the collection', async () => {
      const pipeline = [{ $match: { name: 'John Doe' } }];
      const expectedDocuments = [{ _id: new ObjectId(), name: 'John Doe' }];
      (collection.aggregate as jest.Mock).mockReturnValueOnce({
        toArray: jest.fn().mockResolvedValueOnce(expectedDocuments),
      });

      const result = await mongoCollectionSource.aggregate({ pipeline });

      expect(collection.aggregate).toHaveBeenCalledWith(pipeline, undefined);
      expect(result).toEqual(expectedDocuments);
    });

    it('should throw a DataSourceError if an error occurs', async () => {
      const pipeline = [{ $match: { name: 'John Doe' } }];
      const error = new Error('Mocked error');
      (collection.aggregate as jest.Mock).mockReturnValueOnce({
        toArray: jest.fn().mockRejectedValueOnce(error),
      });

      await expect(mongoCollectionSource.aggregate({ pipeline })).rejects.toThrow(
        DataSourceError
      );
    });
  });

  describe('update', () => {
    it('should update documents in the collection', async () => {
      const query = {
        filter: { name: 'John Doe' },
        update: { $set: { age: 30 } },
      } as any;
      const expectedStats = {
        status: OperationStatus.Success,
        modifiedCount: 2,
        upsertedCount: 0,
        upsertedIds: [],
      };
      (collection.updateMany as jest.Mock).mockResolvedValueOnce({
        matchedCount: 2,
        modifiedCount: 2,
        upsertedCount: 0,
        upsertedId: null,
      });

      const result = await mongoCollectionSource.update(query);

      expect(collection.updateMany).toHaveBeenCalledWith(
        query.filter,
        query.update,
        undefined
      );
      expect(result).toEqual(expectedStats);
    });

    it('should update documents in the collection', async () => {
      const query = [
        {
          updateOne: { filter: { name: 'John Doe' }, update: { $set: { age: 30 } } },
        },
      ] as any;
      const expectedStats = {
        status: OperationStatus.Success,
        modifiedCount: 2,
        upsertedCount: 0,
        upsertedIds: [],
      };
      (isBulkUpdate as jest.Mock).mockReturnValue(true);
      (collection.bulkWrite as jest.Mock).mockResolvedValueOnce({
        matchedCount: 2,
        modifiedCount: 2,
        upsertedCount: 0,
        upsertedIds: [],
      });
      const result = await mongoCollectionSource.update(query);

      expect(collection.bulkWrite).toHaveBeenCalledWith([
        { updateOne: { filter: { name: 'John Doe' }, update: { $set: { age: 30 } } } },
      ]);
      expect(result).toEqual(expectedStats);
    });

    it('should throw error when bulkWrite operations are not updateOne or updateMany', async () => {
      const query = [
        {
          updateOne: { filter: { name: 'John Doe' }, update: { $set: { age: 30 } } },
        },
      ] as any;
      (isBulkUpdate as jest.Mock).mockReturnValue(false);

      (collection.bulkWrite as jest.Mock).mockResolvedValueOnce({
        matchedCount: 2,
        modifiedCount: 2,
        upsertedCount: 0,
        upsertedId: null,
      });
      try {
        await mongoCollectionSource.update(query);
      } catch (error) {
        expect(error.error).toBeInstanceOf(BulkUpdateOperationsError);
      }
    });

    it('should throw a DataSourceError if an error occurs', async () => {
      const query = {
        filter: { name: 'John Doe' },
        update: { $set: { age: 30 } },
      } as any;
      const error = new Error('Mocked error');
      (collection.updateMany as jest.Mock).mockRejectedValueOnce(error);

      await expect(mongoCollectionSource.update(query)).rejects.toThrow(DataSourceError);
    });

    it('should throw a DataSourceError if the query is an array of bulk write operations', async () => {
      const query = [
        { updateOne: { filter: { name: 'John Doe' }, update: { $set: { age: 30 } } } },
      ] as any;
      const error = new BulkUpdateOperationsError();
      (collection.bulkWrite as jest.Mock).mockRejectedValueOnce(error);

      await expect(mongoCollectionSource.update(query)).rejects.toThrow(DataSourceError);
    });
  });

  describe('insert', () => {
    it('should insert documents into the collection', async () => {
      const documents = [{ name: 'John Doe' }, { name: 'Jane Smith' }] as any;
      const insertResult = {
        insertedIds: [new ObjectId(), new ObjectId()],
      };
      (collection.insertMany as jest.Mock).mockResolvedValueOnce(insertResult);

      const result = await mongoCollectionSource.insert(documents);

      expect(collection.insertMany).toHaveBeenCalledWith(documents);
      expect(result.length).toEqual(2);
      expect(result[0]).toHaveProperty('_id', insertResult.insertedIds[0]);
      expect(result[1]).toHaveProperty('_id', insertResult.insertedIds[1]);
    });

    it('should throw a DataSourceError if an error occurs', async () => {
      const documents = [{ name: 'John Doe' }, { name: 'Jane Smith' }] as any;
      const error = new Error('Mocked error');
      (collection.insertMany as jest.Mock).mockRejectedValueOnce(error);

      await expect(mongoCollectionSource.insert(documents)).rejects.toThrow(
        DataSourceError
      );
    });
  });

  describe('remove', () => {
    it('should remove documents from the collection', async () => {
      const query = { filter: { name: 'John Doe' } };
      const expectedStats = {
        status: OperationStatus.Success,
        deletedCount: 2,
      };
      (collection.deleteMany as jest.Mock).mockResolvedValueOnce({
        acknowledged: true,
        deletedCount: 2,
      });

      const result = await mongoCollectionSource.remove(query);

      expect(collection.deleteMany).toHaveBeenCalled();
      expect(result).toEqual(expectedStats);
    });

    it('should throw a DataSourceError if an error occurs', async () => {
      const query = { filter: { name: 'John Doe' } };
      const error = new Error('Mocked error');
      (collection.deleteMany as jest.Mock).mockRejectedValueOnce(error);

      await expect(mongoCollectionSource.remove(query)).rejects.toThrow(DataSourceError);
    });
  });

  describe('startTransaction', () => {
    it('should start a transaction on the current session', async () => {
      const options: TransactionOptions = {};
      const startTransactionMock = jest.fn();
      const sessionMock = {
        startTransaction: startTransactionMock,
      };
      (mongoSource.client.startSession as jest.Mock).mockReturnValueOnce(sessionMock);

      await mongoCollectionSource.startTransaction(options);

      expect(mongoSource.client.startSession).toHaveBeenCalled();
      expect(startTransactionMock).toHaveBeenCalledWith(options);
      expect((mongoCollectionSource as any).currentSession).toBe(sessionMock);
    });

    it('should throw a DataSourceError if a pending session exists', async () => {
      (mongoCollectionSource as any).currentSession = {} as ClientSession;

      await expect(mongoCollectionSource.startTransaction()).rejects.toThrow(
        DataSourceError
      );
      expect(mongoSource.client.startSession).not.toHaveBeenCalled();
    });

    it('should throw a DataSourceError if an error occurs', async () => {
      const options: TransactionOptions = {};
      const error = new Error('Mocked error');
      (mongoSource.client.startSession as jest.Mock).mockRejectedValueOnce(error);

      await expect(mongoCollectionSource.startTransaction(options)).rejects.toThrow(
        DataSourceError
      );
    });
  });

  describe('commitTransaction', () => {
    it('should commit the current transaction', async () => {
      const commitTransactionMock = jest.fn();
      const endSessionMock = jest.fn();
      const sessionMock = {
        commitTransaction: commitTransactionMock,
        endSession: endSessionMock,
      };
      (mongoCollectionSource as any).currentSession = sessionMock;

      await mongoCollectionSource.commitTransaction();

      expect(commitTransactionMock).toHaveBeenCalled();
      expect(endSessionMock).toHaveBeenCalled();
      expect((mongoCollectionSource as any).currentSession).toBeNull();
    });

    it('should not do anything if no session is available', async () => {
      await mongoCollectionSource.commitTransaction();
      expect(mongoSource.client.startSession).not.toHaveBeenCalled();
    });

    it('should throw a DataSourceError if an error occurs', async () => {
      const commitTransactionMock = jest
        .fn()
        .mockRejectedValueOnce(new Error('Mocked error'));
      const endSessionMock = jest.fn();
      const sessionMock = {
        commitTransaction: commitTransactionMock,
        endSession: endSessionMock,
      };
      (mongoCollectionSource as any).currentSession = sessionMock;

      await expect(mongoCollectionSource.commitTransaction()).rejects.toThrow(
        DataSourceError
      );
      expect(endSessionMock).not.toHaveBeenCalled();
      expect((mongoCollectionSource as any).currentSession).not.toBeNull();
    });
  });

  describe('rollbackTransaction', () => {
    it('should rollback the current transaction', async () => {
      const abortTransactionMock = jest.fn();
      const endSessionMock = jest.fn();
      const sessionMock = {
        abortTransaction: abortTransactionMock,
        endSession: endSessionMock,
      };
      (mongoCollectionSource as any).currentSession = sessionMock;

      await mongoCollectionSource.rollbackTransaction();

      expect(abortTransactionMock).toHaveBeenCalled();
      expect(endSessionMock).toHaveBeenCalled();
      expect((mongoCollectionSource as any).currentSession).toBeNull();
    });

    it('should not do anything if no session is available', async () => {
      await mongoCollectionSource.rollbackTransaction();
      expect(mongoSource.client.startSession).not.toHaveBeenCalled();
    });

    it('should throw a DataSourceError if an error occurs', async () => {
      const abortTransactionMock = jest
        .fn()
        .mockRejectedValueOnce(new Error('Mocked error'));
      const endSessionMock = jest.fn();
      const sessionMock = {
        abortTransaction: abortTransactionMock,
        endSession: endSessionMock,
      };
      (mongoCollectionSource as any).currentSession = sessionMock;

      await expect(mongoCollectionSource.rollbackTransaction()).rejects.toThrow(
        DataSourceError
      );
      expect(endSessionMock).not.toHaveBeenCalled();
      expect((mongoCollectionSource as any).currentSession).not.toBeNull();
    });
  });

  describe('throwDataSourceError', () => {
    it('should throw a DataSourceError for duplicate error', () => {
      const error = new Error('Duplicate error');
      (isDuplicateError as jest.Mock).mockReturnValue(true);
      const createDuplicateErrorSpy = jest.spyOn(DataSourceError, 'createDuplicateError');
      createDuplicateErrorSpy.mockReturnValue(
        DataSourceError.createDuplicateError(error, {
          data: [],
        })
      );
      expect(() => {
        (mongoCollectionSource as any).throwDataSourceError(error);
      }).toThrow(DataSourceError);
      expect(createDuplicateErrorSpy).toHaveBeenCalledWith(error, {
        data: [],
      });
    });

    it('should throw a DataSourceError for invalid data error', () => {
      const error = new Error('Invalid data error');
      (isDuplicateError as jest.Mock).mockReturnValue(false);
      (isInvalidDataError as jest.Mock).mockReturnValue(true);
      const createInvalidDataErrorSpy = jest.spyOn(
        DataSourceError,
        'createInvalidDataError'
      );
      createInvalidDataErrorSpy.mockReturnValue(
        DataSourceError.createInvalidDataError(error, {
          data: [],
        })
      );
      expect(() => {
        (mongoCollectionSource as any).throwDataSourceError(error);
      }).toThrow(DataSourceError);
      expect(createInvalidDataErrorSpy).toHaveBeenCalledWith(error);
    });

    it('should throw a DataSourceError for other error', () => {
      const error = new Error('Other error');
      (isDuplicateError as jest.Mock).mockReturnValue(false);
      (isInvalidDataError as jest.Mock).mockReturnValue(false);
      const createErrorSpy = jest.spyOn(DataSourceError, 'createError');
      createErrorSpy.mockReturnValue(DataSourceError.createError(error));

      expect(() => {
        (mongoCollectionSource as any).throwDataSourceError(error);
      }).toThrow(DataSourceError);
      expect(DataSourceError.createError).toHaveBeenCalledWith(error);

      createErrorSpy.mockClear();
    });
  });
});
