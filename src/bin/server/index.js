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
import { graphql, buildSchema } from 'graphql';

import { renderGraphiQL } from './render-graphiql';
import { renderPlayground } from './render-playground';
import { parseBody } from './parse-body';
import { MessageTypes } from './message-types';
import { GRAPHQL_SUBSCRIPTIONS, GRAPHQL_WS } from './protocols';
import { parseLegacyProtocolMessage } from '../utils';

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

        var rootValue = {
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
    this.context = options.context;
    this.graphqlPath = null;
    this.subscriptionsPath = null;
    this.introspection = options.introspection;
    this.playground = options.playground;
    this.graphiql = options.graphiql;
    this.tracing = options.tracing;
    this.onConnect = options.subscriptions ? options.subscriptions.onConnect: null;
    this.onDisconnect = options.subscriptions ? options.subscriptions.onDisconnect: null;
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

        // Callback when Websocket connects
        if (typeof this.onConnect === 'function') {
          if (typeof connectionContext === 'object') {
            connectionContext.readyState = true
          }
          this.onConnect(websocket);
        }

        const connectionCloseHandler = () => {
          // Callback when Websocket disconnects
          if (typeof connectionContext === 'object') {
            connectionContext.readyState = false
          }
          if (typeof this.onDisconnect === 'function') {
            this.onDisconnect(websocket);
          }
        }

        const sendMessage = (connectionContext, opId, type, payload) => {
          const parsedMessage = parseLegacyProtocolMessage(connectionContext, {
            type,
            id: opId,
            payload,
          });

          if (parsedMessage && connectionContext.readyState === WebSocket.OPEN) {
            connectionContext.socket.writeFinalTextFrame(JSON.stringify(parsedMessage));
          }
        }

        const sendError = (connectionContext, opId, errorPayload, overrideDefaultErrorType) => {
          const sanitizedOverrideDefaultErrorType = overrideDefaultErrorType || MessageTypes.GQL_ERROR;

          if ([
            MessageTypes.GQL_CONNECTION_ERROR,
            MessageTypes.GQL_ERROR,
          ].indexOf(sanitizedOverrideDefaultErrorType) === -1) {
            throw new Error('overrideDefaultErrorType should be one of the allowed error messages' +
              ' GQL_CONNECTION_ERROR or GQL_ERROR');
          }

          sendMessage(
            connectionContext,
            opId,
            sanitizedOverrideDefaultErrorType,
            errorPayload,
          );
        }

        const onMessage = (connectionContext) => {
          return (message) => {
            let parsedMessage;

            try {
              parsedMessage = parseLegacyProtocolMessage(connectionContext, JSON.parse(message));
              const variables = parsedMessage.payload.variables
              const extensions = parsedMessage.payload.extensions
              const operationName = parsedMessage.payload.operationName
              const query = parsedMessage.payload.query

              if (query) {
                console.log('subscription', query)

                const text = JSON.stringify({
                  type: "data",
                  id: "1",
                  payload: {
                    data: {
                      messageCreated: "Test" + new Date().getTime()
                    }
                  }
                })

                try {
                  connectionContext.socket.writeFinalTextFrame(text);
                } catch (error) {
                  console.log(error.toString())
                }
              }
            } catch (e) {
              sendError(connectionContext, 1, { message: e.message }, "error");
              return;
            }
          }
        }

        websocket.closeHandler(connectionCloseHandler);
        websocket.exceptionHandler(connectionCloseHandler);
        websocket.textMessageHandler(onMessage(connectionContext));
      });
    }

    return app;
  }
}

module.exports = { 
  GraphQLServer
};
