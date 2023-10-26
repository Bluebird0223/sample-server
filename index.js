// const express=require('express')
// const app=express()

// app.use('/',(req,res)=>{
//     res.send('server is running')

// })

// app.listen(5000,console.log('server up on 5000'))

const express = require("express");
const mysql = require("mysql");
const cors = require("cors");
const bodyParser = require("body-parser");
const app = express();
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const crypto = require("crypto");
const sessionSecret = crypto.randomBytes(32).toString("hex");
app.use(cors());
app.use(bodyParser.json());

console.log("Session Secret:", sessionSecret);

// database config
const db = mysql.createConnection({
  host: "216.10.240.102",
  user: "falan7rb_naitik_r",
  password: "Registry@2023",
  database: "falan7rb_advocate_invoice",
  port: 3306,
});

// const db = mysql.createConnection({
//   host: "localhost",
//   user: "root",
//   database: "advocate"
// });

db.connect((err) => {
  if (err) {
    console.log("Connection failed: " + err.stack);
    return;
  }
  console.log("Connected to the MySQL database");
});

const sessionStore = new MySQLStore({
  expiration: 86400000, // Session expiration time in milliseconds (adjust as needed)
  createDatabaseTable: true, // Create the sessions table if it doesn't exist
  schema: {
    tableName: "sessions", // Name of the sessions table
    columnNames: {
      session_id: "session_id",
      expires: "expires",
      data: "data",
    },
  },
  host: "216.10.240.102", // MySQL host
  port: 3306, // MySQL port
  user: "falan7rb_naitik_r", // MySQL username
  password: "Registry@2023",
  database: "falan7rb_advocate_invoice", // MySQL database name (same as above)
});

app.use(
  session({
    key: "myAppSession", // Your chosen session key
    secret: sessionSecret, // Use the generated session secret
    store: sessionStore,
    resave: false,
    saveUninitialized: true,
  })
);

app.use('/',(req,res)=>{
  res.send('server started')
})

//ADMIN API
app.get("/admin", (req, res) => {
  const sql = "SELECT * FROM admin_details";
  db.query(sql, (err, data) => {
    if (err) {
      console.error("database error");
      res.status(500).json({ error: "internal server error" });
      return;
    }
    res.json(data);
  });
});

//USER API
app.get("/user", (req, res) => {
  const sql = "SELECT * FROM customer_master";
  db.query(sql, (err, data) => {
    if (err) {
      console.error("database error");
      res.status(500).json({ error: "internal server error" });
      return;
    }
    res.json(data);
  });
});

//SIGNUP API
app.post("/signup", (req, res) => {
  const { username, password, mobile } = req.body;

  // Validate the input data
  if (!username || !password || !mobile) {
    return res.status(400).json({ message: "Incomplete data provided" });
  }
  const insertQuery =
    "INSERT INTO admin_details (admin_name, password, mob) VALUES (?, ?, ?)";
  db.query(insertQuery, [username, password, mobile], (err) => {
    if (err) {
      console.error("Error inserting admin data:", err);
      res.status(500).json({ message: "Internal server error" });
      return;
    }
    res.json({ message: "Admin registered successfully" });
  });
});


//LOGIN API
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const query = `SELECT * FROM admin_details WHERE admin_name = ? AND password = ?`;

  db.query(query, [username, password], (err, results) => {
    if (err) {
      console.error("Database query error: " + err.message);
      res.status(500).json({ message: "Database error: " + err.message });
      return;
    }
    if (results.length === 1) {
      const user = results[0];
      console.log("User details", user);
      res.setHeader("Content-Type", "application/json");
      const uid = (user.id);
      req.session.uid=uid
      res.json({ message: "Login successful", userDetails: user,uid });
    } else {
      res.status(401).json({ message: "Invalid username/password" });
    }
  });
});

//uid session id
app.get("/getUserId", (req, res) => {
  const userId = req.session.uid;
  res.json({ uid: userId });
});



//SEARCHPAN API
app.get("/searchpan", (req, res) => {
  const pan_no = req.query.pan_no;
  const sql = "SELECT * FROM customer_master WHERE pan_no = ?";
  db.query(sql, [pan_no], (err, data) => {
    if (err) {
      console.error("Database error");
      res.status(500).json({ error: "Internal server error" });
      return;
    }

    res.json(data);
  });
});

//CREATE API
app.post("/create", (req, res) => {
  const {
    first_name,
    last_name,
    pan_no,
    mob_no,
    alternate_mobile_no,
    userType,
    description,
  } = req.body;

  if (
    !first_name ||
    !last_name ||
    !pan_no ||
    !mob_no ||
    !alternate_mobile_no ||
    !userType ||
    !description
  ) {
    return res.status(400).json({ message: "Incomplete data provided" });
  }

  // Get the current date and time as a formatted string
  // const currentDatetime = new Date().toISOString();

  // You should also specify appropriate values for created_by and edited_by here
  // const created_by = 1; // Change this to the actual user ID
  // const edited_by = 1; // Change this to the actual user ID

  const insertQuery =
    "INSERT INTO customer_master (first_name, last_name, mob_no, pan_no, alternate_mobile_no, userType, description) VALUES (?, ?, ?, ?, ?, ?, ?)";
  // "INSERT INTO customer_master (first_name, last_name, mob_no, pan_no, alternate_mobile_no, userType, description, created_on, created_by, edited_on, edited_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

  db.query(
    insertQuery,
    [
      first_name,
      last_name,
      mob_no,
      pan_no,
      alternate_mobile_no,
      userType,
      description,
      // currentDatetime, // created_on
      // created_by, // created_by
      // currentDatetime, // edited_on
      // edited_by, // edited_by
    ],
    (err, result) => {
      if (err) {
        console.error("Error inserting customer data:", err);
        res.status(500).json({ message: "Internal server error" });
        return;
      }
      res.json({ message: "Customer registered successfully" });
    }
  );
  db.commit()
});

//CREATEPAYMENT API
app.post("/createpayment", (req, res) => {
  const {
    paymentRefId,
    paymentReceived,
    modeOfPayment,
    DateOfPayment,
    misslanius_amt,
  } = req.body;

  console.log(req.body);

  // Get the last created customer's ID
  const getLastCustomerIdQuery =
    "SELECT id FROM customer_master ORDER BY id DESC LIMIT 1";
  db.query(getLastCustomerIdQuery, (err, customerResult) => {
    if (err) {
      console.log(err);
      console.error("Error fetching the last customer's ID");
      res.status(500).json({ error: "Internal server error" });
      return;
    }

    const customer_id = customerResult[0].id;
    console.log("Retrieved customer_id:", customer_id);

    const insertPaymentQuery = `
      INSERT INTO payment_master (customer_id, paymentRefId, paymentReceived, modeOfPayment, DateOfPayment,misslanius_amt)
      VALUES (?, ?, ?, ?, ?,?)
    `;

    db.query(
      insertPaymentQuery,
      [
        customer_id,
        customer_id,
        paymentReceived,
        modeOfPayment,
        DateOfPayment,
        misslanius_amt,
      ],
      (err, result) => {
        if (err) {
          console.error("Error creating payment record");
          res.status(500).json({ error: "Internal server error" });
          return;
        }

        res.json({ message: "Payment record created successfully" });
      }
    );
  });
  db.commit()
});

//CREATE PROPERTY API
app.post("/createproperty", (req, res) => {
  const { property, propertyType, GRN, PRN } = req.body;

  // Get the last created customer's ID
  const getLastCustomerIdQuery =
    "SELECT id FROM customer_master ORDER BY id DESC LIMIT 1";
  db.query(getLastCustomerIdQuery, (err, customerResult) => {
    if (err) {
      console.error("Error fetching the last customer's ID");
      res.status(500).json({ error: "Internal server error" });
      return;
    }

    const customer_id = customerResult[0].id;

    const insertPropertyQuery = `
      INSERT INTO property_master (customer_id, property, propertyType, GRN, PRN)
      VALUES (?, ?, ?, ?, ?)
    `;

    db.query(
      insertPropertyQuery,
      [customer_id, property, propertyType, GRN, PRN],
      (err, result) => {
        if (err) {
          console.error("Error creating property record");
          res.status(500).json({ error: "Internal server error" });
          return;
        }

        res.json({ message: "Property record created successfully" });
      }
    );
  });
  db.commit()
});

//-------------------------------------------------------------------------------------------------

//UPDATE API
app.put("/update", (req, res) => {
  const {
    first_name,
    last_name,
    pan_no,
    mob_no,
    alternate_mobile_no,
    userType,
    description,
  } = req.body;

  if (
    !first_name ||
    !last_name ||
    !pan_no ||
    !mob_no ||
    !alternate_mobile_no ||
    !userType ||
    !description
  ) {
    return res.status(400).json({ message: "Incomplete data provided" });
  }

  // Define your update query
  const updateQuery = `
    UPDATE customer_master
    SET first_name = ?,last_name = ?,mob_no = ?,alternate_mobile_no = ?,userType = ?,description = ?
    WHERE pan_no = ?`;

  // Execute the update query
  db.query(
    updateQuery,
    [
      first_name,
      last_name,
      mob_no,
      alternate_mobile_no,
      userType,
      description,
      pan_no,
    ],
    (err, result) => {
      if (err) {
        console.error("Error updating customer data:", err);
        res.status(500).json({ message: "Internal server error" });
        return;
      }
      if (result.affectedRows === 0) {
        res.status(404).json({ message: "Customer not found" });
      } else {
        res.json({ message: "Customer updated successfully" });
      }
    }
  );
  db.commit()
});

app.put("/updateproperty", (req, res) => {
  const { property, propertyType, GRN, PRN, id } = req.body;
  console.log(req.body);
  if (!property || !propertyType || !GRN || !PRN) {
    return res.status(400).json({ message: "Incomplete data provided" });
  }

  const updatePropertyQuery = `
  UPDATE property_master
  SET property = ?,propertyType = ?,GRN = ?,PRN = ?
  WHERE id = ?`;

  db.query(
    updatePropertyQuery,
    [property, propertyType, GRN, PRN, id],
    (err, result) => {
      if (err) {
        console.error("Error updating property record");
        res.status(500).json({ error: "Internal server error" });
        return;
      }

      res.json({ message: "Property record updated successfully" });
    }
  );
  db.commit()
});

app.put("/updatepayment", (req, res) => {
  const { paymentReceived, modeOfPayment, DateOfPayment, misslanius_amt, id } = req.body;
  console.log(req.body);
  if (!paymentReceived || !modeOfPayment || !DateOfPayment || !misslanius_amt) {
    return res.status(400).json({ message: "Incomplete data provided" });
  }

  const updatePaymentQuery = `
  UPDATE payment_master
  SET paymentReceived = ?,modeOfPayment = ?,DateOfPayment = ?,misslanius_amt = ?
  WHERE id = ?`;

  db.query(
    updatePaymentQuery,
    [paymentReceived, modeOfPayment, DateOfPayment, misslanius_amt, id],
    (err, result) => {
      if (err) {
        console.error("Error updating payment record");
        res.status(500).json({ error: "Internal server error" });
        return;
      }

      res.json({ message: "Payment record updated successfully" });
    }
  );db.commit()
});

app.put('/inactive',(req,res)=>{
  const {status,id} =req.body
  console.log(req.body);
  const inactiveQuery=` UPDATE customer_master
  SET status = ?
  WHERE id = ?`;
  db.query(
    inactiveQuery,[status,id],
    (err)=>{
      if(err){
        console.log("Error deleting record");
        res.status(500).json({error:'internal server error'})
        return
      }
      res.json({message:' record deleted successfully'})
    }
  )
})



// Define a route to fetch user details by ID
app.get("/user/:id", (req, res) => {
  const userId = req.params.id;
  // const query = "SELECT * FROM customer_master WHERE id = ?";
  const query = "SELECT cm.*,pm.*,pr.* FROM advocate.customer_master cm LEFT JOIN advocate.payment_master pm ON cm.id = pm.customer_id LEFT JOIN advocate.property_master pr ON cm.id = pr.customer_id WHERE cm.id = ?;"

  
  


  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      res.status(500).json({ error: "Internal server error" });
      return;
    }

    if (results.length === 0) {
      res.status(404).json({ message: "User not found" });
    } else {
      res.json(results[0]);
    }
  });
});

//GET PAYMENT_MASTER
app.get("/payment_master", (req, res) => {
  const sql = "SELECT * FROM payment_master";
  db.query(sql, (err, data) => {
    if (err) {
      console.error("database error");
      res.status(500).json({ error: "internal server error" });
      return;
    }
    res.json(data);
  });
});

app.get("/user/:id/payment", (req, res) => {
  const userId = req.params.id;
  const query = "SELECT * FROM payment_master WHERE customer_id = ?";

  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      res.status(500).json({ error: "Internal server error" });
      return;
    }

    if (results.length === 0) {
      res
        .status(404)
        .json({ message: "No payment details found for this user" });
    } else {
      res.json(results[0]);
    }
  });
});
app.get("/user/:id/property", (req, res) => {
  const userId = req.params.id;
  const query = "SELECT * FROM property_master WHERE customer_id = ?";

  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      res.status(500).json({ error: "Internal server error" });
      return;
    }

    if (results.length === 0) {
      res
        .status(404)
        .json({ message: "No payment details found for this user" });
    } else {
      res.json(results[0]);
    }
  });
});



app.listen(8081, () => {
  
  console.log(`server started:${8081}`);
});
