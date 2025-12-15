const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const productsRoutes = require('./routes/products');
const purchasesRoutes = require('./routes/purchases');
const salesRoutes = require('./routes/sales');
const historyRoutes = require('./routes/history');
const financeRoutes = require('./routes/finance');

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/purchases', purchasesRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/finance', financeRoutes);

// Serve client if built
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('/', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log('Server running on port', port));
