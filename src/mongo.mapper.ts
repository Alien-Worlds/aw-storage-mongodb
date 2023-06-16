import { Mapper } from '@alien-worlds/api-core';
import { MongoDB } from './mongo.types';

/**
 * Class representing a MongoMapper
 * This class extends the generic Mapper to provide MongoDB-specific mappings.
 * @class
 * @extends {Mapper<EntityType, ModelType>}
 * @template EntityType - The domain entity type used in the business logic layer.
 * @template ModelType - The document type used in the database layer.
 */
export class MongoMapper<EntityType = unknown, ModelType = unknown> extends Mapper<
  EntityType,
  ModelType
> {
  /**
   * Creates a new instance of MongoMapper and sets up the mapping from 'id' to MongoDB's '_id'.
   * @constructor
   */
  constructor() {
    super();
    this.mappingFromEntity.set('id', {
      key: '_id',
      mapper: (value: string) =>
        value && MongoDB.ObjectId.isValid(value) ? new MongoDB.ObjectId(value) : null,
    });
  }

  /**
   * Converts a domain entity from the business logic layer to a MongoDB document.
   * If the resulting document '_id' property is null, it is deleted before returning the document.
   *
   * @param {EntityType} entity - The domain entity from the business logic layer.
   * @returns {ModelType} The MongoDB document.
   */
  public fromEntity(entity: EntityType): ModelType {
    const model = super.fromEntity(entity);

    if (model['_id'] === null) {
      delete model['_id'];
    }

    return model;
  }
}
