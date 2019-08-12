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

/// <reference types="@vertx/core" />
/// <reference types="@vertx/web" />

import { BodyHandler, } from '@vertx/web';
import { graphql, buildSchema, parse, validate, execute, specifiedRules, subscribe } from 'graphql';

import { renderGraphiQL } from './render-graphiql';
import { renderPlayground } from './render-playground';
import { parseBody } from './parse-body';
import { MessageTypes } from './message-types';
import { GRAPHQL_SUBSCRIPTIONS, GRAPHQL_WS } from './protocols';
import { createAsyncIterator, forAwaitEach, isAsyncIterable } from 'iterall';
import { parseLegacyProtocolMessage, isObject, createEmptyIterable, isASubscriptionOperation } from '../utils';

import {
  themesGraphiQL,
  themesPlayground
} from './themes';

const getGraphQLParams = (ctx) => {
  return parseBody(ctx)
    .then(({ error, data }) => {
      return { error, data };
    });
}

const WebSocket = {
  OPEN: true,
  CLOSED: false
}

const graphqlVertx = ({ schema, resolvers, context }, introspection) => {
  return (ctx) => {
    const response = ctx.response();

    return getGraphQLParams(ctx)
      .then((params) => {
        return params;
      })
      .then(({ error, data }) => {
        if (error) {
          return response
            .putHeader('content-type', 'application/json')
            .setChunked(true)
            .write(JSON.stringify({
              data: null,
              errors: [
                {
                  message: 'A query attribute must be specified and must be a string.'
                }
              ]
            }))
            .end();
        }

        const requestString = data.query;
        const contextValue = context;
        const variableValues = data.variables;
        const operationName = data.operationName;

        const rootValue = {
          ...resolvers.Query,
          ...resolvers.Mutation,
          ...resolvers.Subscription
        };

        graphql(
          schema,
          requestString,
          rootValue,
          contextValue,
          variableValues,
          operationName
        ).then((resolvedData) => {
          if (resolvedData.errors) {
            return response
              .putHeader('content-type', 'application/json')
              .setChunked(true)
              .write(JSON.stringify({
                errors: resolvedData.errors
              }))
              .end();
          }

          if (introspection === false) {
            if (resolvedData &&
                resolvedData.data &&
                (resolvedData.data.__schema || resolvedData.data.__type)) {
                  return response
                    .putHeader('content-type', 'application/json')
                    .setChunked(true)
                    .write()
                    .end();
            } else {
              return response
                .putHeader('content-type', 'application/json')
                .setChunked(true)
                .write(JSON.stringify(resolvedData))
                .end();
            }
          } else {
            return response
              .putHeader('content-type', 'application/json')
              .setChunked(true)
              .write(JSON.stringify(resolvedData))
              .end();
          }
        });
      });
  }
}

const graphiqlHandler = (options) => {
  if (!options || typeof options !== 'object') {
    throw new Error('GraphQL middleware requires options.');
  }

  const html = renderGraphiQL({
    ENDPOINT: options.endpoint,
    SUBSCRIPTIONS: options.subscriptions,
    THEME: options.theme,
    INTROSPECTION: options.introspection,
    DEFAULT: options.defaultQuery
  });

  return (ctx) => {
    return ctx.response()
      .putHeader('content-type', 'text/html')
      .setChunked(true)
      .write(html)
      .end()
  }
}

const playgroundHandler = (options) => {
  if (!options || typeof options !== 'object') {
    throw new Error('GraphQL middleware requires options.');
  }

  const html = renderPlayground({
    ENDPOINT: options.endpoint,
    SUBSCRIPTIONS: options.subscriptions,
    THEME: options.theme,
    TABS: JSON.stringify(options.tabs, null, 2),
    INTROSPECTION: options.introspection
  });

  return (ctx) => {
    return ctx.response()
      .putHeader('content-type', 'text/html')
      .setChunked(true)
      .write(html)
      .end()
  }
}

class GraphQLServer {
  constructor(options = {}) {
    if (!options.typeDefs) {
      throw Error('GraphQL type definitions are not defined')
    }

    if (!options.typeDefs) {
      throw Error('GraphQL resolvers are not defined')
    }

    this.schema = buildSchema(options.typeDefs);
    this.resolvers = options.resolvers;

    this.rootValue = {
      ...this.resolvers.Query,
      ...this.resolvers.Mutation,
      ...this.resolvers.Subscription
    };

    this.context = options.context;
    this.graphqlPath = null;
    this.subscriptionsPath = null;
    this.introspection = options.introspection;
    this.playground = options.playground;
    this.graphiql = options.graphiql;
    this.tracing = options.tracing;
    this.execute = execute;
    this.subscribe = subscribe;
    this.specifiedRules = options.validationRules || specifiedRules;
    this.onConnect = options.subscriptions ? options.subscriptions.onConnect: null;
    this.onDisconnect = options.subscriptions ? options.subscriptions.onDisconnect: null;
    this.onOperation = options.subscriptions ? options.subscriptions.onOperation: null;
    this.onOperationComplete = options.subscriptions ? options.subscriptions.onOperationComplete: null;
  }

  applyMiddleware({ app, path = '/graphql' }) {
    if (!app) {
      throw new Error('app is not defined')
    }
    
    this.graphqlPath = path;
    this.subscriptionsPath = '/subscriptions';

    if (typeof path === 'string') {
      path = (path[0] === '/')
        ? path
        : `/${path}`;
    } else {
      path = '/graphql';
    }

    const env = JSON.parse(JSON.stringify(process.env));
    const playground = this.playground;
    const graphiql = this.graphiql;
    const introspection = this.introspection;

    app.post(path).handler(BodyHandler.create().handle);

    app.post(path).handler(graphqlVertx({
      schema: this.schema,
      resolvers: this.resolvers,
      context: this.context
    }, introspection));

    if (graphiql && !playground) {
      app.get(path).handler(graphiqlHandler({ 
        endpoint: path,
        subscriptions: this.subscriptionsPath || '',
        theme: graphiql &&
               graphiql.settings &&
               themesGraphiQL.includes(graphiql.settings['editor.theme']) ? graphiql.settings['editor.theme']: null,
        introspection: this.introspection === false ? null: undefined,
        defaultQuery: graphiql &&
                      graphiql.defaultQuery ? graphiql.defaultQuery: null
      }));
    } else if (playground) {
      app.get(path).handler(playgroundHandler({ 
        endpoint: path,
        subscriptions: this.subscriptionsPath || '',
        theme: playground &&
               playground.settings &&
               themesPlayground.includes(playground.settings['editor.theme']) ? playground.settings['editor.theme']: null,
        tabs: playground &&
              playground.tabs &&
              Array.isArray(playground.tabs) &&
              playground.tabs.length ? playground.tabs: null,
        introspection: this.introspection === false ? null: undefined
      }));
    } else {
      if (env.ES4X_ENV !== 'production') {
        if (playground !== false) {
          app.get(path).handler(playgroundHandler({ 
            endpoint: path,
            subscriptions: this.subscriptionsPath || '',
            theme: playground &&
                   playground.settings &&
                   themesPlayground.includes(playground.settings['editor.theme']) ? playground.settings['editor.theme']: null,
            tabs: playground &&
                  playground.tabs &&
                  Array.isArray(playground.tabs) &&
                  playground.tabs.length ? playground.tabs: null,
            introspection: this.introspection === false ? null: undefined
          }));
        } else if (graphiql !== false) {
          app.get(path).handler(graphiqlHandler({ 
            endpoint: path,
            subscriptions: this.subscriptionsPath || '',
            theme: graphiql &&
                   graphiql.settings &&
                   graphiql.settings['editor.theme'] &&
                   themesGraphiQL.includes(graphiql.settings['editor.theme']) ? graphiql.settings['editor.theme']: null,
            introspection: this.introspection === false ? null: undefined,
            defaultQuery: graphiql &&
                          graphiql.defaultQuery ? graphiql.defaultQuery: null
          }));
        }
      }
    }
  }

  unsubscribe(connectionContext, opId) {
    if (connectionContext.operations && connectionContext.operations[opId]) {
      if (connectionContext.operations[opId].return) {
        connectionContext.operations[opId].return();
      }

      delete connectionContext.operations[opId];

      if (this.onOperationComplete) {
        this.onOperationComplete(connectionContext.socket, opId);
      }
    }
  }

  onClose (connectionContext) {
    Object.keys(connectionContext.operations).forEach((opId) => {
      this.unsubscribe(connectionContext, opId);
    });
  }

  onMessage (connectionContext) {
    return (message) => {
      let parsedMessage;
      try {
        parsedMessage = parseLegacyProtocolMessage(connectionContext, JSON.parse(message));
      } catch (e) {
        this.sendError(connectionContext, 1, { message: e.message }, "error");
        return;
      }

      const opId = parsedMessage.id;

      switch (parsedMessage.type) {
        case MessageTypes.GQL_CONNECTION_INIT:
          if (this.onConnect && typeof this.onConnect === 'function') {
            connectionContext.initPromise = new Promise((resolve, reject) => {
              try {
                resolve(this.onConnect(parsedMessage.payload, connectionContext));
              } catch (e) {
                reject(e);
              }
            });
          }

          connectionContext.initPromise
            .then((result) => {
              if (result === false) {
                throw new Error('Prohibited connection!');
              }

              try {
                this.sendMessage(
                  connectionContext,
                  undefined,
                  MessageTypes.GQL_CONNECTION_ACK,
                  undefined,
                );
              } catch (error) {
                console.log('ERR', error.toString())
              }
            })
            .catch((error) => {
              this.sendError(
                connectionContext,
                opId,
                { message: error.message },
                MessageTypes.GQL_CONNECTION_ERROR,
              );

              // Close the connection with an error code, ws v2 ensures that the
              // connection is cleaned up even when the closing handshake fails.
              // We are using setTimeout because we want the message to be flushed before
              // disconnecting the client
              setTimeout(() => {
                connectionContext.socket.close();
              }, 10);
            });
          break;
        case MessageTypes.GQL_CONNECTION_TERMINATE:
          connectionContext.socket.close();
          break;
        case MessageTypes.GQL_START:
          connectionContext.initPromise
            .then((initResult) => {
              // if we already have a subscription with this id, unsubscribe from it first
              if (connectionContext.operations && connectionContext.operations[opId]) {
                this.unsubscribe(connectionContext, opId);
              }

              const baseParams = {
                query: parsedMessage.payload.query,
                variables: parsedMessage.payload.variables,
                operationName: parsedMessage.payload.operationName,
                context: isObject(initResult) ? Object.assign(Object.create(Object.getPrototypeOf(initResult)), initResult) : {},
                formatResponse: undefined,
                formatError: undefined,
                callback: undefined,
                schema: this.schema,
              };
              let promisedParams = Promise.resolve(baseParams);

              // set an initial mock subscription to only registering opId
              connectionContext.operations[opId] = createEmptyIterable();
              
              if (this.onOperation) {
                let messageForCallback = parsedMessage;
                promisedParams = Promise.resolve(this.onOperation(messageForCallback, baseParams, connectionContext.socket));
              }

              promisedParams.then((params) => {
                if (typeof params !== 'object') {
                  const error = `Invalid params returned from onOperation! return values must be an object!`;
                  this.sendError(connectionContext, opId, { message: error });

                  throw new Error(error);
                }

                if (!params.schema) {
                  const error = 'Missing schema information. The GraphQL schema should be provided either statically in' +
                    ' the `SubscriptionServer` constructor or as a property on the object returned from onOperation!';
                  this.sendError(connectionContext, opId, { message: error });

                  throw new Error(error);
                }

                const document = typeof baseParams.query !== 'string' ? baseParams.query : parse(baseParams.query);
                let executionPromise
                const validationErrors = validate(params.schema, document, this.specifiedRules);
                
                if ( validationErrors.length > 0 ) {
                  executionPromise = Promise.resolve({ errors: validationErrors });
                } else {
                  let executor = this.execute;
                  if (this.subscribe && isASubscriptionOperation(document, params.operationName)) {
                    executor = this.subscribe;
                  }

                  executionPromise = Promise.resolve(executor(
                    params.schema,
                    document,
                    this.rootValue,
                    params.context,
                    params.variables,
                    params.operationName));
                }

                return executionPromise.then((executionResult) => ({
                  executionIterable: isAsyncIterable(executionResult) ?
                    executionResult : createAsyncIterator([ executionResult ]),
                  params,
                }));
              })
              .then(({ executionIterable, params }) => {
                forAwaitEach(executionIterable, (value) => {
                    let result = value;
  
                    if (params.formatResponse) {
                      try {
                        result = params.formatResponse(value, params);
                      } catch (err) {
                        console.error('Error in formatError function:', err);
                      }
                    }
                    this.sendMessage(connectionContext, opId, MessageTypes.GQL_DATA, result);
                  })
                  .then(() => {
                    this.sendMessage(connectionContext, opId, MessageTypes.GQL_COMPLETE, null);
                  })
                  .catch((e) => {
                    let error = e;
  
                    if (params.formatError) {
                      try {
                        error = params.formatError(e, params);
                      } catch (err) {
                        console.error('Error in formatError function: ', err);
                      }
                    }
  
                    // plain Error object cannot be JSON stringified.
                    if (Object.keys(e).length === 0) {
                      error = { name: e.name, message: e.message };
                    }
  
                    this.sendError(connectionContext, opId, error);
                  });

                return executionIterable;
              })
              .then((subscription) => {
                connectionContext.operations[opId] = subscription;
              })
              .then(() => {
                // NOTE: This is a temporary code to support the legacy protocol.
                // As soon as the old protocol has been removed, this coode should also be removed.
                this.sendMessage(connectionContext, opId, MessageTypes.SUBSCRIPTION_SUCCESS, undefined);
              })
              .catch((e) => {
                if (e.errors) {
                  this.sendMessage(connectionContext, opId, MessageTypes.GQL_DATA, { errors: e.errors });
                } else {
                  this.sendError(connectionContext, opId, { message: e.message });
                }
  
                // Remove the operation on the server side as it will be removed also in the client
                this.unsubscribe(connectionContext, opId);
                return;
              });
              return promisedParams;
            })
            .catch((error) => {
              // Handle initPromise rejected
              this.sendError(connectionContext, opId, { message: error.message });
              this.unsubscribe(connectionContext, opId);
            });
          break;

        case MessageTypes.GQL_STOP:
          // Find subscription id. Call unsubscribe.
          this.unsubscribe(connectionContext, opId);
          break;

        default:
          this.sendError(connectionContext, opId, { message: 'Invalid message type!' });
      }
    }
  }

  setSubscriptionOptions(options) {
    let protocols = options.getWebsocketSubProtocols() || '';

    const getProtocolList = (protocols) => protocols.split(',').map(s => s.trim());
    const protocolList = getProtocolList(protocols);

    if (
      !protocols.includes(GRAPHQL_SUBSCRIPTIONS) &&
      !protocols.includes(GRAPHQL_WS)
    ) {
      protocolList.push(GRAPHQL_SUBSCRIPTIONS);
      protocolList.push(GRAPHQL_WS);
    } else if (
      protocols.includes(GRAPHQL_SUBSCRIPTIONS) &&
      !protocols.includes(GRAPHQL_WS)
    ) {
      protocolList.push(GRAPHQL_WS);
    } else if (
      !protocols.includes(GRAPHQL_SUBSCRIPTIONS) &&
      protocols.includes(GRAPHQL_WS)
    ) {
      protocolList.push(GRAPHQL_SUBSCRIPTIONS);
    }

    options.setWebsocketSubProtocols(protocolList.join());
    return options;
  }

  installSubscriptionHandlers(app) {
    if (typeof this.subscriptionsPath === 'string') {
      app.route(this.subscriptionsPath).handler((ctx) => {
        const request = ctx.request();
        const response = request.response();
        const headers = response.headers();
        const websocket = request.upgrade();
        const websocketProtocol =  websocket.subProtocol();
        if (
          websocketProtocol === undefined ||
          (
            websocketProtocol.indexOf(GRAPHQL_WS) === -1 &&
            websocketProtocol.indexOf(GRAPHQL_SUBSCRIPTIONS) === -1
          )
        ) {
          websocket.close();
          return;
        }

        const connectionContext = Object.create(null);
        connectionContext.initPromise = Promise.resolve(true);
        connectionContext.isLegacy = false;
        connectionContext.socket = websocket;
        connectionContext.request = request;
        connectionContext.operations = {};
        connectionContext.readyState = true

        const connectionCloseHandler = (error) => {
          if (error) {
            this.sendError(
              connectionContext,
              '',
              { message: error.message ? error.message : error },
              MessageTypes.GQL_CONNECTION_ERROR,
            );
  
            setTimeout(() => {
              connectionContext.socket.close();
            }, 10);
          }
          
          this.onClose(connectionContext);
  
          if (this.onDisconnect && typeof this.onDisconnect === 'function') {
            this.onDisconnect(websocket, connectionContext);
          }
        }

        websocket.closeHandler(connectionCloseHandler);
        websocket.exceptionHandler(connectionCloseHandler);
        websocket.textMessageHandler(this.onMessage(connectionContext));
      });
    }

    return app;
  }

  sendKeepAlive(connectionContext) {
    if (connectionContext.isLegacy) {
      this.sendMessage(connectionContext, undefined, MessageTypes.KEEP_ALIVE, undefined);
    } else {
      this.sendMessage(connectionContext, undefined, MessageTypes.GQL_CONNECTION_KEEP_ALIVE, undefined);
    }
  }

  sendMessage (connectionContext, opId, type, payload) {
    const parsedMessage = parseLegacyProtocolMessage(connectionContext, {
      type,
      id: opId,
      payload,
    });

    if (parsedMessage && connectionContext.readyState === WebSocket.OPEN) {
      connectionContext.socket.writeTextMessage(JSON.stringify(parsedMessage));
    }
  }

  sendError (connectionContext, opId, errorPayload, overrideDefaultErrorType) {
    const sanitizedOverrideDefaultErrorType = overrideDefaultErrorType || MessageTypes.GQL_ERROR;

    if ([
      MessageTypes.GQL_CONNECTION_ERROR,
      MessageTypes.GQL_ERROR,
    ].indexOf(sanitizedOverrideDefaultErrorType) === -1) {
      throw new Error('overrideDefaultErrorType should be one of the allowed error messages' +
        ' GQL_CONNECTION_ERROR or GQL_ERROR');
    }

    this.sendMessage(
      connectionContext,
      opId,
      sanitizedOverrideDefaultErrorType,
      errorPayload,
    );
  }
}

module.exports = { 
  GraphQLServer
};
