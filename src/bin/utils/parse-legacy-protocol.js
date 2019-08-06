/*
 * Copyright 2018 vertx-graphql
 *
 * Vertx-GraphQL licenses this file to you under the Apache License, version 2.0
 * (the "License"); you may not use this file except in compliance with the
 * License.  You may obtain a copy of the License at:
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.  See the
 * License for the specific language governing permissions and limitations
 * under the License.
 */

import { MessageTypes } from '../server/message-types';

function parseLegacyProtocolMessage (connectionContext, message) {
  let messageToReturn = message;

  switch (message.type) {
    case MessageTypes.INIT:
      connectionContext.isLegacy = true;
      messageToReturn = { ...message, type: MessageTypes.GQL_CONNECTION_INIT };
      break;
    case MessageTypes.SUBSCRIPTION_START:
      messageToReturn = {
        id: message.id,
        type: MessageTypes.GQL_START,
        payload: {
          query: message.query,
          operationName: message.operationName,
          variables: message.variables,
        },
      };
      break;
    case MessageTypes.SUBSCRIPTION_END:
      messageToReturn = { ...message, type: MessageTypes.GQL_STOP };
      break;
    case MessageTypes.GQL_CONNECTION_ACK:
      if (connectionContext.isLegacy) {
        messageToReturn = { ...message, type: MessageTypes.INIT_SUCCESS };
      }
      break;
    case MessageTypes.GQL_CONNECTION_ERROR:
      if (connectionContext.isLegacy) {
        messageToReturn = {
          ...message, type: MessageTypes.INIT_FAIL,
          payload: message.payload.message ? { error: message.payload.message } : message.payload,
        };
      }
      break;
    case MessageTypes.GQL_ERROR:
      if (connectionContext.isLegacy) {
        messageToReturn = { ...message, type: MessageTypes.SUBSCRIPTION_FAIL };
      }
      break;
    case MessageTypes.GQL_DATA:
      if (connectionContext.isLegacy) {
        messageToReturn = { ...message, type: MessageTypes.SUBSCRIPTION_DATA };
      }
      break;
    case MessageTypes.GQL_COMPLETE:
      if (connectionContext.isLegacy) {
        messageToReturn = null;
      }
      break;
    case MessageTypes.SUBSCRIPTION_SUCCESS:
      if (!connectionContext.isLegacy) {
        messageToReturn = null;
      }
      break;
    default:
      break;
  }

  return messageToReturn;
}

module.exports = {
  parseLegacyProtocolMessage
}
