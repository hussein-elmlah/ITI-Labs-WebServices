import fastify from 'fastify';
import swaggerJSDoc from 'swagger-jsdoc';
import fastifySwagger from 'fastify-swagger';
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
const swagger = swaggerJSDoc(options);

// Register Fastify Swagger plugin
app.register(fastifySwagger, {
  swagger: {
    info: {
      title: 'Lab1 API',
      description: 'REST API for managing users and their posts',
      version: '1.0.0',
    },
    ...swagger,
  },
  exposeRoute: true,
});

// Define your API routes here
app.get('/users', (req, res) => {
  res.send({ message: 'List of users' });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server listening on ${address}`);
});
