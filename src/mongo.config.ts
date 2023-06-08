import { ConfigVars } from '@alien-worlds/api-core';
import { MongoConfig } from './mongo.types';

/**
 * Builds a MongoDB configuration object based on the provided configuration variables.
 *
 * @param {ConfigVars} configVars - The configuration variables object.
 * @param {string} [prefix=''] - The prefix to prepend to the configuration variable names.
 * @returns {MongoConfig} The MongoDB configuration object.
 */
export const buildMongoConfig = (configVars: ConfigVars, prefix = ''): MongoConfig => {
  const p = prefix
    ? prefix.endsWith('_')
      ? prefix.toUpperCase()
      : prefix.toUpperCase() + '_'
    : '';

  return {
    database: configVars.getStringEnv(`${p}MONGO_DB_NAME`),
    hosts: configVars.getArrayEnv(`${p}MONGO_HOSTS`),
    ports: configVars.getArrayEnv(`${p}MONGO_PORTS`),
    user: configVars.getStringEnv(`${p}MONGO_USER`),
    password: configVars.getStringEnv(`${p}MONGO_PASSWORD`),
    authMechanism: configVars.getStringEnv(`${p}MONGO_AUTH_MECHANISM`),
    authSource: configVars.getStringEnv(`${p}MONGO_AUTH_SOURCE`),
    replicaSet: configVars.getStringEnv(`${p}MONGO_REPLICA_SET`),
    ssl: configVars.getBooleanEnv(`${p}MONGO_SSL`),
    srv: configVars.getBooleanEnv(`${p}MONGO_SRV`),
  };
};
