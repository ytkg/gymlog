export class R2GetFailedError extends Error {
  override name = "R2GetFailedError";
  constructor(
    message: string,
    public readonly cause: unknown
  ) {
    super(message);
  }
}

export class R2ReadFailedError extends Error {
  override name = "R2ReadFailedError";
  constructor(
    message: string,
    public readonly cause: unknown
  ) {
    super(message);
  }
}

export const getObjectOrNull = async (bucket: R2Bucket, key: string) => {
  try {
    return await bucket.get(key);
  } catch (err) {
    throw new R2GetFailedError(`R2 get failed for ${key}`, err);
  }
};

export const readObjectText = async (object: R2ObjectBody, keyForMessage: string) => {
  try {
    return await object.text();
  } catch (err) {
    throw new R2ReadFailedError(`R2 read failed for ${keyForMessage}`, err);
  }
};
