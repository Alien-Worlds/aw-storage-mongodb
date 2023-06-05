import { AnyBulkWriteOperation, Db, MongoClient, MongoError } from 'mongodb';
import { MongoConfig } from './mongo.types';

/**
 * This function builds a MongoDB URL from a MongoConfig object.
 * It takes the host, user, password, port, authMechanism and ssl
 * properties of the MongoConfig object and uses them to build the URL.
 */
export const buildMongoUrl = (config: MongoConfig) => {
  const { user, password, authMechanism, ssl, replicaSet, srv, authSource } = config;
  let url = srv ? 'mongodb+srv://' : 'mongodb://';
  const options = {};

  if (user && password) {
    url += `${user}:${password}@`;
    options['authMechanism'] = authMechanism || 'DEFAULT';
  }
  const hosts = config.hosts || ['localhost'];
  const ports = config.ports || ['27017'];
  const hostsPortsDiff = hosts.length - ports.length;
  const defaultPort = ports[0];
  while (hostsPortsDiff > 0) {
    ports.push(defaultPort);
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
 *
 * @param {MongoClient} client
 * @param {string} name
 * @returns {Db}
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

export const isMongoConfig = (value: unknown): value is MongoConfig => {
  return value && Array.isArray(value['hosts']) && typeof value['database'] === 'string';
};

export const isDuplicateError = (error: Error): boolean => {
  return error instanceof MongoError && error.code === 11000;
};

export const getDuplicatedDataIds = (error: Error): string[] => {
  const errorMessage = error.message || '';
  const matches = errorMessage.match(/"([^"]+)"/g);
  if (matches) {
    return matches.map(match => match.replace(/"/g, ''));
  }
  return [];
};

export const isInvalidDataError = (error: Error): boolean => {
  return error instanceof MongoError && error.code === 121;
};

export const isBulkUpdate = <T>(operations: AnyBulkWriteOperation<T>[]): boolean => {
  let result = true;
  operations.forEach(operation => {
    if (!operation['updateOne'] && !operation['updateMany']) {
      result = false;
    }
  });

  return result;
};
