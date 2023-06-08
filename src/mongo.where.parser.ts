import {
  UnsupportedOperatorError,
  Where,
  WhereClause,
  WhereOperator,
} from '@alien-worlds/api-core';
import { Filter } from 'mongodb';

/**
 * Class for parsing Where clauses and converting them into MongoDB filter objects.
 */
export class MongoWhereParser {
  /**
   * Map of Where operators to their corresponding MongoDB operators.
   * @type {Object.<WhereOperator, string | Object>}
   * @private
   */
  private static operatorMap = {
    [WhereOperator.isEq]: '$eq',
    [WhereOperator.isNotEq]: '$ne',
    [WhereOperator.isLt]: '$lt',
    [WhereOperator.isLte]: '$lte',
    [WhereOperator.isGt]: '$gt',
    [WhereOperator.isGte]: '$gte',
    [WhereOperator.isInRange]: '$in',
    [WhereOperator.isNotInRange]: '$nin',
    [WhereOperator.isIn]: '$in',
    [WhereOperator.isNotIn]: '$nin',
    [WhereOperator.isTrue]: '$eq',
    [WhereOperator.isFalse]: '$eq',
    [WhereOperator.is0]: '$eq',
    [WhereOperator.is1]: '$eq',
    [WhereOperator.isNull]: '$eq',
    [WhereOperator.isNotNull]: '$ne',
    [WhereOperator.isEmpty]: { $or: [{ $eq: '' }, { $eq: [] }, { $eq: {} }] },
    [WhereOperator.isNotEmpty]: {
      $and: [{ $ne: '' }, { $ne: [] }, { $ne: {} }],
    },
  };

  /**
   * Parses a Where clause or an object and converts it into a MongoDB filter object.
   *
   * @template T - The type of the resulting MongoDB filter object.
   * @param {Where | unknown} where - The Where clause or object to parse.
   * @returns {T} The parsed MongoDB filter object.
   * @throws {Error} If the Where clause contains an unsupported operator.
   */
  public static parse<T = Filter<unknown>>(where: Where | unknown): T {
    const query = {} as T;
    if (where instanceof Where && where.isRaw) {
      return where.result as T;
    } else if (where instanceof Where && where.isRaw === false) {
      const chain = where.result;
      for (const key in chain) {
        const whereClause = chain[key] as WhereClause;
        const mongoOperator = MongoWhereParser.operatorMap[whereClause.operator];
        if (!mongoOperator) {
          throw new UnsupportedOperatorError(WhereOperator[whereClause.operator]);
        }

        if (
          whereClause.operator === WhereOperator.isEmpty ||
          whereClause.operator === WhereOperator.isNotEmpty
        ) {
          query[key] = mongoOperator;
        } else {
          query[key] = { [mongoOperator]: whereClause.value };
          if (whereClause.operator === WhereOperator.isNull) {
            query[key] = { [mongoOperator]: null };
          }
        }
      }
    } else {
      const operator = Object.keys(where)[0];
      const values = where[operator];

      if (operator !== 'and' && operator !== 'or') {
        throw new UnsupportedOperatorError(operator);
      }

      query['$' + operator] = values.map(this.parse);
    }

    return query;
  }
}
