import { AnyBulkWriteOperation, Db, MongoClient, MongoError } from 'mongodb';
import { MongoConfig } from './mongo.types';

/**
 * Builds a MongoDB URL from a MongoConfig object.
 * @param {MongoConfig} config - The configuration object containing connection details.
 * @returns {string} The constructed MongoDB URL.
 */
export const buildMongoUrl = (config: MongoConfig) => {
  const { user, password, authMechanism, ssl, replicaSet, srv, authSource } = config;
  let url = srv ? 'mongodb+srv://' : 'mongodb://';
  const options = {};

  if (user && password) {
    url += `${user}:${password}@`;
    options['authMechanism'] = authMechanism || 'DEFAULT';
  }
  const hosts = config?.hosts?.length ? config.hosts : ['localhost'];
  const ports = config?.ports?.length ? config.ports : ['27017'];
  const defaultPort = ports[0];

  let hostsPortsDiff = hosts.length - ports.length;
  while (hostsPortsDiff > 0) {
    ports.push(defaultPort);
    hostsPortsDiff = hosts.length - ports.length;
  }

  const hostsAndPorts = hosts.map((host, i) => {
    const port = ports[i] || ports[0];
    return `${host}:${port}`;
  });

  url += hostsAndPorts.join(',');

  if (ssl) {
    options['ssl'] = true;
  }

  if (authSource) {
    options['authSource'] = authSource;
  }

  if (replicaSet) {
    options['replicaSet'] = replicaSet;
  }

  const params = Object.keys(options).reduce((list, key) => {
    list.push(`${key}=${options[key]}`);
    return list;
  }, []);

  if (params.length > 0) {
    url += `/?${params.join('&')}`;
  }

  return url;
};

/**
 * Gets a database object from a MongoClient instance.
 * @param {MongoClient} client - The MongoClient instance to use.
 * @param {string} name - The name of the database to retrieve.
 * @returns {Db} The database object.
 */
export const getDatabase = (client: MongoClient, name: string): Db => client.db(name);

const specials = [
  '$currentDate',
  '$inc',
  '$min',
  '$max',
  '$mul',
  '$rename',
  '$set',
  '$setOnInsert',
  '$unset',
  '$addToSet',
  '$pop',
  '$pull',
  '$push',
  '$pullAll',
  '$bit',
];

/**
 * Checks if an object contains special MongoDB update operators.
 * @param {unknown} data - The data to check.
 * @returns {boolean} True if the data contains special keys, false otherwise.
 */
export const containsSpecialKeys = (data: unknown): boolean => {
  try {
    const keys = Object.keys(data);

    for (const key of keys) {
      if (specials.includes(key)) {
        return true;
      }
    }

    return false;
  } catch (error) {
    return false;
  }
};

/**
 * Type guard to check if a given value conforms to the MongoConfig type.
 * @param {unknown} value - The value to check.
 * @returns {boolean} True if the value is a MongoConfig object, false otherwise.
 */
export const isMongoConfig = (value: unknown): value is MongoConfig => {
  return value && Array.isArray(value['hosts']) && typeof value['database'] === 'string';
};

/**
 * Checks if an error is a MongoDB duplicate error.
 * @param {Error} error - The error to check.
 * @returns {boolean} True if the error is a duplicate error, false otherwise.
 */
export const isDuplicateError = (error: Error): boolean => {
  return error instanceof MongoError && error.code === 11000;
};

/**
 * Extracts the duplicated data IDs from a MongoDB error message.
 * @param {Error} error - The error to extract from.
 * @returns {string[]} An array of duplicated data IDs.
 */
export const getDuplicatedDocumentIds = (error: Error): string[] => {
  const errorMessage = error.message || '';
  const matches = errorMessage.match(/"([^"]+)"/g);
  if (matches) {
    return matches.map(match => match.replace(/"/g, ''));
  }
  return [];
};

/**
 * Checks if an error is a MongoDB invalid data error.
 * @param {Error} error - The error to check.
 * @returns {boolean} True if the error is an invalid data error, false otherwise.
 */
export const isInvalidDataError = (error: Error): boolean => {
  return error instanceof MongoError && error.code === 121;
};

/**
 * Checks if a list of operations constitutes a bulk update.
 * @param {AnyBulkWriteOperation<T>[]} operations - The list of operations to check.
 * @returns {boolean} True if the operations constitute a bulk update, false otherwise.
 */
export const isBulkUpdate = <T>(operations: AnyBulkWriteOperation<T>[]): boolean => {
  let result = true;
  operations.forEach(operation => {
    if (!operation['updateOne'] && !operation['updateMany']) {
      result = false;
    }
  });

  return result;
};
