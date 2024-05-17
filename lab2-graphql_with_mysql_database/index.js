const { ApolloServer, gql } = require("apollo-server");
const { GraphQLError } = require("graphql");
const jwt = require('jsonwebtoken');
const bcrypt = require("bcrypt");
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'hussein',
  database: 'web_services_lab2',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const getUsersFromDatabase = async (page, count) => {
  const offset = (page - 1) * count;
  const [rows] = await pool.query('SELECT * FROM users LIMIT ?, ?', [offset, count]);
  return rows;
};

const getUserByIdFromDatabase = async (userId) => {
  const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
  return rows[0];
};

const registerUserInDatabase = async (user) => {
  const hashedPassword = await bcrypt.hash(user.password, 12);
  const [result] = await pool.query('INSERT INTO users (email, name, password) VALUES (?, ?, ?)', [user.email, user.name, hashedPassword]);

  if (result.affectedRows === 1) {
    return { isSuccess: true, message: "User registered successfully" };
  } else {
    return { isSuccess: false, message: "Failed to register user" };
  }
};

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
`;

const loginResolver = async (parent, args) => {
  const { email, password } = args;

  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    
    if (!rows[0]) {
      throw new Error("Invalid Credentials");
    }
    
    const isPasswordMatch = await bcrypt.compare(password, rows[0].password);
    
    if (!isPasswordMatch) {
      throw new Error("Invalid Credentials");
    }
    
    const userToken = jwt.sign(
      { email: rows[0].email },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    
    return {
      isSuccess: true,
      message: "Login succeeded",
      token: userToken,
    };
  } catch (error) {
    console.error("Error logging in user:", error);
    throw new Error("Failed to login user");
  }
};

const registerUserResolver = async (parent, { email, name, password }) => {
  try {
    const user = { email, name, password };
    const result = await registerUserInDatabase(user);
    return result;
  } catch (error) {
    console.error("Error registering user:", error);
    throw new Error("Failed to register user");
  }
};

const resolvers = {
  Query: {
    helloworld: () => "Hello, world!",
    profile: () => {
      return {};
    },
    getPosts: () => {
      return [];
    },
    getUsers: async (parent, args, context) => {
      const { pagination: { page, count } } = args;

      if (!context.loggedUser?.email) {
        throw new Error("UNAUTHORIZED");
      }

      try {
        const users = await getUsersFromDatabase(page, count);
        return users;
      } catch (error) {
        console.error("Error fetching users:", error);
        throw new Error("Failed to fetch users from database");
      }
    },
    getUserByID: async (parent, args) => {
      const { userId } = args;

      try {
        const user = await getUserByIdFromDatabase(userId);
        return user;
      } catch (error) {
        console.error("Error fetching user:", error);
        throw new Error("Failed to fetch user from database");
      }
    },
  },
  Mutation: {
    register: registerUserResolver,
    login: loginResolver,
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({ req }) => {
    let loggedUser = null;
    const token = req.headers.authorization || '';

    if (token) {
      try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        loggedUser = payload;
      } catch (error) {
        console.error("Error verifying token:", error);
      }
    }

    return { loggedUser };
  },
});

server.listen(3001).then(({ url }) => {
  console.log(`Server ready at ${url}`);
});
