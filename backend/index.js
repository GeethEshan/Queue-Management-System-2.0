const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const xlsx = require('xlsx');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'https://queue-management-system-2-0-t3kg.vercel.app',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});


// Middleware
app.use(cors({
  origin: 'https://queue-management-system-2-0-t3kg.vercel.app', // Allow requests from your frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allowed methods
  credentials: true, // If cookies or credentials are used
}));

app.use(express.json());

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // store files in the "uploads" folder
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname); // Add timestamp to filename to avoid conflicts
  },
});
const upload = multer({ storage });


// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Models
const Section = mongoose.model('Section', new mongoose.Schema({ name: String }));
const Queue = mongoose.model('Queue', new mongoose.Schema({
  membershipNumber: String,
  section: String,
  position: Number,
  isCurrentlyServing: { type: Boolean, default: false },
}));
const Customer = mongoose.model('Customer', new mongoose.Schema({
  membershipNo: String,
  name: String,
  designation: String,
  hospital: String,
}));

// Check Status Model
const CheckStatus = mongoose.model('checkstatusqueues', new mongoose.Schema({
  membershipNumber: { type: String, required: true, unique: true }, // Add unique membershipNumber
  name: { type: String }, // Customer's name
  designation: { type: String }, // Customer's designation
  hospital: { type: String }, // Customer's hospital
  section: { type: String }, // Section for classification
  status: { type: String, default: 'pending' }, // Default status is 'pending'
}));




// SECTION ROUTES
app.post('/sections', async (req, res) => {
  try {
    const section = new Section(req.body);
    await section.save();
    io.emit('sectionAdded', section);
    res.status(201).send(section);
  } catch (err) {
    res.status(400).send(err.message);
  }
});

app.get('/sections', async (req, res) => {
  try {
    const sections = await Section.find();
    res.send(sections);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.delete('/sections/:id', async (req, res) => {
  try {
    const section = await Section.findByIdAndDelete(req.params.id);
    if (!section) {
      return res.status(404).send({ message: 'Section not found' });
    }
    await Queue.deleteMany({ section: section.name });
    io.emit('section-deleted', section._id);
    res.send({ message: 'Section and associated queues deleted' });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.put('/sections/:id', async (req, res) => {
  try {
    const { name: newName } = req.body;
    const section = await Section.findById(req.params.id);
    if (!section) {
      return res.status(404).send({ message: 'Section not found' });
    }
    const oldName = section.name;
    section.name = newName;
    await section.save();
    await Queue.updateMany({ section: oldName }, { section: newName });
    io.emit('section-updated', section);
    res.send({ message: 'Section and associated queues updated successfully', section });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// CUSTOMER ROUTES
app.post('/customers', async (req, res) => {
  try {
    const customer = new Customer(req.body);
    await customer.save();
    res.status(201).send(customer);
  } catch (err) {
    res.status(400).send(err.message);
  }
});

app.get('/customers', async (req, res) => {
  try {
    const customers = await Customer.find();
    res.send(customers);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// New PUT route for editing customer details
app.put('/customers/:id', async (req, res) => {
  try {
    const { membershipNo, name, designation, hospital } = req.body;
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).send({ message: 'Customer not found' });
    }
    customer.membershipNo = membershipNo || customer.membershipNo;
    customer.name = name || customer.name;
    customer.designation = designation || customer.designation;
    customer.hospital = hospital || customer.hospital;
    await customer.save();
    res.send({ message: 'Customer updated successfully', customer });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.delete('/customers/:id', async (req, res) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) {
      return res.status(404).send({ message: 'Customer not found' });
    }
    res.send({ message: 'Customer deleted' });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Add Excel upload route for customer data
app.post('/upload-excel', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).send('No file uploaded');
    }

    // Read the Excel file
    const workbook = xlsx.readFile(file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]]; // Get the first sheet
    const data = xlsx.utils.sheet_to_json(sheet);

    // Process each row in the Excel file and save customers to MongoDB
    for (const row of data) {
      const { membershipNo, name, designation, hospital } = row;

      // Create and save a new customer document
      const customer = new Customer({ membershipNo, name, designation, hospital });
      await customer.save();
    }

    // Emit event for frontend
    io.emit('customer-uploaded', { message: 'Customers uploaded successfully' });

    // Send response back to client
    res.status(201).send({ message: 'Customers uploaded and saved to database successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error processing file');
  }
});

// QUEUE ROUTES
app.post('/queue', async (req, res) => {
  try {
    const { membershipNumber, section } = req.body;
    const position = (await Queue.countDocuments({ section })) + 1;
    const queueItem = new Queue({ membershipNumber, section, position });
    await queueItem.save();
    io.emit('queue-updated', { section });
    res.status(201).send(queueItem);
  } catch (err) {
    res.status(400).send(err.message);
  }
});

app.get('/queue/:section', async (req, res) => {
  try {
    const queue = await Queue.find({ section: req.params.section }).sort({ position: 1 });
    res.send(queue);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.delete('/queue/:id', async (req, res) => {
  try {
    const queueItem = await Queue.findById(req.params.id);
    const section = queueItem.section;
    await Queue.findByIdAndDelete(req.params.id);
    const queue = await Queue.find({ section }).sort({ position: 1 });
    for (const [index, item] of queue.entries()) {
      item.position = index + 1;
      await item.save();
    }
    io.emit('queue-updated', { section });
    res.send({ message: 'Queue updated' });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get('/queues', async (req, res) => {
  try {
    const queues = await Queue.find().sort({ section: 1, position: 1 });
    res.json(queues);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.post('/finish-customer/:section', async (req, res) => {
  try {
    const currentCustomer = await Queue.findOneAndUpdate(
      { section: req.params.section, isCurrentlyServing: true },
      { isCurrentlyServing: false },
      { new: true }
    );
    if (!currentCustomer) {
      return res.status(400).send({ message: 'No customer is currently being served in this section.' });
    }
    const nextCustomer = await Queue.findOne({ section: req.params.section, position: currentCustomer.position + 1 });
    if (nextCustomer) {
      nextCustomer.isCurrentlyServing = true;
      await nextCustomer.save();
    }
    io.emit('queue-updated', { section: req.params.section });
    res.send({ message: 'Customer finished, and next customer is now being served.' });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get('/customers/:membershipNumber', async (req, res) => {
  try {
    const customer = await Customer.findOne({ membershipNo: req.params.membershipNumber });
    if (!customer) {
      return res.status(404).send({ message: 'Customer not found' });
    }
    res.send(customer);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Add to Check Status route
app.post('/add-to-check-status', async (req, res) => {
  const { membershipNumber } = req.body;
  
  try {
    const queueItem = await Queue.findOne({ membershipNumber });
    if (!queueItem) {
      return res.status(404).send({ message: 'Queue item not found' });
    }
    
    const checkStatusItem = new CheckStatus({
      membershipNumber: queueItem.membershipNumber,
      name: queueItem.name, // You can add additional info from the Queue if needed
      section: queueItem.section,
    });

    await checkStatusItem.save();

    // Emit real-time event to update Check Status on frontend
    io.emit('check-status-updated');

    res.status(201).send(checkStatusItem);
  } catch (err) {
    res.status(500).send(err.message);
  }
});



// Update the status to "Ready"
app.put('/check-status/:id/ready', async (req, res) => {
  const { id } = req.params;

  try {
    const checkStatusItem = await CheckStatus.findById(id);
    if (!checkStatusItem) {
      return res.status(404).send('Check Status item not found');
    }

    // Update the status to "Ready"
    checkStatusItem.status = 'ready';
    await checkStatusItem.save();  // Ensure this saves to the database

    // Emit real-time event to notify frontend
    io.emit('check-status-updated');

    res.status(200).send(checkStatusItem);
  } catch (err) {
    console.error('Error updating status:', err);
    res.status(500).send('Server error');
  }
});


// Delete Check Status item when collected
app.delete('/check-status/:id/collected', async (req, res) => {
  const { id } = req.params;
  try {
    // Find and delete the item with the given ID from the Check Status collection
    const result = await CheckStatus.findByIdAndDelete(id);

    // If no item is found, return a 204 status with a message indicating no content
    if (!result) {
      return res.status(204).send('No item found to delete');
    }

    // Emit real-time event to notify frontend
    io.emit('check-status-updated');

    // Send a success response
    res.status(200).send('Item deleted');
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});


// backend route to fetch check status items with membership number and status
app.get('/check-status2', async (req, res) => {
  try {
    // Query the database to fetch all documents from the checkstatusqueues collection
    const checkStatusQueue = await CheckStatus.find();

    // Send the fetched data as the response
    res.status(200).send(checkStatusQueue);
  } catch (error) {
    console.error('Error in /check-status2 route:', error);
    res.status(500).send({ status: 'error', message: 'Internal Server Error', error: error.message });
  }
});



// Socket.IO
io.on('connection', (socket) => {
  console.log('Client connected');
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
