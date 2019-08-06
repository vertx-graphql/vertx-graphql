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

// Current latest version of GraphiQL.
const GRAPHIQL_VERSION = '0.12.0';

/*
 * When vertx-graphql receives a request which does not Accept JSON, but does
 * Accept HTML, it may present GraphiQL, the in-browser GraphQL explorer IDE.
 *
 * When shown, it will be pre-populated with the result of having executed the
 * requested query.
 */

const renderGraphiQL = ({
  ENDPOINT,
  SUBSCRIPTIONS,
  THEME,
  INTROSPECTION,
  DEFAULT
}) => {
  return `
    <!--
    *  Copyright (c) Facebook, Inc.
    *  All rights reserved.
    *
    *  This source code is licensed under the license found in the
    *  LICENSE file in the root directory of this source tree.
    * 
    *  The request to this GraphQL server provided the header "Accept: text/html"
    *  and as a result has been presented GraphiQL - an in-browser IDE for
    *  exploring GraphQL.
    * 
    *  If you wish to receive JSON, provide the header "Accept: application/json" or
    *  add "&raw" to the end of the URL within a browser.
    -->

    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>GraphiQL</title>
        <meta name="robots" content="noindex" />
        <meta name="referrer" content="origin" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="shortcut icon" href="https://graphql.org/img/favicon.png">
        <style>
          body {
            margin: 0;
            overflow: hidden;
          }
          #graphiql {
            height: 100vh;
          }
        </style>

        <link href="//cdn.jsdelivr.net/npm/graphiql@${GRAPHIQL_VERSION}/graphiql.css" rel="stylesheet" />
        <script src="//cdn.jsdelivr.net/es6-promise/4.0.5/es6-promise.auto.min.js"></script>
        <script src="//cdn.jsdelivr.net/fetch/0.9.0/fetch.min.js"></script>
        <script src="//cdn.jsdelivr.net/react/15.4.2/react.min.js"></script>
        <script src="//cdn.jsdelivr.net/react/15.4.2/react-dom.min.js"></script>
        <script src="//cdn.jsdelivr.net/npm/graphiql@${GRAPHIQL_VERSION}/graphiql.min.js"></script>

        ${ THEME ? `<link rel="stylesheet" href="https://codemirror.net/theme/${THEME}.css" />` : ''}

        ${ SUBSCRIPTIONS
          ? `<script src="//unpkg.com/subscriptions-transport-ws@0.5.4/browser/client.js"></script>
            <script src="//unpkg.com/graphiql-subscriptions-fetcher@0.0.2/browser/client.js"></script>`: ''}
      </head>
      <body>
        <div id="graphiql">Loading...</div>
        <script>
          // Parse the search string to get url parameters.
          var search = window.location.search;
          var parameters = {};
          search.substr(1).split('&').forEach(function (entry) {
            var eq = entry.indexOf('=');
            if (eq >= 0) {
              parameters[decodeURIComponent(entry.slice(0, eq))] =
                decodeURIComponent(entry.slice(eq + 1));
            }
          });

          // if variables was provided, try to format it.
          if (parameters.variables) {
            try {
              parameters.variables =
                JSON.stringify(JSON.parse(parameters.variables), null, 2);
            } catch (e) {
              // Do nothing, we want to display the invalid JSON as a string, rather
              // than present an error.
            }
          }

          // When the query and variables string is edited, update the URL bar so
          // that it can be easily shared
          function onEditQuery(newQuery) {
            parameters.query = newQuery;
            updateURL();
          }

          function onEditVariables(newVariables) {
            parameters.variables = newVariables;
            updateURL();
          }

          function onEditOperationName(newOperationName) {
            parameters.operationName = newOperationName;
            updateURL();
          }

          function updateURL() {
            var newSearch = '?' + Object.keys(parameters).filter(function (key) {
              return Boolean(parameters[key]);
            }).map(function (key) {
              return encodeURIComponent(key) + '=' +
                encodeURIComponent(parameters[key]);
            }).join('&');
            history.replaceState(null, null, newSearch);
          }

          // Defines a GraphQL fetcher using the fetch API. You're not required to
          // use fetch, and could instead implement graphQLFetcher however you like,
          // as long as it returns a Promise or Observable.
          function graphQLFetcher(graphQLParams) {
            // This example expects a GraphQL server at the path /graphql.
            // Change this to point wherever you host your GraphQL server.
            return fetch(window.location.origin + '${ENDPOINT}', {
              method: 'post',
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(graphQLParams),
              credentials: 'include',
            }).then(function (response) {
              return response.text();
            }).then(function (responseBody) {
              try {
                return JSON.parse(responseBody);
              } catch (error) {
                return responseBody;
              }
            });
          }

          // Render <GraphiQL /> into the body.
          // See the README in the top level of this module to learn more about
          // how you can customize GraphiQL by providing different values or
          // additional child elements.

          ${ SUBSCRIPTIONS ? `
            let subscriptionsClient = new window.SubscriptionsTransportWs.SubscriptionClient('ws://' + window.location.host + '${SUBSCRIPTIONS}', {
              reconnect: true
            });
            let customFetcher = window.GraphiQLSubscriptionsFetcher.graphQLFetcher(subscriptionsClient, graphQLFetcher);
          ` : '' }

          ReactDOM.render(
            React.createElement(GraphiQL, {
              fetcher: ${ SUBSCRIPTIONS
                ? 'customFetcher'
                : 'graphQLFetcher' },
              schema: ${INTROSPECTION},
              query: parameters.query,
              variables: parameters.variables,
              operationName: parameters.operationName,
              onEditQuery: onEditQuery,
              onEditVariables: onEditVariables,
              onEditOperationName: onEditOperationName,
              ${ DEFAULT ? `defaultQuery: '${DEFAULT}',`: ''}
              ${ THEME ? `editorTheme: '${THEME}',` : '' }
            }),
            document.getElementById('graphiql')
          );
        </script>
      </body>
    </html>
  `;
};

module.exports = { 
  renderGraphiQL
};
