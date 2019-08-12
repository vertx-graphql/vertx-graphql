import { getOperationAST } from 'graphql';

module.exports.isASubscriptionOperation = function (document, operationName) {
  const operationAST = getOperationAST(document, operationName);

  return !!operationAST && operationAST.operation === 'subscription';
};