import { Query, QueryBuilder } from '@alien-worlds/api-core';

export class MongoQueryBuilder implements QueryBuilder {
  build(...args: unknown[]): Query {
    throw new Error('Method not implemented.');
  }
}
