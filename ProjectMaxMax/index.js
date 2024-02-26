const express = require('express');
const routes = require('./routes');

const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.json({limit: '50mb'}));

app.use(
  bodyParser.urlencoded({
    extended: true,
    limit: '50mb',
    parameterLimit: 5000000,
  }),
);

// app.use(express.json());
app.use('/api', routes);

const port = 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
