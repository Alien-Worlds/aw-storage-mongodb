import { MongoError } from 'mongodb';

export class PendingSessionError extends Error {
  constructor() {
    super(`The current session has not ended. Cannot start a new one.`);
  }
}

export enum SessionErrorType {
  UnknownTransactionCommitResult = 'UnknownTransactionCommitResult',
  TransientTransactionError = 'TransientTransactionError',
  Other = 'Other',
}

export class SessionError extends Error {
  public _type: SessionErrorType;
  constructor(public readonly error: Error) {
    super(error.message);

    if (
      error instanceof MongoError &&
      error.hasErrorLabel('UnknownTransactionCommitResult')
    ) {
      this._type = SessionErrorType.UnknownTransactionCommitResult;
    } else if (
      error instanceof MongoError &&
      error.hasErrorLabel('TransientTransactionError')
    ) {
      this._type = SessionErrorType.TransientTransactionError;
    } else {
      this._type = SessionErrorType.Other;
    }
  }

  public get type(): string {
    return this._type;
  }
}

export class BulkUpdateOperationsError extends Error {
  constructor() {
    super(
      `Some of the BulkUpdate operations are different than updateOne and updateMany.`
    );
  }
}
