import { UpdateMethod, Where } from '@alien-worlds/aw-core';
import { MongoQueryBuilders } from '../mongo.query-builders'; // Replace with the actual module path

describe('MongoQueryBuilders', () => {
  let queryBuilders;

  beforeEach(() => {
    queryBuilders = new MongoQueryBuilders();
  });

  describe('buildFindQuery', () => {
    it('should build a find query with limit, offset, sort, and where', () => {
      const params = {
        limit: 10,
        offset: 0,
        sort: { name: 1 },
        where: new Where().valueOf('age').isGte(18),
      };

      const result = queryBuilders.buildFindQuery(params);

      const expectedFilter = { age: { $gte: 18 } };
      const expectedOptions = { limit: 10, sort: { name: 1 }, skip: 0 };

      expect(result.filter).toEqual(expectedFilter);
      expect(result.options).toEqual(expectedOptions);
    });

    it('should build a find query without limit, offset, sort, and where', () => {
      const params = {};

      const result = queryBuilders.buildFindQuery(params);

      expect(result.filter).toEqual({});
      expect(result.options).toEqual({});
    });
  });

  describe('buildCountQuery', () => {
    it('should build a count query with sort and where', () => {
      const params = {
        sort: { name: 1 },
        where: new Where().valueOf('age').isGte(18),
      };

      const result = queryBuilders.buildCountQuery(params);

      const expectedFilter = { age: { $gte: 18 } };
      const expectedOptions = { sort: { name: 1 } };

      expect(result.filter).toEqual(expectedFilter);
      expect(result.options).toEqual(expectedOptions);
    });

    it('should build a count query without sort and where', () => {
      const params = {};

      const result = queryBuilders.buildCountQuery(params);

      expect(result.filter).toEqual({});
      expect(result.options).toEqual({});
    });
  });

  describe('buildUpdateQuery', () => {
    it('should build an update query with UpdateOne method', () => {
      const updates = [{ name: 'John' }];
      const where = [new Where().valueOf('age').isGte(18)];
      const methods = [UpdateMethod.UpdateOne];

      const result = queryBuilders.buildUpdateQuery(updates, where, methods);

      const expectedFilter = { age: { $gte: 18 } };
      const expectedUpdate = { $set: { name: 'John' } };
      const expectedOptions = { upsert: true };

      const expectedQuery = {
        filter: expectedFilter,
        update: expectedUpdate,
        options: expectedOptions,
        method: UpdateMethod.UpdateOne,
      };

      expect(result).toEqual(expectedQuery);
    });

    it('should build an update query with UpdateMany method', () => {
      const updates = [{ name: 'John' }];
      const where = [new Where().valueOf('age').isGte(18)];
      const methods = [UpdateMethod.UpdateMany];

      const result = queryBuilders.buildUpdateQuery(updates, where, methods);

      const expectedFilter = { age: { $gte: 18 } };
      const expectedUpdate = { $set: { name: 'John' } };

      const expectedQuery = {
        filter: expectedFilter,
        update: expectedUpdate,
        method: UpdateMethod.UpdateMany,
      };

      expect(result).toEqual(expectedQuery);
    });

    it('should build multiple update queries with different methods', () => {
      const updates = [{ name: 'John' }, { name: 'Jane' }];
      const where = [
        new Where().valueOf('age').isGte(18),
        new Where().valueOf('age').isLt(18),
      ];
      const methods = [UpdateMethod.UpdateOne, UpdateMethod.UpdateMany];

      const result = queryBuilders.buildUpdateQuery(updates, where, methods);

      const expectedFilter1 = { age: { $gte: 18 } };
      const expectedFilter2 = { age: { $lt: 18 } };
      const expectedUpdate1 = { $set: { name: 'John' } };
      const expectedUpdate2 = { $set: { name: 'Jane' } };

      const expectedQuery1 = {
        updateOne: {
          filter: expectedFilter1,
          update: expectedUpdate1,
          upsert: true,
        },
      };

      const expectedQuery2 = {
        updateMany: {
          filter: expectedFilter2,
          update: expectedUpdate2,
        },
      };

      expect(result).toEqual([expectedQuery1, expectedQuery2]);
    });

    it('should throw an error for inconsistent update parameters', () => {
      const updates = [{ name: 'John' }, { name: 'Jane' }];
      const where = [new Where().valueOf('age').isGte(18)];
      const methods = [UpdateMethod.UpdateOne, UpdateMethod.UpdateMany];

      expect(() => {
        queryBuilders.buildUpdateQuery(updates, where, methods);
      }).toThrowError(
        'The number of parameters does not match. Number of updates: 2, where clauses: 1, method types: 2'
      );
    });

    it('should throw an error for unknown update method', () => {
      const updates = [{ name: 'John' }];
      const where = [new Where().valueOf('age').isGte(18)];
      const methods = ['unknownMethod'];

      expect(() => {
        queryBuilders.buildUpdateQuery(updates, where, methods);
      }).toThrowError('Unknown update method with index "unknownMethod".');
    });
  });

  describe('buildRemoveQuery', () => {
    it('should build a remove query with where', () => {
      const params = {
        where: new Where().valueOf('age').isGte(18),
      };

      const result = queryBuilders.buildRemoveQuery(params);

      const expectedFilter = { age: { $gte: 18 } };
      const expectedOptions = {};

      const expectedQuery = {
        filter: expectedFilter,
        options: expectedOptions,
      };

      expect(result).toEqual(expectedQuery);
    });

    it('should build a remove query without where', () => {
      const params = {};

      const result = queryBuilders.buildRemoveQuery(params);

      expect(result.filter).toEqual({});
      expect(result.options).toEqual({});
    });
  });

  describe('buildAggregationQuery', () => {
    it('should build an aggregation query with groupBy, filterBy, sort, sum, average, min, max, count, and where', () => {
      const params = {
        groupBy: ['name'],
        filterBy: new Where().valueOf('age').isGte(18),
        sort: { name: 1 },
        sum: 'salary',
        average: 'rating',
        min: 'age',
        max: 'age',
        count: true,
        where: new Where().valueOf('department').isEq('Sales'),
      };

      const result = queryBuilders.buildAggregationQuery(params);

      const expectedPipeline = [
        { $match: { department: { $eq: 'Sales' } } },
        {
          $group: {
            _id: { name: '$name' },
            totalSum: { $sum: '$salary' },
            average: { $avg: '$rating' },
            min: { $min: '$age' },
            max: { $max: '$age' },
            count: { $sum: 1 },
          },
        },
        { $sort: { name: 1 } },
        { $match: { age: { $gte: 18 } } },
      ];

      const expectedOptions = {};

      const expectedQuery = {
        pipeline: expectedPipeline,
        options: expectedOptions,
      };

      expect(result).toEqual(expectedQuery);
    });

    it('should build an aggregation query without groupBy, filterBy, sort, sum, average, min, max, count, and where', () => {
      const params = {};

      const result = queryBuilders.buildAggregationQuery(params);

      expect(result.pipeline).toEqual([]);
      expect(result.options).toEqual({});
    });
  });
});
