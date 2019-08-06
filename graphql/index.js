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

      return message;
    }
  },
  Subscription: {
    messageCreated: {
      subscribe: () => {
        console.log('messageCreated')
      }
    },
    newMessage: {
      subscribe: () => {
        console.log('newMessage')
      }
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
    newMessage: Message
  }
`;

const context = {}

module.exports = {
  resolvers,
  typeDefs,
  context
}
