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

const MessageTypes = {
  GQL_CONNECTION_INIT: 'connection_init', // Client -> Server
  GQL_CONNECTION_ACK: 'connection_ack', // Server -> Client
  GQL_CONNECTION_ERROR: 'connection_error', // Server -> Client

  // NOTE: The keep alive message type does not follow the standard due to connection optimizations
  GQL_CONNECTION_KEEP_ALIVE: 'ka', // Server -> Client
  
  GQL_CONNECTION_TERMINATE: 'connection_terminate', // Client -> Server
  GQL_START: 'start', // Client -> Server
  GQL_DATA: 'data', // Server -> Client
  GQL_ERROR: 'error', // Server -> Client
  GQL_COMPLETE: 'complete', // Server -> Client
  GQL_STOP: 'stop', // Client -> Server

  // NOTE: The following message types are deprecated and will be removed soon.
  /**
   * @deprecated
   */
  SUBSCRIPTION_START: 'subscription_start',
  /**
   * @deprecated
   */
  SUBSCRIPTION_DATA: 'subscription_data',
  /**
   * @deprecated
   */
  SUBSCRIPTION_SUCCESS: 'subscription_success',
  /**
   * @deprecated
   */
  SUBSCRIPTION_FAIL: 'subscription_fail',
  /**
   * @deprecated
   */
  SUBSCRIPTION_END: 'subscription_end',
  /**
   * @deprecated
   */
  INIT: 'init',
  /**
   * @deprecated
   */
  INIT_SUCCESS: 'init_success',
  /**
   * @deprecated
   */
  INIT_FAIL: 'init_fail',
  /**
   * @deprecated
   */
  KEEP_ALIVE: 'keepalive'
}

module.exports = {
  MessageTypes
}
