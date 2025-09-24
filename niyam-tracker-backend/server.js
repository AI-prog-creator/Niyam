const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const { v4: uuidv4 } = require("uuid"); // For generating unique public_id
const multer = require("multer");
const fs = require("fs");
const app = express();
const tablePrefix = "submissions_";

dotenv.config();

const port = 1008;

app.use(cors());
app.use(express.json());

// MySQL Connection Pool
const pool = mysql.createPool({
  host: process.env.ENV_HOST,
  user: process.env.ENV_USER,
  password: process.env.ENV_PASSWORD,
  database: process.env.ENV_DATABASE,
  charset: "utf8mb4",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function checkIfViewExists(viewName) {
  try {
    const [rows] = await pool.query(`
      SELECT TABLE_NAME 
      FROM information_schema.VIEWS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = ?
    `, [viewName]);
    
    return rows.length > 0;
  } catch (err) {
    console.error('Error checking view existence:', err.message);
    return false;
  }
}

async function createDynamicView() {

  try {
    // Get all table names like 'submission_%'
    const [tables] = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND table_name LIKE 'submission_%'
    `);

    if (tables.length === 0) {
      await pool.query(`DROP VIEW IF EXISTS all_submissions`);
      console.log('No submission tables found.');
      return;
    }

    // 2. Build UNION ALL SQL query
    const unionParts = tables.map(row => {
      const name = row.TABLE_NAME || row.table_name;
      return `SELECT *, '${name}' AS source_table FROM \`${name}\``;
    });

    const viewSQL = `
      CREATE OR REPLACE VIEW all_submissions AS
      ${unionParts.join('\nUNION ALL\n')};
    `;

    // 3. Create or replace the view
    await pool.query(viewSQL);

    console.log('View `all_submissions` created successfully.');
  } catch (err) {
    console.error('Error creating view:', err.message);
  } 
}

async function deleteSubmissionTable(tableName) {
  try {
    const dropSQL = `DROP TABLE IF EXISTS \`${tableName}\``;
    await pool.query(dropSQL);
    console.log(`Table \`${tableName}\` has been deleted (if it existed).`);
  } catch (err) {
    console.error(`Failed to delete submission table for form ID ${formId}:`, err.message);
  }
}

async function createSubmissionTable(tableid) {

  try {
    const createSQL = `
      CREATE TABLE IF NOT EXISTS \`${tableid}\` (
        \`id\` int(11) NOT NULL AUTO_INCREMENT,
        \`form_name\` varchar(255) CHARACTER SET utf8 COLLATE utf8_bin DEFAULT NULL,
        \`name\` varchar(45) CHARACTER SET utf8 COLLATE utf8_bin DEFAULT NULL,
        \`mobile\` varchar(45) CHARACTER SET utf8 COLLATE utf8_bin DEFAULT NULL,
        \`village\` varchar(45) CHARACTER SET utf8 COLLATE utf8_bin DEFAULT NULL,
        \`city\` varchar(45) CHARACTER SET utf8 COLLATE utf8_bin DEFAULT NULL,
        \`niyams\` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(\`niyams\`)),
        \`description\` varchar(255) CHARACTER SET utf8 COLLATE utf8_bin DEFAULT NULL,
        \`niyam_give_by_name\` varchar(255) CHARACTER SET utf8 COLLATE utf8_bin DEFAULT NULL,
        \`niyam_give_by_number\` varchar(255) CHARACTER SET utf8 COLLATE utf8_bin DEFAULT NULL,
        \`submission_date\` datetime DEFAULT current_timestamp(),
        \`user_type\` varchar(45) DEFAULT NULL,
        \`status\` varchar(45) DEFAULT NULL,
        PRIMARY KEY (\`id\`)
      );
    `;

    await pool.query(createSQL);
    console.log(`Table \`${tableid}\` created (or already exists).`);
    await createDynamicView();
  } catch (err) {
    console.error(`Failed to create table "${tableid}":`, err.message);
  }
}
// const pool = mysql.createPool({
//   host: 'localhost',
//   user: 'root',
//   password: '@Kashyap@7422@', // Replace with your actual password
//   database: 'niyam_tracker',
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0
// });

// Test DB connection on startup
pool
  .getConnection()
  .then((connection) => {
    console.log("Successfully connected to MySQL database!");
    connection.release();
  })
  .catch((err) => {
    console.error("Error connecting to database:", err.stack);
    process.exit(1);
  });

// Serve static files (assuming admin-dashboard.html and public-form.html are in the root)
app.use(express.static(path.join(__dirname)));

// --- User Authentication Endpoints ---

// User Login
app.post("/api/login", async (req, res) => {
  const { mobile,pin } = req.body;
  try {
    const [rows] = await pool.query("SELECT * FROM users WHERE mobile = ?", [
      mobile,
    ]);
    if (rows.length > 0) {
      const user = rows[0];
      if(user.pin == pin)
      {
        res.json({
          id: user.id,
          full_name: user.full_name,
          mobile: user.mobile,
          village: user.village,
          city: user.city,
          role: user.role, // Assuming a 'role' column exists in your users table
        });
      }else{
        res.status(401).json({
        message: "Password is invalid",
      });
      }
    } else {
      res.status(404).json({
        message: "User not found. Please register.",
      });
    }
  } catch (err) {
    console.error("Error during login:", err);
    res.status(500).json({
      message: "Server error during login.",
    });
  }
});

// User Registration
app.post("/api/users", async (req, res) => {
  const { mobile, full_name, village, city, state, country, pin } = req.body;
  try {
    // Check if user already exists
    const [existingUsers] = await pool.query(
      "SELECT id FROM users WHERE mobile = ?",
      [mobile]
    );
    if (existingUsers.length > 0) {
      return res.status(409).json({
        message: "User with this mobile number already exists.",
      });
    }

    const [result] = await pool.query(
      "INSERT INTO users (mobile, pin, full_name, village, city, state, country, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [mobile, pin, full_name, village, city, state, country, "user", new Date()] // Default role 'user', created_at
    );
    const newUser = {
      id: result.insertId,
      mobile,
      full_name,
      village,
      city,
      state,
      country,
      role: "user",
    };
    res.status(201).json(newUser);
  } catch (err) {
    console.error("Error during registration:", err);
    res.status(500).json({
      message: "Server error during registration.",
    });
  }
});

// Search users for autocomplete
app.get("/api/users/search", async (req, res) => {
  const { query } = req.query;
  if (!query || query.length < 2) {
    return res.json([]);
  }
  try {
    const [rows] = await pool.query(
      "SELECT id, full_name, mobile, village, city FROM users WHERE full_name LIKE ? OR mobile LIKE ? LIMIT 10",
      [`%${query}%`, `%${query}%`]
    );
    res.json(rows);
  } catch (err) {
    console.error("Error during user search:", err);
    res.status(500).json({
      message: "Error searching users.",
    });
  }
});

// --- Niyam Forms Endpoints ---

// GET all forms
app.get("/api/niyam-forms", async (req, res) => {
  try {
    let rows = [];
    if(await checkIfViewExists("all_submissions") == true)
    {
      [rows] = await pool.query(`
              SELECT nf.*, COUNT(s.id) as participant_count
              FROM niyam_forms nf
              LEFT JOIN all_submissions s ON nf.niyam_name = s.form_name
              GROUP BY nf.id
              ORDER BY nf.created_date DESC
          `);
    }else{
      [rows] = await pool.query(`
              SELECT nf.*, 0 as participant_count
              FROM niyam_forms nf
              GROUP BY nf.id
              ORDER BY nf.created_date DESC
          `);
    }
    const forms = rows.map((row) => ({
      ...row,
      options:
        typeof row.options === "string" ? JSON.parse(row.options) : row.options,
      taker_details_required:
        typeof row.taker_details_required === "string"
          ? JSON.parse(row.taker_details_required)
          : row.taker_details_required,
    }));
    res.json(forms);
  } catch (err) {
    console.error("Error fetching Niyam forms:", err);
    res.status(500).json({
      message: "Error fetching Niyam forms.",
    });
  }
});

// GET a single form by ID
app.get("/api/niyam-forms/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query("SELECT * FROM niyam_forms WHERE id = ?", [
      id,
    ]);
    if (rows.length > 0) {
      const form = {
        ...rows[0],
        options:
          typeof rows[0].options === "string"
            ? JSON.parse(rows[0].options)
            : rows[0].options,
        taker_details_required:
          typeof rows[0].taker_details_required === "string"
            ? JSON.parse(rows[0].taker_details_required)
            : rows[0].taker_details_required,
      };
      res.json(form);
    } else {
      res.status(404).json({
        message: "Niyam form not found.",
      });
    }
  } catch (err) {
    console.error("Error fetching Niyam form by ID:", err);
    res.status(500).json({
      message: "Error fetching Niyam form.",
    });
  }
});

// GET a public form by public_id

app.get("/api/niyam-forms/public/:publicId", async (req, res) => {
  const { publicId } = req.params;
  try {
    // ADDED: CURDATE() check to ensure the form is not expired
    const [rows] = await pool.query(
      'SELECT * FROM niyam_forms WHERE public_id = ? AND status = "Published" AND end_date >= CURDATE()',
      [publicId]
    );
    if (rows.length > 0) {
      const form = {
        ...rows[0],
        options:
          typeof rows[0].options === "string"
            ? JSON.parse(rows[0].options)
            : rows[0].options,
        taker_details_required:
          typeof rows[0].taker_details_required === "string"
            ? JSON.parse(rows[0].taker_details_required)
            : rows[0].taker_details_required,
      };
      res.json(form);
    } else {
      res.status(404).json({
        message:
          "Public Niyam form not found, is not published, or has expired.",
      });
    }
  } catch (err) {
    console.error("Error fetching public Niyam form:", err);
    res.status(500).json({
      message: "Error fetching public Niyam form.",
    });
  }
});

// ...after app.use(express.json());

// --- Multer Configuration for File Uploads ---
const uploadDir = path.join(__dirname, "uploads/niyam-images");
// Create the directory if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir); // Set the destination folder
  },
  filename: function (req, file, cb) {
    // Create a unique filename to avoid overwrites
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit per file
  fileFilter: (req, file, cb) => {
    // Allow only jpeg and png files
    if (file.mimetype === "image/jpeg" || file.mimetype === "image/png") {
      cb(null, true);
    } else {
      cb(new Error("Only .jpeg and .png files are allowed!"), false);
    }
  },
});

// Serve uploaded images statically so they can be viewed in the browser
app.use("/uploads/niyam-images", express.static(uploadDir));
// CREATE a new form
// REPLACE your old app.post("/api/niyam-forms", ...) with this:
// CREATE a new form with image upload support
app.post("/api/niyam-forms", upload.array("images", 3), async (req, res) => {
  // Text fields are now in req.body, and file info is in req.files
  const {
    niyamName,
    startDate,
    endDate,
    description,
    status,
    takerDetailsRequired,
    options,
  } = req.body;

  // Create an array of server paths for the uploaded images
  const imagePaths = req.files
    ? req.files.map((file) => `/uploads/niyam-images/${file.filename}`)
    : [];

  const publicId = uuidv4();
  const createdDate = new Date().toISOString().slice(0, 10);

  try {
    const [result] = await pool.query(
      "INSERT INTO niyam_forms (niyam_name, start_date, end_date, description, status, public_id, created_date, taker_details_required, options, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        niyamName,
        startDate,
        endDate,
        description,
        status,
        publicId,
        createdDate,
        takerDetailsRequired, // This should be a JSON string from FormData
        options, // This should be a JSON string from FormData
imagePaths.length > 0 ? imagePaths[0] : null
, // Store the file paths as a JSON string array
      ]
    );
    res.status(201).json({
      id: result.insertId,
      message: "Niyam form created successfully!",
      publicId: publicId,
    });
    createSubmissionTable(tablePrefix+""+result.insertId);
  } catch (err) {
    console.error("Error creating Niyam form:", err);
    res.status(500).json({
      message: "Error creating Niyam form.",
    });
  }
});
// UPDATE an existing form
// UPDATE an existing form
app.put("/api/niyam-forms/:id", upload.array("images", 3), async (req, res) => {
  const { id } = req.params;
  const {
    niyamName,
    startDate,
    endDate,
    description,
    status,
    takerDetailsRequired, // This comes as a JSON string from FormData
    options, // This also comes as a JSON string
  } = req.body;

  // Create an array of server paths for any newly uploaded images
  const imagePaths = req.files
    ? req.files.map((file) => `/uploads/niyam-images/${file.filename}`)
    : [];

  try {
    // Note: This simple update replaces old images.
    // For a more robust solution, you'd fetch the old image paths and delete them from the server.

    // --- FIXES APPLIED ---
    // 1. Removed the extra comma before the WHERE clause.
    // 2. The `takerDetailsRequired` and `options` are already strings from FormData, so no need to JSON.stringify() them again.
    // 3. Changed `image = ?` to `image = ?` to correctly update the image column.
    const [result] = await pool.query(
      "UPDATE niyam_forms SET niyam_name = ?, start_date = ?, end_date = ?, description = ?, status = ?, taker_details_required = ?, options = ?, image = ? WHERE id = ?",
      [
        niyamName,
        startDate,
        endDate,
        description,
        status,
        takerDetailsRequired,
        options,
imagePaths.length > 0 ? imagePaths[0] : null
, // Store the file paths as a JSON string array
        id,
      ]
    );
    if (result.affectedRows > 0) {
      res.json({
        message: "Niyam form updated successfully!",
      });
    } else {
      res.status(404).json({
        message: "Niyam form not found.",
      });
    }
  } catch (err) {
    console.error("Error updating Niyam form:", err);
    res.status(500).json({
      message: "Error updating Niyam form.",
    });
  }
});

// UPDATE form status
app.put("/api/niyam-forms/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const [result] = await pool.query(
      "UPDATE niyam_forms SET status = ? WHERE id = ?",
      [status, id]
    );
    if (result.affectedRows > 0) {
      res.json({
        message: `Niyam form status updated to ${status} successfully!`,
      });
    } else {
      res.status(404).json({
        message: "Niyam form not found.",
      });
    }
  } catch (err) {
    console.error("Error updating Niyam form status:", err);
    res.status(500).json({
      message: "Error updating Niyam form status.",
    });
  }
});

// DELETE a form
app.delete("/api/niyam-forms/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query("DELETE FROM niyam_forms WHERE id = ?", [
      id,
    ]);
    if (result.affectedRows > 0) {
      res.json({
        message: "Niyam form deleted successfully!",
      });
    } else {
      res.status(404).json({
        message: "Niyam form not found.",
      });
    }
  } catch (err) {
    console.error("Error deleting Niyam form:", err);
    res.status(500).json({
      message: "Error deleting Niyam form.",
    });
  }
});

// --- Submissions Endpoints ---

// GET all submissions
app.get("/api/submissions", async (req, res) => {
  const { mobile, submittedByMobile } = req.query; // Get mobile and submittedByMobile from query parameters
  if(await checkIfViewExists("all_submissions") == false)
  {
    res.json([]);
  }else
  {
    let query = "SELECT * FROM all_submissions WHERE 1=1";
    const params = [];

    if (mobile) {
      query += " AND mobile = ?";
      params.push(mobile);
    }
    if (submittedByMobile) {
      query += " AND niyam_give_by_number = ?"; // Use the new column
      params.push(submittedByMobile);
    }

    try {
      const [rows] = await pool.query(query, params);
      const submissions = rows.map((row) => ({
        ...row,
        niyams:
          typeof row.niyams === "string" ? JSON.parse(row.niyams) : row.niyams,
        options:
          typeof row.options === "string" ? JSON.parse(row.options) : row.options,
      }));
      res.json(submissions);
    } catch (err) {
      console.error("Error fetching submissions:", err);
      res.status(500).json({
        message: "Error fetching submissions.",
      });
    }
  }
});

// CREATE a new submission
app.post("/api/submissions", async (req, res) => {
  const {
    form_id,
    form_name,
    name,
    mobile,
    village,
    city,
    niyams,
    submission_date,
    user_type,
    niyam_give_by_name, // New
    niyam_give_by_number, // New
    description,
    status,
  } = req.body;

  try {
    const [result] = await pool.query(
      "INSERT INTO submissions_"+ form_id +" (form_name, name, mobile, village, city, niyams, submission_date, user_type, niyam_give_by_name, niyam_give_by_number, description, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        form_name,
        name,
        mobile,
        village,
        city,
        JSON.stringify(niyams),
        submission_date,
        user_type,
        niyam_give_by_name,
        niyam_give_by_number,
        description,
        status,
      ]
    );
    res.status(201).json({
      id: result.insertId,
      message: "Submission created successfully!",
    });
  } catch (err) {
    console.error("Error creating submission:", err);
    res.status(500).json({
      message: "Error creating submission.",
    });
  }
});

// --- Reports Endpoints ---
app.get("/api/reports", async (req, res) => {
  const { formName, field, startDate, endDate } = req.query;

  if (!formName) {
    return res.status(400).json({
      message: "Form name is required for report generation.",
    });
  }

  try {
    let query = `
            SELECT s.*
            FROM all_submissions s
            WHERE s.form_name = ?
        `;
    const params = [formName];

    if (startDate) {
      query += " AND s.submission_date >= ?";
      params.push(startDate);
    }
    if (endDate) {
      query += " AND s.submission_date <= ?";
      params.push(endDate);
    }

    const [rows] = await pool.query(query, params);
    const submissions = rows.map((row) => ({
      ...row,
      niyams:
        typeof row.niyams === "string" ? JSON.parse(row.niyams) : row.niyams,
      options:
        typeof row.options === "string" ? JSON.parse(row.options) : row.options,
    }));

    // Process data for PDF/CSV
    const reportData = submissions.map((sub) => {
      const niyamValues = field
        ? sub.niyams[field] || "N/A"
        : Object.values(sub.niyams).join(", ");
      return {
        form_name: sub.form_name,
        name: sub.name,
        mobile: sub.mobile,
        village: sub.village,
        city: sub.city || "",
        niyams: niyamValues,
        submission_date: sub.submission_date,
        status: sub.status,
        niyam_give_by_name: sub.niyam_give_by_name, // Include new columns
        niyam_give_by_number: sub.niyam_give_by_number, // Include new columns
      };
    });

    res.json(reportData);
  } catch (err) {
    console.error("Error generating report:", err);
    res.status(500).json({
      message: "Error generating report.",
    });
  }
});

// const multer = require('multer');
// const upload = multer({
//   dest: path.join(__dirname, 'uploads/niyam-images/'),
//   limits: { fileSize: 5 * 1024 * 1024 }
// });
// app.use('/uploads/niyam-images', express.static(path.join(__dirname, 'uploads/niyam-images')));

// // CREATE a new form with images
// app.post('/api/niyam-forms', upload.array('images', 3), async (req, res) => {
//   try {
//     const {
//       niyamName,
//       startDate,
//       endDate,
//       description,
//       status,
//       takerDetailsRequired,
//       options
//     } = req.body;
//     const publicId = uuidv4();
//     const createdDate = new Date().toISOString().slice(0, 10);

//     // Handle images
//     const imagePaths = req.files && req.files.length > 0
//       ? req.files.map(f => `/uploads/niyam-images/${f.filename}`)
//       : [];

//     const [result] = await pool.query(
//       'INSERT INTO niyam_forms (niyam_name, start_date, end_date, description, status, public_id, created_date, taker_details_required, options, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
//       [
//         niyamName,
//         startDate,
//         endDate,
//         description,
//         status,
//         publicId,
//         createdDate,
//         JSON.stringify(takerDetailsRequired),
//         JSON.stringify(options),
// imagePaths.length > 0 ? imagePaths[0] : null

//       ]
//     );
//     res.status(201).json({
//       id: result.insertId,
//       message: 'Niyam form created successfully!',
//       publicId: publicId,
//       images: imagePaths
//     });
//   } catch (err) {
//     console.error('Error creating Niyam form:', err);
//     res.status(500).json({ message: 'Error creating Niyam form.' });
//   }
// });

app.listen(process.env.ENV_PORT, () => {
  console.log({
    status: "success",
    PORT: process.env.ENV_PORT,
    DATABASE: process.env.ENV_DATABASE,
    HOST: process.env.ENV_HOST,
  });
});
