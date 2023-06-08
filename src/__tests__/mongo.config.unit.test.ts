const { buildMongoConfig } = require('../mongo.config');

describe('buildMongoConfig', () => {
  const configVars = {
    getStringEnv: jest.fn(),
    getArrayEnv: jest.fn(),
    getBooleanEnv: jest.fn(),
    getNumberEnv: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should build the MongoDB config object with default prefix', () => {
    configVars.getStringEnv.mockReturnValueOnce('mydatabase');
    configVars.getArrayEnv.mockReturnValueOnce(['localhost']);
    configVars.getArrayEnv.mockReturnValueOnce([27017]);
    configVars.getStringEnv.mockReturnValueOnce('myuser');
    configVars.getStringEnv.mockReturnValueOnce('mypassword');
    configVars.getStringEnv.mockReturnValueOnce('SCRAM-SHA-256');
    configVars.getStringEnv.mockReturnValueOnce('admin');
    configVars.getStringEnv.mockReturnValueOnce('my-replica-set');
    configVars.getBooleanEnv.mockReturnValueOnce(true);
    configVars.getBooleanEnv.mockReturnValueOnce(false);

    const expectedConfig = {
      database: 'mydatabase',
      hosts: ['localhost'],
      ports: [27017],
      user: 'myuser',
      password: 'mypassword',
      authMechanism: 'SCRAM-SHA-256',
      authSource: 'admin',
      replicaSet: 'my-replica-set',
      ssl: true,
      srv: false,
    };

    const result = buildMongoConfig(configVars);

    expect(result).toEqual(expectedConfig);
    expect(configVars.getStringEnv).toHaveBeenCalledTimes(6);
    expect(configVars.getArrayEnv).toHaveBeenCalledTimes(2);
    expect(configVars.getBooleanEnv).toHaveBeenCalledTimes(2);
  });

  it('should build the MongoDB config object with custom prefix', () => {
    configVars.getStringEnv.mockReturnValueOnce('customdatabase');
    configVars.getArrayEnv.mockReturnValueOnce(['customhost']);
    configVars.getArrayEnv.mockReturnValueOnce([27018]);
    configVars.getStringEnv.mockReturnValueOnce('customuser');
    configVars.getStringEnv.mockReturnValueOnce('custompassword');
    configVars.getStringEnv.mockReturnValueOnce('SCRAM-SHA-1');
    configVars.getStringEnv.mockReturnValueOnce('customadmin');
    configVars.getStringEnv.mockReturnValueOnce('custom-replica-set');
    configVars.getBooleanEnv.mockReturnValueOnce(false);
    configVars.getBooleanEnv.mockReturnValueOnce(true);

    const expectedConfig = {
      database: 'customdatabase',
      hosts: ['customhost'],
      ports: [27018],
      user: 'customuser',
      password: 'custompassword',
      authMechanism: 'SCRAM-SHA-1',
      authSource: 'customadmin',
      replicaSet: 'custom-replica-set',
      ssl: false,
      srv: true,
    };

    const result = buildMongoConfig(configVars, 'custom_');

    expect(result).toEqual(expectedConfig);
    expect(configVars.getStringEnv).toHaveBeenCalledTimes(6);
    expect(configVars.getArrayEnv).toHaveBeenCalledTimes(2);
    expect(configVars.getBooleanEnv).toHaveBeenCalledTimes(2);
  });
});
