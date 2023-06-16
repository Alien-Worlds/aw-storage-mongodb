import { MongoMapper } from '../mongo.mapper';
import { MongoDB } from '../mongo.types';

describe('MongoMapper', () => {
  type MockEntity = { id: string };
  type MockModel = { _id: MongoDB.ObjectId | null };

  let mongoMapper: MongoMapper<MockEntity, MockModel>;

  beforeEach(() => {
    mongoMapper = new MongoMapper<MockEntity, MockModel>();
  });

  it('should convert from entity to model with valid ObjectId', () => {
    const id = new MongoDB.ObjectId().toString();
    expect(mongoMapper.fromEntity({ id })).toEqual({ _id: new MongoDB.ObjectId(id) });
  });

  it('should remove _id key when ObjectId is invalid', () => {
    expect(mongoMapper.fromEntity({ id: 'invalid' })).toEqual({});
  });

  it('should remove _id key when it is null', () => {
    expect(mongoMapper.fromEntity({ id: '' })).toEqual({});
  });

  it('should get entity key mapping', () => {
    const mapping = mongoMapper.getEntityKeyMapping('id');
    expect(mapping).toBeDefined();
    expect(mapping!.key).toBe('_id');
    expect(mapping!.mapper('invalid')).toBeNull();
  });
});
