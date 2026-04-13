export const UserType = {
  SELLER: "SELLER",
  BUYER: "BUYER",
} as const;

export type UserType = (typeof UserType)[keyof typeof UserType];

export const OfferStatus = {
  ACTIVE: "ACTIVE",
  EXPIRED: "EXPIRED",
  CLOSED: "CLOSED",
} as const;

export type OfferStatus = (typeof OfferStatus)[keyof typeof OfferStatus];
