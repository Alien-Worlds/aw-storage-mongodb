import { Where } from '@alien-worlds/aw-core';
import { MongoWhereParser } from '../mongo.where.parser';
import { Long } from 'mongodb';

class UserMockClass {
  name: string;
  cardId: bigint;
}

describe('MongoWhereParser', () => {
  describe('parse', () => {
    it('should parse Where object with supported operators', () => {
      const where = new Where()
        .valueOf('name')
        .isEq('John')
        .valueOf('age')
        .isGt(25)
        .valueOf('salary')
        .isLte(5000)
        .valueOf('department')
        .isIn(['Sales', 'Marketing'])
        .valueOf('address')
        .isNull('address')
        .valueOf('projects')
        .isNotEmpty('projects');

      const expectedQuery = {
        name: { $eq: 'John' },
        age: { $gt: 25 },
        salary: { $lte: 5000 },
        department: { $in: ['Sales', 'Marketing'] },
        address: { $eq: null },
        projects: { $and: [{ $ne: '' }, { $ne: [] }, { $ne: {} }] },
      };

      const result = MongoWhereParser.parse(where);

      expect(result).toEqual(expectedQuery);
    });

    it('should parse Where object bound to the class', () => {
      const where = Where.bind<UserMockClass>().prototype().name.isEq('Neo');
      const result = MongoWhereParser.parse(where);

      expect(result).toEqual({
        name: { $eq: 'Neo' },
      });
    });

    it('should parse Where object and use mapper', () => {
      const where = Where.bind<UserMockClass>().prototype().cardId.isEq(10);
      const mapper = {
        getEntityKeyMapping: (key: string) => ({
          key: 'card_id',
          mapper: (value: bigint) => Long.fromBigInt(value),
        }),
      } as any;
      const result = MongoWhereParser.parse(where, mapper);

      expect(result).toEqual({
        card_id: { $eq: Long.fromBigInt(10n) },
      });
    });

    it('should parse Where object with between operatpr', () => {
      const where = new Where().valueOf('age').isBetween(18, 24);
      const result = MongoWhereParser.parse(where);

      expect(result).toEqual({
        age: { $gte: 18, $lte: 24 },
      });
    });

    it('should parse nested Where object with logical operators', () => {
      const where = Where.and([
        new Where().valueOf('name').isEq('John').valueOf('age').isGt(25),
        new Where().valueOf('department').isEq('Sales').valueOf('salary').isLte(5000),
      ]);

      const expectedQuery = {
        $and: [
          { name: { $eq: 'John' }, age: { $gt: 25 } },
          { department: { $eq: 'Sales' }, salary: { $lte: 5000 } },
        ],
      };

      const result = MongoWhereParser.parse(where);

      expect(result).toEqual(expectedQuery);
    });

    it('should throw an error for unsupported operators', () => {
      const where = new Where();
      (where as any).chain['name'] = [{ operator: NaN, value: 'unknown' }];
      expect(() => {
        MongoWhereParser.parse(where);
      }).toThrowError('Unsupported operator "undefined".');
    });

    it('should throw an error for unknown operator in nested Where object', () => {
      const where = new Where();
      (where as any).chain['name'] = [{ operator: NaN, value: 'unknown' }];
      expect(() => {
        MongoWhereParser.parse({
          foo: [where],
        });
      }).toThrowError('Unsupported operator "foo".');
    });

    it('should throw an error for unknown operator in top-level Where object', () => {
      const where = { unknownOperator: [{ field: 'value' }] };

      expect(() => {
        MongoWhereParser.parse(where);
      }).toThrowError('Unsupported operator "unknownOperator".');
    });
  });
});
