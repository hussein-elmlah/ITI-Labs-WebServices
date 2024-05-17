import fastify from 'fastify';
import swagger from '@fastify/swagger';
import swaggerJSDoc from 'swagger-jsdoc';
import { fileURLToPath } from 'url';
import path, { dirname } from 'path';
import fs from 'fs';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = fastify();

// Read OpenAPI spec file (openapi.yaml)
const openApiSpec = fs.readFileSync(path.resolve(__dirname, '..', 'openapi.yaml'), 'utf8');
const openApiDefinition = yaml.load(openApiSpec);

// Swagger JSDoc options
const options = {
  definition: openApiDefinition,
  apis: [],
};

// Initialize Swagger
const mySwagger = swaggerJSDoc(options);

// Register Fastify Swagger plugin
app.register(swagger, {
  routePrefix: '/docs',
  exposeRoute: true,
  swagger: {
    info: {
      title: 'Lab1 API',
      description: 'REST API for managing users and their posts',
      version: '1.0.0',
    },
    servers: [{ url: 'http://localhost:3000', description: 'Local development server' }],
    schemes: ['http'],
    consumes: ['application/json'],
    produces: ['application/json'],
  },
});

// Define your API routes here
app.get('/users', (req, res) => {
  res.send({ message: 'List of users' });
});

// Start the server
const PORT = process.env.PORT || 3004;
app.listen(PORT, '0.0.0.0', (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server running on http://localhost:${PORT}`);
});
