import express from 'express';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { fileURLToPath } from 'url';
import path, { dirname } from 'path';
import fs from 'fs';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json());

let users = [];
let posts = [];

const openApiSpec = fs.readFileSync(path.resolve(__dirname, 'openapi.yaml'), 'utf8');
const openApiDefinition = yaml.load(openApiSpec);

const options = {
  definition: openApiDefinition,
  apis: [],
};

const specs = swaggerJSDoc(options);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

app.get('/users', (req, res) => {
  res.json(users);
});

app.post('/users', (req, res) => {
  const newUser = req.body;
  users.push(newUser);
  res.status(201).json(newUser);
});

app.get('/users/:id', (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const user = users.find(u => u.id === userId);
  if (user) {
    res.json(user);
  } else {
    res.status(404).json({ message: 'user not found' });
  }
});

app.get('/users/:id/posts', (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const userPosts = posts.filter(p => p.userId === userId);
  if (userPosts.length > 0) {
    res.json(userPosts);
  } else {
    res.status(404).json({ message: 'user not found or no posts for this user' });
  }
});

app.post('/users/:id/posts', (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const newPost = { ...req.body, userId };
  posts.push(newPost);
  res.status(201).json(newPost);
});

app.delete('/posts/:postId', (req, res) => {
  const postId = parseInt(req.params.postId, 10);
  const postIndex = posts.findIndex(p => p.id === postId);
  if (postIndex !== -1) {
    posts.splice(postIndex, 1);
    res.status(204).send();
  } else {
    res.status(404).json({ message: 'post not found' });
  }
});

app.patch('/posts/:postId', (req, res) => {
  const postId = parseInt(req.params.postId, 10);
  const postIndex = posts.findIndex(p => p.id === postId);
  if (postIndex !== -1) {
    posts[postIndex] = { ...posts[postIndex], ...req.body };
    res.json(posts[postIndex]);
  } else {
    res.status(404).json({ message: 'post not found' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`server running on port ${PORT}`);
});
