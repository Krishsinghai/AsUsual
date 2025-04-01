const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const randomstring = require('randomstring')
const nodemailer = require('nodemailer');
const session = require('express-session');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGO_URI,{
    serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds instead of 10
    socketTimeoutMS: 45000, 
})
    .then(() => console.log('Connected to MongoDB Atlas'))
    .catch(err => console.error('MongoDB connection error:', err));


// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));
app.use(cookieParser());
app.use(session({
    secret: process.env.SESSION_SECRET || 'Preaveen@8233',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, maxAge: 3600000 } // 1 hour
}));

const otpCache = {};

function generateOTP(){
    return randomstring.generate({ length: 4, charset: 'numeric'})
}

function sendOTP(email,otp){
    const mailOPTION = {
        from: 'asusualclothing@gmail.com',
        to: email,
        subject: 'OTP verification',
        text: `your otp is :${otp}`
    };

    let transporter= nodemailer.createTransport({
        service: 'Gmail',
        auth:{
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD

        },
        tls: {
            rejectUnauthorized: true
        }
    }); 

    transporter.sendMail(mailOPTION, (error, info) => {
        if(error){
            console.log('error ',error);
        } else {
            console.log('OTP Email sent successfully:', info.response)
        }
    });
}



// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Import database models
const Product = require('./models/Product');
const User = require('./models/UserSchema');
const Cart = require('./models/CartSchema');
const Admin = require('./models/AdminSchema');
const CustomTshirt = require('./models/CustomTshirtSchema');
const Poster = require('./models/posterSchema');

// Configure Multer for handling file uploads in memory


// Configure multer to use memory storage
const storage = multer.memoryStorage(); // Store files in memory as Buffer objects
const upload = multer({ storage: storage });
// Serve the signup page




//################################### admin login##########################################################
app.get('/admin-login', (req, res) => {
    res.render("admin_login");
})

app.get('/edit-poster', (req,res)=>{
    res.render("edit_poster")
})

app.get('/admin-option', (req, res) => {
    res.render("admin_option");
})



app.post('/admin/signup', async (req, res) => {
    try {
        const { name, email, password, confirmPassword } = req.body;

        if (password !== confirmPassword) {
            return res.status(400).send("Password and Confirm Password do not match");
        }

        // Hash the password before saving it to the database
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create a new user in the database
        const admin = await Admin.create({ name, email, password: hashedPassword });

        console.log(admin);
        res.redirect('admin_login');

    } catch (error) {
        console.error('Error signing up user:', error);
        res.status(500).send('Error signing up user: ' + error.message);
    }
});




app.post('/admin/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const admin = await Admin.findOne({ email });

        if (!admin) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const isPasswordValid = await bcrypt.compare(password, admin.password);

        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Set session and cookie
        req.session.adminId = admin._id;
        res.cookie('adminId', admin._id, { httpOnly: true, secure: false, maxAge: 24 * 60 * 60 * 1000 });
        res.redirect("/admin-option");
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


app.post('/admin/edit-poster', upload.fields([
    { name: 'poster1', maxCount: 1 },
    { name: 'poster2', maxCount: 1 },
    { name: 'poster3', maxCount: 1 }
]), async (req, res) => {
    try {
        const files = req.files;

        // Check if files were uploaded
        if (!files || Object.keys(files).length === 0) {
            return res.status(400).json({ message: 'No files uploaded' });
        }

        // Convert images to base64
        const base64Images = [];
        const headings = [];
        const titles = [];

        for (let i = 1; i <= 3; i++) {
            if (files[`poster${i}`]) {
                const file = files[`poster${i}`][0];
                const base64Image = file.buffer.toString('base64'); // Convert Buffer to base64
                base64Images.push(base64Image);
                headings.push(req.body[`Heading${i}`]);
                titles.push(req.body[`Title${i}`]);
            }
        }

        // Update the single document (or create it if it doesn't exist)
        const filter = {}; // Empty filter to match the first (and only) document
        const update = {
            image: base64Images,
            Heading: headings,
            Title: titles
        }; // Data to update
        const options = { upsert: true, new: true, setDefaultsOnInsert: true }; // Options

        const poster = await Poster.findOneAndUpdate(filter, update, options);

        res.status(201).json({ message: 'Images uploaded successfully', poster });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});



// Logout route
app.post('/admin/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ message: 'Failed to log out' });
        }
        res.clearCookie('adminId');
        res.redirect('/')
    });
});





app.get('/admindashboard', async (req, res) => {
    try {
        const products = await Product.find().sort({ createdAt: 'desc' });
        res.render('admindashboard', { products });
    } catch (error) {
        res.status(500).send('Error fetching products');
    }
})



//##################################### edit product ##################################################
// Update product by ID (edit_product route)
app.post('/edit_product/:id', async (req, res) => {
    const { id } = req.params;
    await Product.findByIdAndUpdate(id, req.body, { new: true });
    res.redirect('/products');
});



app.post('/delete_product/:id', async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.redirect('/edit-product');
    } catch (err) {
        res.status(500).send("Error deleting product");
    }
});




app.get('/edit-product', async (req, res) => {
    const products = await Product.find({}, 'name price front_image category brand sizes description');
    const updatedProducts = products.map(product => ({
        ...product._doc,
        imageBase64: product.front_image.length > 0 ? `data:image/jpeg;base64,${product.front_image[0].toString('base64')}` : null
    }));
    res.render('edit_product', { products: updatedProducts });
});



//##################################### Handle homepage ####################################################
app.get('/', async (req, res) => {
    try {
        // Fetch products sorted by creation date
        const Products = await Product.find().sort({ createdAt: 'desc' });

        // Get user ID from session or cookie
        const userId = req.session.userId || req.cookies.userId;
        let user = null;

        if (userId) {
            user = await User.findById(userId, 'name email phone createdAt');
        }

        // Fetch the single document containing the poster images, headings, and titles
        const poster = await Poster.findOne({});
        const posters = poster ? poster.image : []; // Use an empty array if no posters are found
        const headings = poster ? poster.Heading : []; // Use an empty array if no headings are found
        const titles = poster ? poster.Title : []; // Use an empty array if no titles are found

        // Render the index.ejs template with Products, user, posters, headings, and titles
        res.render('index', { Products, user, posters, headings, titles });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});
app.get('')

app.get('/add-product', (req, res) => {
    res.render('add_product');
});
app.get("/cart", async (req, res) => {
    try {
        // Get user ID from session or cookie
        const userId = req.session.userId || req.cookies.userId;
        let user = { name: "Guest" };

        if (userId) {
            user = await User.findById(userId, "name");
        }

        // Fetch the user's cart
        const cart = await Cart.findOne({ user: userId }).populate("items.product");

        if (!cart) {
            return res.render("cart", { cart: null, user }); // Handle empty cart
        }

        res.render("cart", { cart, user });
    } catch (error) {
        console.error("Error fetching cart:", error);
        res.status(500).send("Internal Server Error");
    }
});



// Add to Cart Route
app.post('/add-to-cart', async (req, res) => {
    const { productId, quantity, size } = req.body;

    // Get user ID from session or cookie
    const userId = req.session.userId || req.cookies.userId;

    if (!userId) {
        return res.status(401).json({ message: 'Please log in to add items to your cart' });
    }

    try {
        // Find the user's cart
        let cart = await Cart.findOne({ user: userId });

        if (cart) {
            // Check if the item already exists in the cart
            const existingItem = cart.items.find(
                item => item.product.toString() === productId && item.size === size
            );

            if (existingItem) {
                // Update quantity if the item already exists
                existingItem.quantity += parseInt(quantity, 10);
            } else {
                // Add new item to the cart
                cart.items.push({ product: productId, quantity: parseInt(quantity, 10), size });
            }

            await cart.save();
        } else {
            // Create a new cart if it doesn't exist
            const newCart = new Cart({
                user: userId,
                items: [{ product: productId, quantity: parseInt(quantity, 10), size }]
            });

            await newCart.save();
            res.redirect('/cart')
        }
    } catch (error) {
        console.error('Error adding to cart:', error);
        res.status(500).json({ message: 'Internal server error', error });
    }
});



app.get('/product_details/:id', async (req, res) => {
    try {
        const productId = req.params.id; // Get the ID from the URL
        const product = await Product.findById(productId); // Fetch the product from the database

        if (!product) {
            return res.status(404).send('Product not found');
        }

        // Get user ID from session or cookie
        const userId = req.session.userId || req.cookies.userId;
        let user = { name: 'Guest' }; // Default user object for guests

        if (userId) {
            user = await User.findById(userId, 'name _id'); // Fetch user details if logged in
        }

        // Pass both product and user to the EJS template
        res.render('product_detail', { product, user });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

app.get('/Products', async (req, res) => {
    try {
        const products = await Product.find().sort({ createdAt: 'desc' }).lean();
        res.render('allProduct', { 
            products: products.map(p => ({
                ...p,
                id: p._id.toString() // Ensure id field exists
            }))
        });
    } catch(error) {
        console.error('Error fetching products:', error);
        res.status(500).send('Error fetching products');
    }
});

// Filter products route
app.post('/products/filter', async (req, res) => {
    const { price, sizes, colors, sortOrder, categories } = req.body;

    let query = {};

    // Price filter
    if (price) {
        query.price = { $lte: parseInt(price) };
    }

    // Size filter - check inventory for selected sizes
    if (sizes && sizes.length > 0) {
        query.$or = sizes.map(size => ({ [`sizes.${size}`]: { $gt: 0 } }));
    }

    // Case-insensitive color filter
    if (colors && colors.length > 0) {
        query.color = { 
            $in: colors.map(color => new RegExp(`^${color}$`, 'i'))
        };
    }

    // Case-insensitive category filter
    if (categories && categories.length > 0) {
        query.category = { 
            $in: categories.map(cat => new RegExp(`^${cat}$`, 'i'))
        };
    }

    try {
        // Fetch products with filtering
        let products = await Product.find(query);

        // Sort by price
        if (sortOrder === 'asc') {
            products.sort((a, b) => a.price - b.price);
        } else if (sortOrder === 'desc') {
            products.sort((a, b) => b.price - a.price);
        }

        res.json(products);
    } catch (error) {
        console.error('Error filtering products:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
// product_details
app.get('/product_details/:id', (req, res) => {
    const productId = req.params.id;
    const product = products.find(p => p.id == productId);

    if (!product) {
        return res.status(404).send("Product not found");
    }
    console.log(product)

    res.render('product_detail', { product });
});



// fetch cart product
app.get('/cart:id', async (req, res) => {
    try {
        const cart = await Cart.find().populate('items.product'); // Fetch cart with product details
        res.render('cart', { cart }); // Pass cart data to EJS
    } catch (error) {
        res.status(500).send('Error fetching cart data');
    }
});



// Handle product addition with image uploads
app.post('/add-product', upload.fields([
    { name: 'front_images', maxCount: 1 },  // Only one front image
    {name:'back_image' , maxCount: 1},
    { name: 'images', maxCount: 5 }  // Up to 5 other images
]), async (req, res) => {
    try {
        // Destructure the body fields
        const { name, description, price, brand, color, category } = req.body;
        const sizes = {
            xsmall: parseInt(req.body.sizes?.xsmall) || 0,
            small: parseInt(req.body.sizes?.small) || 0,
            medium: parseInt(req.body.sizes?.medium) || 0,
            large: parseInt(req.body.sizes?.large) || 0,
            xlarge: parseInt(req.body.sizes?.xlarge) || 0
        };

        const validateBase64 = (base64) => {
            try {
                // Check if the base64 string is valid
                Buffer.from(base64, 'base64');
                return true;
            } catch (error) {
                return false;
            }
        };
        
        const back_image = req.files.back_image && req.files.back_image[0]
            ? `data:image/jpeg;base64,${req.files.back_image[0].buffer.toString('base64')}`
            : null;
        
        if (!validateBase64(back_image)) {
            throw new Error("Invalid back image data.");
        }
        // Check if front_images exists and if not, throw an error
        const front_image = req.files.front_images && req.files.front_images[0]
            ? `data:image/jpeg;base64,${req.files.front_images[0].buffer.toString('base64')}` // Add prefix
            : null;

        if (!front_image) {
            throw new Error("Front image is required.");
        }

        // Handle the other images
        const images = req.files.images 
            ? req.files.images.map(file => `data:image/jpeg;base64,${file.buffer.toString('base64')}`) // Add prefix
            : [];

        // console.log('Received data:', { name, description, price, brand, color, category, sizes, front_image, images });

        // Create and save the new product
        const newProduct = new Product({
            name,
            description,
            price,
            brand: brand || "AsUsual",
            color,
            category,
            sizes,
            back_image,
            front_image,  // Save the front image as base64 with prefix
            images  // Save other images as base64 with prefix
        });

        await newProduct.save();
        console.log('Product saved to database:', newProduct);
        res.status(201).redirect('/products');
    } catch (error) {
        console.error('Error adding product:', error);
        res.status(500).send('Error adding product: ' + error.message);
    }
});




// Handle signup 
app.get('/signup', (req, res) => {
    res.render('signup');
});

// Handle user signup and account creation

// Route to generate and send OTP
app.post('/generate-otp', (req, res) => {
    const { email } = req.body;
    const otp = generateOTP();
    otpCache[email] = otp; // Store OTP in cache
    sendOTP(email, otp);
    res.json({ success: true, message: 'OTP sent successfully' });
});
// Route to verify OTP
app.post('/verify-otp', (req, res) => {
    const { email, otp } = req.body;
    if (otpCache[email] === otp) {
        res.json({ success: true, message: 'OTP verified successfully' });
    } else {
        res.status(400).json({ success: false, message: 'Invalid OTP' });
    }
});
// Signup Route
app.post('/user/signup', async (req, res) => {
    try {
        const { name, email, phone, password, confirmPassword, otp } = req.body;

        if (password !== confirmPassword) {
            return res.status(400).send("Password and Confirm Password do not match");
        }

        // Verify OTP
        if (otpCache[email] !== otp) {
            return res.status(400).send("Invalid OTP");
        }

        // Hash the password before saving it to the database
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create a new user in the database
        const user = await User.create({ name, email, phone, password: hashedPassword });

        console.log(user);
        res.redirect('/signup');

    } catch (error) {
        console.error('Error signing up user:', error);
        res.status(500).send('Error signing up user: ' + error.message);
    }
});

// Login Route
app.post('/user/login', async (req, res) => {
    try {
        const { email, password, otp } = req.body;
        const user = await User.findOne({ email });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Verify OTP
        if (otpCache[email] !== otp) {
            return res.status(400).send("Invalid OTP");
        }

        const SECRET_KEY = 'Preaveen@8233';
        const token = jwt.sign({ userId: user._id }, SECRET_KEY, { expiresIn: '1h' });

        // Set session with user ID
        req.session.userId = user._id.toString();

        // Set cookie with user ID
        res.cookie('userId', user._id.toString(), { httpOnly: true, maxAge: 3600000 }); // 1 hour

        res.redirect('/');
    } catch (error) {
        console.error('Error logging in user:', error);
        res.status(500).json({ message: 'Error logging in user' });
    }
});


// Handle logout
// Handle logout
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Could not log out, please try again');
        }
        res.clearCookie('connect.sid'); // Clear the session cookie
        res.clearCookie('userId'); // Clear the user ID cookie
        res.redirect('/');
    });
});



// Custom tshirt routes
app.get('/CustomTshirt', (req, res) => {
    res.render('CustomTshirt')
})



app.post('/api/save-design', async (req, res) => {
    const { frontDesign, backDesign } = req.body;
    try {
        const design = new CustomTshirt({ frontImage: frontDesign, backImage: backDesign });
        await design.save();
        res.status(200).send('Design saved successfully');
    } catch (error) {
        console.error("Error saving design:", error);
        res.status(500).send('Error saving design');
    }
});




app.get('/show-design', async (req, res) => {
    try {
        // Fetch all designs from the database
        const designs = await CustomTshirt.find();

        // Log the designs for debugging purposes
        // console.log('Designs:', designs);

        // Render the 'designs' view and pass the data
        res.render('designs', { designs: designs });
    } catch (error) {
        console.error("Error fetching designs:", error);
        res.status(500).send('Error fetching designs');
    }
}); 



app.get('/contact', (req, res) => {
    res.render('contactUs');
});

app.get('/about', (req, res) => {
    res.render('aboutUs');
});



// Start the server on the specified port
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});