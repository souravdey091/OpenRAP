import Hashids from "hashids";

export const hash = (text: string): string => {
  let hash = new Hashids(
    text,
    25,
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
  );
  return hash.encode(1).toLowerCase();
};
