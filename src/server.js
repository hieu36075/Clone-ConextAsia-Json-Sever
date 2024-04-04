const jsonServer = require('json-server');
const router = jsonServer.router('db.json');
const middlewares = jsonServer.defaults();
const port = 3001;
// JSON Server setup
const server = jsonServer.create();
server.use(middlewares);
server.use(
  jsonServer.rewriter({
    '/api/*': '/$1',
  })
);
server.use(jsonServer.bodyParser);
server.use((req, res, next) => {
  if (req.method === 'POST') {
    req.body.createdAt = Date.now();
    req.body.updatedAt = Date.now();
  } else if (req.method === 'PATCH' || req.method === 'PUT') {
    req.body.updatedAt = Date.now();
  }
  next();
});

server.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res
      .status(400)
      .json({ message: 'Please provide both email and password' });
  }
  const users = router.db.get('users').value();

  const user = users.find((u) => u.email === email && u.password === password);

  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  res.json({ message: 'Login successful' });
});
server.post('/register', (req, res) => {
  const { email, name, password } = req.body;
  if (!email || !name || !password) {
    return res
      .status(400)
      .json({ message: 'Please provide email, name, and password.' });
  }
  const users = router.db.get('users').value();
  const existingUser = users.find((user) => user.email === email);
  if (existingUser) {
    return res
      .status(400)
      .json({ message: 'User already exists with the given email.' });
  }
  const newUser = { id: users.length + 1, email, name, password };
  router.db.get('users').push(newUser).write();
  res.status(201).json({ message: 'User registered successfully.' });
});

server.get('/locations', (req, res, next) => {
  const page = parseInt(req.query._page) || 1;
  const perPage = parseInt(req.query._per_page) || 10;
  let data = router.db.get('Locations').value();
  const totalItems = data.length;
  const totalPages = Math.ceil(totalItems / perPage);
  const startIdx = (page - 1) * perPage;
  const endIdx = startIdx + perPage;
  const paginatedData = data.slice(startIdx, endIdx);
  const firstPage = 1;
  const prevPage = page > 1 ? page - 1 : null;
  const nextPage = page < totalPages ? page + 1 : null;
  const lastPage = totalPages;
  res.json({
    first: firstPage,
    prev: prevPage,
    next: nextPage,
    last: lastPage,
    pages: totalPages,
    items: totalItems,
    data: paginatedData,
  });
});

server.get('/search/locations', (req, res, next) => {
  const queryParams = req.query;
  const locationName = queryParams.name ? queryParams.name.toLowerCase() : null;

  let data = router.db.get('Locations').value();
  let results = [];

  data.forEach((location) => {
    let locationMatch =
      !locationName || location.name.toLowerCase().includes(locationName);
    let filteredWorkplaces = [];

    if (location.Workplaces && locationMatch) {
      const workplaceFilters = Object.keys(queryParams)
        .filter(key => key.startsWith('workplace_'))
        .reduce((filters, key) => {
          const field = key.slice(10); 
          filters[field] = queryParams[key].toLowerCase();
          return filters;
        }, {});

      if (Object.keys(workplaceFilters).length > 0) {
        filteredWorkplaces = location.Workplaces.filter((workplace) => {
          return Object.entries(workplaceFilters).every(([field, value]) => {
            return workplace[field] && workplace[field].toString().toLowerCase().includes(value);
          });
        });
      } else {
        filteredWorkplaces = location.Workplaces;
      }
      if (filteredWorkplaces.length > 0) {
        results.push({
          ...location,
          Workplaces: filteredWorkplaces,
        });
      }
    }
  });

  res.json(results);
});


server.listen(port, () => {
  console.log(`Ecommerce website listening on http://localhost:${port}`);
});
