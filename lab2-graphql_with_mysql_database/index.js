const { ApolloServer, gql } = require("apollo-server");
const { GraphQLError } = require("graphql");
const jwt = require('jsonwebtoken');
const bcrypt = require("bcrypt");

const axios = require('axios').default;

const usersDB = [];

const restApi = axios.create({
  baseURL: "http://localhost:3000/",
  timeout: 10000,
  headers: {
    "X-Token": "token",
  }
});


// root types: entrypoint for our operations/query
// Query root type
// scalar types: Int, String, Boolean, Float, ID
// special root types: Query, Mutation

const typeDefs = gql`
  type User {
    id: ID!
    isActive: Boolean!
    age: Int!
    name: String!
    email: String
    role: Role!
    posts (last: Int): [Post]
  }

  type Post {
    id: ID!
    title: String!
    body: String!
  }

  type Comment {
    name: String
  }

  union SearchResult = User | Post | Comment

  enum Role {
    ADMIN
    USER
    GUEST
  }

  input PaginationInput {
    page: Int!
    count: Int!
  }

  type Query {
    helloworld: String
    profile: User
    getPosts (pagination: PaginationInput!): [Post]
    getUsers (pagination: PaginationInput!): [User!]!
    getUserByID (userId: Int!): User!
  }

  type RegisterationResponse {
    isSuccess: Boolean!
    message: String!
  }
  
  type LoginResult {
    isSuccess: Boolean!
    message: String!
    token: String!
  }

  type Mutation {
    register(
      email: String!
      name: String!
      password: String!
    ): RegisterationResponse

    login(
      email: String!
      password: String!
    ): LoginResult
  }
`
const loginResolver = async (parent, args) => {
  const { email, password } = args;
  const user = usersDB.find((user) => user.email === email);
  if (!user) throw new Error("Invalid Credentials");
  const isPasswordMatch = await bcrypt.compare(password, user.password);
  if (!isPasswordMatch) throw new Error("Invalid Credentials");

  const userToken = jwt.sign(
    { email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '1d' },
  )
  
  return {
    isSuccess: true,
    message: "login succeeded",
    token: userToken,
  }


}

const registerUserResolver = async (parent, user) => {
  const isDuplicateUser = !!usersDB
    .find(({ email }) => user.email === email);
  console.log(usersDB);
  if (isDuplicateUser) {
    throw new GraphQLError("the email you entered is duplicate", {
      extensions: { code: "DUPLICATE_EMAIL" }
    })
  }
  const userDoc = {
    ...user,
    password: await bcrypt.hash(user.password, 12),
  }

  usersDB.push(userDoc);
  console.log(usersDB);
  return { isSuccess: true, message: "User registered successfully" };
}

const resolvers = {
  User: {
    posts: async (parent, args) => {
      const { data: userPosts } = await restApi
        .get(`/users/${parent.id}/posts?_limit=${args.last}`);
      return userPosts;
    }
  },
  Mutation: {
    register: registerUserResolver,
    login: loginResolver,
  },
  Query: {
    profile: () => {
      return {};
      return { name: "ahmed", email: "test@sedfsd.com" }
    },
    getUsers: async (parent, args, context) => {
      const { pagination: { page, count } } = args;

      if(!context.loggedUser?.email) {
        throw new Error("UNAUTHORIZED");
      }
      
      const { data: users } = await restApi
        .get(`/users?_limit=${count}&_page=${page}`);

      return users;
    },
    getUserByID: async (parent, args) => {
      const { userId } = args;
      
      const { data: user } = await restApi
        .get(`/users/${userId}`);

      return user;
    }
  }
}

const app = new ApolloServer({
  context: async (ctx) => {
    let loggedUser = null;
    const token = ctx.req.headers["authorization"];
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      loggedUser = payload;
    } catch (error) {
      console.error(error);
    }

    return { loggedUser };
  },
  typeDefs,
  resolvers,
});

app.listen(3001)
 .then(() => console.log("server started"));