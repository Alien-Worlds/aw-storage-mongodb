import { Where } from '@alien-worlds/api-core';
import { MongoWhereParser } from '../mongo.where.parser';

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
      (where as any).chain['name'] = { operator: NaN, value: 'unknown' };
      expect(() => {
        MongoWhereParser.parse(where);
      }).toThrowError('Unsupported operator "undefined".');
    });

    it('should throw an error for unknown operator in nested Where object', () => {
      const where = new Where();
      (where as any).chain['name'] = { operator: NaN, value: 'unknown' };
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
