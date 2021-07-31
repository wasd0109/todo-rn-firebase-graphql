const functions = require("firebase-functions");
const express = require("express");
const admin = require("firebase-admin");
const {
  ApolloServer,
  gql,
  UserInputError,
  ApolloError,
} = require("apollo-server-express");

const app = express();

admin.initializeApp({ projectId: "rn-todo-full" });

const db = admin.firestore();

const typeDefs = gql`
  type Todo {
    id: String
    title: String
    date: Int
  }
  type Query {
    todos: [Todo]
  }
  type Mutation {
    addTodo(id: String!, title: String, date: Int!): Todo!
    editTodo(id: String!, title: String): Todo!
  }
`;

const resolvers = {
  Query: {
    todos: () => {
      return new Promise((resolve, reject) => {
        fetchAllTodos((data) => {
          resolve(data);
        });
      });
    },
  },
  Mutation: {
    addTodo: async (parent, args) => {
      const { id, title, date } = args;
      const todoRef = await db.collection("todos").doc(id);
      const doc = await todoRef.get();
      if (doc.exists) {
        throw new UserInputError("Todo with the same id already existed");
      }
      try {
        await todoRef.set({ id, title, date });
        return { id, title, date };
      } catch (err) {
        throw new ApolloError("Firebase error", "500");
      }
    },
    editTodo: async (parent, args) => {
      const { id, title } = args;
      const todoRef = await db.collection("todos").doc(id);
      const doc = await todoRef.get();
      if (!doc.exists) {
        throw new UserInputError("Todo with the specified ID do not exist");
      }
      await db.collection("todos").doc(id).update({ title });
      let todo = await (await todoRef.get()).data();
      return todo;
    },
  },
};

const fetchAllTodos = async (callback) => {
  try {
    let todoList = [];
    const result = await db.collection("todos").get();
    result.forEach((todo) => todoList.push(todo.data()));
    console.log(todoList.length);
    return callback(todoList);
  } catch (err) {
    console.log(err);
  }
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

server.applyMiddleware({ app, path: "/" });

exports.graphql = functions.https.onRequest(app);

// app.get("/todos", async (req, res) => {
//   const todosRef = await db.collection("todos").get();
//   let todoList = [];
//   todosRef.forEach((todo) => todoList.push(todo.data()));
//   return res.status(200).send({ todoList });
// });

// app.post("/todos", async (req, res) => {
//   const { title, date, id } = req.body;
//   const result = await db.collection("todos").doc(id).set({ title, date, id });
//   const todosRef = await db.collection("todos").get();
//   res.status(201).send(result);
// });

// const api = functions.https.onRequest(app);
// module.exports = { api };
