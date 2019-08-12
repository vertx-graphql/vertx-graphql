const { PubSub } = require('../src/index')

const pubsub = new PubSub();
const SOMETHING_CHANGED_TOPIC = 'something_changed';

const resolvers = {
  Query: {
    hello: () => 'Hello world!',
    welcome: () => 'Welcome to Vert.x GraphQL!'
  },
  Mutation: {
    createMessage: ({ input }, context) => {

      const message = {
        id: 123,
        content: 'Content XYZ',
        author: 'Me'
      }

      pubsub.publish(SOMETHING_CHANGED_TOPIC, { messageCreated: message });

      return message;
    }
  },
  Subscription: {
    messageCreated: {
      subscribe: () => pubsub.asyncIterator(SOMETHING_CHANGED_TOPIC)
    }
  }
};

const typeDefs = `
  input MessageInput {
    content: String
    author: String
  }

  type Message {
    id: ID!
    content: String
    author: String
  }

  type Query {
    hello: String
    welcome: String
  }

  type Mutation {
    createMessage(input: MessageInput): Message
  }

  type Subscription {
    messageCreated: Message
  }
`;

const context = {}

module.exports = {
  resolvers,
  typeDefs,
  context
}
