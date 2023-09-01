import { MongoConfig } from '../mongo.types';
import {
  buildMongoUrl,
  getDatabase,
  containsSpecialKeys,
  isMongoConfig,
  isDuplicateError,
  getDuplicatedDocumentIds,
  isInvalidDataError,
  isBulkUpdate,
} from '../utils';
import { MongoClient, MongoError, Db } from 'mongodb';

// Import your Jest and other necessary libraries here

describe('buildMongoUrl', () => {
  it('should correctly build MongoDB URL', () => {
    const config: MongoConfig = {
      user: 'username',
      password: 'password',
      hosts: ['localhost'],
      database: 'testdb',
      ports: ['27017'],
      authMechanism: 'DEFAULT',
      ssl: false,
      replicaSet: 'replicaSet',
      srv: false,
      authSource: 'authSource',
    };
    const url = buildMongoUrl(config);
    expect(url).toBe(
      'mongodb://username:password@localhost:27017/?authMechanism=DEFAULT&authSource=authSource&replicaSet=replicaSet'
    );
  });
});

describe('getDatabase', () => {
  it('should correctly return a database', () => {
    const client = new MongoClient('mongodb://username:password@localhost:27017');
    const dbName = 'test';
    const db = getDatabase(client, dbName);
    expect(db).toBeInstanceOf(Db);
  });
});

describe('containsSpecialKeys', () => {
  it('should return true if data contains special keys', () => {
    const data = {
      $set: {
        field: 'value',
      },
    };
    const result = containsSpecialKeys(data);
    expect(result).toBe(true);
  });

  it('should return false if data does not contain special keys', () => {
    const data = {
      field: 'value',
    };
    const result = containsSpecialKeys(data);
    expect(result).toBe(false);
  });
});

describe('isMongoConfig', () => {
  it('should return true if value is a MongoConfig', () => {
    const value: MongoConfig = {
      user: 'username',
      password: 'password',
      hosts: ['localhost'],
      database: 'testdb',
      ports: ['27017'],
      authMechanism: 'DEFAULT',
      ssl: false,
      replicaSet: 'replicaSet',
      srv: false,
      authSource: 'authSource',
    };
    const result = isMongoConfig(value);
    expect(result).toBe(true);
  });

  it('should return false if value is not a MongoConfig', () => {
    const value = 'Not a MongoConfig';
    const result = isMongoConfig(value);
    expect(result).toBe(false);
  });
});

describe('isDuplicateError', () => {
  it('should return true if error is a duplicate error', () => {
    const error = new MongoError('Duplicate error');
    error.code = 11000;
    const result = isDuplicateError(error);
    expect(result).toBe(true);
  });

  it('should return false if error is not a duplicate error', () => {
    const error = new Error('Not a duplicate error');
    const result = isDuplicateError(error);
    expect(result).toBe(false);
  });
});

describe('getDuplicatedDataIds', () => {
  it('should correctly extract duplicated data IDs', () => {
    const error = new Error(
      'E11000 duplicate key error collection: test.collection index: _id_ dup key: { _id: "duplicatedId" }'
    );
    const ids = getDuplicatedDocumentIds(error);
    expect(ids).toEqual(['duplicatedId']);
  });
});

describe('isInvalidDataError', () => {
  it('should return true if error is an invalid data error', () => {
    const error = new MongoError('Invalid data error');
    error.code = 121;
    const result = isInvalidDataError(error);
    expect(result).toBe(true);
  });

  it('should return false if error is not an invalid data error', () => {
    const error = new Error('Not an invalid data error');
    const result = isInvalidDataError(error);
    expect(result).toBe(false);
  });
});

describe('isBulkUpdate', () => {
  it('should return true if operations constitute a bulk update', () => {
    const operations = [
      { updateOne: { filter: { _id: 1 }, update: { $set: { name: 'test' } } } },
      {
        updateMany: {
          filter: { status: 'active' },
          update: { $set: { status: 'inactive' } },
        },
      },
    ];
    const result = isBulkUpdate(operations as any);
    expect(result).toBe(true);
  });

  it('should return false if operations do not constitute a bulk update', () => {
    const operations = [
      { insertOne: { document: { _id: 1, name: 'test' } } },
      { deleteOne: { filter: { _id: 1 } } },
    ];
    const result = isBulkUpdate(operations);
    expect(result).toBe(false);
  });
});
