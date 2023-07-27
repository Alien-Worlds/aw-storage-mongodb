# aw-storage-mongodb

## Table of Contents

1. [Installation](#installation)
2. [Introduction](#introduction)
3. [Dependencies](#dependencies)
4. [Features](#features)
   - [MongoCollectionSource Class](#mongocollectionsource-class)
   - [MongoQueryBuilders Class](#mongoquerybuilders-class)
   - [MongoSource Class](#mongosource-class)
   - [MongoWhereParser Class](#mongowhereparser-class)
   - [BuildMongoConfig Function](#buildmongoconfig-function)
5. [Additional Tools and Helpers](#additional-tools-and-helpers)
6. [Installation](#installation)

## Installation

To install the `aw-storage-mongodb` package, use the following command:

```bash
yarn add @alien-worlds/aw-storage-mongodb
```

## Introduction

`aw-storage-mongodb` is a versatile package designed as part of our API building components and history-tools. The goal is to decouple our modules and provide reusable MongoDB components that can be plugged into projects as needed, rather than relying on a monolithic structure.

If your project relies on MongoDB, `aw-storage-mongodb` is a great tool to execute commands built in the business domain. It's built upon the interfaces and types from the `@alien-worlds/aw-core` package and provides a MongoDB implementation.

## Dependencies

- [MongoDB](https://github.com/mongodb)
- [@alien-worlds/aw-core](https://github.com/Alien-Worlds/api-core)

## Features

### MongoCollectionSource Class

Represents a MongoDB data source for a specific collection, with implemented methods like `find`, `count`, `aggregate`, `update`, `insert`, `remove` and more. It uses the native MongoDB client from the 'mongodb' package to perform all operations. Create custom collection class and extend this, create an instance and pass it to the constructor of the Repository.

```java
// An example of creating a collection data source for the planets collection
export class PlanetMongoSource extends CollectionMongoSource<PlanetMongoModel> {
  constructor(mongoSource: MongoSource) {
    super(mongoSource, 'planets');
  }
}

// later use it in the repository
const planetRepository = new PlanetRepositoryImpl(
  new PlanetMongoSource(mongoSOurce),
  <planets_collection_mongo_maper>,
  <mongo_query_builders>,
);

```

### MongoQueryBuilders Class

Represents a MongoDB query builder to construct various types of queries. The methods like `buildFindQuery`, `buildCountQuery`, `buildUpdateQuery` and more take parameters defined in the domain layer in the `@alien-worlds/aw-core` and build query parameters suitable for MongoDB. Instances of this class must be used in the repository constructor.

```java
const planetRepository = new PlanetRepositoryImpl(
  <planets_collection_mongo_source>,
  <planets_collection_mongo_maper>,
  new MongoQueryBuilders()
)
```

### MongoSource Class

This is a Facade class that encapsulates the MongoClient and exposes a client and database. It also contains a factory method to create instances. Instances of this class are used in the constructor of all `MongoCollectionSource`. This allows collections to share a client or, if required, use multiple clients.

```java
const vars = new ConfigVars();
const config = buildMongoConfig(vars);
const mongoSource = await MongoSource.create(config);
```

### MongoWhereParser Class

Contains a static `parse` method for parsing Where clauses and converting them into MongoDB filter objects.

```java
// example
const where = Where.and([
new Where().valueOf('name').isEq('John').valueOf('age').isGt(25),
new Where().valueOf('department').isEq('Sales').valueOf('salary').isLte(5000),
]);
const result = MongoWhereParser.parse(where);
/*
Generated result:
{
  $and: [
    { name: { $eq: 'John' }, age: { $gt: 25 } },
    { department: { $eq: 'Sales' }, salary: { $lte: 5000 } },
  ],
}
*/
```

### BuildMongoConfig Function

Builds a MongoDB configuration object based on provided configuration variables.

```java
// example
const vars = new ConfigVars();
const mongo = buildMongoConfig(vars); // or buildMongoConfig(vars, 'YOUR_PREFIX');

```

To use this tool you have to set the following environment variables or create an .env file containing the following keys.

```bash
<your_prefix>MONGO_DB_NAME
<your_prefix>MONGO_HOSTS
<your_prefix>MONGO_PORTS
<your_prefix>MONGO_USER
<your_prefix>MONGO_PASSWORD
<your_prefix>MONGO_AUTH_MECHANISM
<your_prefix>MONGO_AUTH_SOURCE
<your_prefix>MONGO_REPLICA_SET
<your_prefix>MONGO_SSL
<your_prefix>MONGO_SRV
```

If a prefix is given, it must be included in the variable name. Note that each prefix will be automatically separated from the name by a `_` character if the given key does not end with it.

## Additional Tools and Helpers

This package also includes various helper tools such as `buildMongoUrl`, for constructing a URL to connect to the MongoDB database, along with others that aid in internal processes.

Additionally, it contains standard error classes (`SessionError`, `UnknownUpdateMethodError`, `InconsistentUpdateParamsError`, etc.) and basic types of query params (`MongoFindQueryParams`, `MongoUpdateQueryParams`, etc.).

By using `aw-storage-mongodb`, you'll have a toolbox at your disposal to quickly and effectively interact with MongoDB, keeping your code clean and efficient.

## Contributing

We encourage contributions from the community. If you have suggestions or features you'd like to see in the api-core package, please open an issue. For pull requests, ensure your changes are well documented and include tests where possible.

## License

This project is licensed under the terms of the MIT license. For more information, refer to the [LICENSE](./LICENSE) file.
