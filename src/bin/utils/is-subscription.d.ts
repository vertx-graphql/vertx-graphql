import { DocumentNode } from 'graphql';

export function isASubscriptionOperation (document: DocumentNode, operationName: string): boolean