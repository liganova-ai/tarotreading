const express = require('express');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';  // Check if the environment is development
const app = next({ dev });  // Initialize Next.js app
const handle = app.getRequestHandler();  // Default Next.js request handler

app.prepare().then(() => {
  const server = express();

//   // custom routes
//   server.get('/p/:id', (req, res) => {
//     const actualPage = '/post';
//     const queryParams = { id: req.params.id }; 
//     app.render(req, res, actualPage, queryParams);
//   });

    // Body parser middleware
  server.use(express.json()); // This parses incoming JSON requests


  // Handle all other routes through Next.js
  server.all('*', (req, res) => {
    return handle(req, res);
  });

  // Listen on the desired port
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${PORT}`);
  });
});
