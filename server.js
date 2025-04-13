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
const MongoStore = require('connect-mongo');

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
    saveUninitialized: false,
    mongoUrl: process.env.MONGO_URI,
    cookie: { secure: false, maxAge: 3600000 } // 1 hour
}));
app.use(express.json()); // For JSON bodies
app.use(express.urlencoded({ extended: true })); // For form data

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
const Order = require('./models/OrderSchema');
const Contact= require('./models/Contact')
const Coupon = require('./models/CouponSchema '); // Adjust path if needed


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

app.get('/Terms-and-conditions', (req,res)=>{
    res.render("termsandcondition")
})

app.get('/Privacy-policy', (req,res)=>{
    res.render("privacypolicy")
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


//ai based report analysis ,weekly analysis of police  criminal prediction

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
            res.redirect('/cart')
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
        const productId = req.params.id;
        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).send('Product not found');
        }

        const userId = req.session.userId || req.cookies.userId;
        let user = { name: 'Guest' };

        if (userId) {
            user = await User.findById(userId, 'name _id');
        }

        // Explicitly passing productId as separate variable
        res.render('product_detail', { 
            product, 
            user, 
            productId: product._id 
        });
        
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
// app.get('/product_details/:id', (req, res) => {
//     const productId = req.params.id;
//     const product = products.find(p => p.id == productId);

//     if (!product) {
//         return res.status(404).send("Product not found");
//     }
//     console.log(product)

//     res.render('product_detail', { product });
// });


// GET: Main coupons page with list and form
app.get('/coupons', async (req, res) => {
    try {
      const coupons = await Coupon.find().sort({ createdAt: -1 });
      res.render('coupon_form', { 
        coupons, 
        coupon: null 
      });
    } catch (err) {
      console.error('Error fetching coupons:', err);
      res.redirect('/coupons');
    }
  });
  
  // GET: Form to add new coupon
  app.get('/add-coupon', (req, res) => {
    res.render('coupon_form', {
      coupons: [],
      coupon: null
    });
  });
  
  // GET: Form to edit existing coupon
  app.get('/edit/:id', async (req, res) => {
    try {
      const [coupons, coupon] = await Promise.all([
        Coupon.find().sort({ createdAt: -1 }),
        Coupon.findById(req.params.id)
      ]);
  
      if (!coupon) return res.redirect('/coupons');
  
      res.render('coupon_form', { 
        coupons, 
        coupon 
      });
    } catch (err) {
      console.error('Error in edit route:', err);
      res.redirect('/coupons');
    }
  });
  
  // POST: Toggle coupon active status
  app.post('/toggle-active/:id', async (req, res) => {
    try {
      const coupon = await Coupon.findById(req.params.id);
      if (!coupon) return res.redirect('/coupons');
  
      coupon.active = !coupon.active;
      await coupon.save();
  
      res.redirect('/coupons');
    } catch (err) {
      console.error('Error toggling coupon status:', err);
      res.redirect('/coupons');
    }
  });
  
  // POST: Delete coupon
  app.post('/delete/:id', async (req, res) => {
    try {
      await Coupon.findByIdAndDelete(req.params.id);
      res.redirect('/coupons');
    } catch (err) {
      console.error('Error deleting coupon:', err);
      res.redirect('/coupons');
    }
  });
  
  // POST: Create new coupon
  app.post('/create', async (req, res) => {
    try {
      const { code, discountType, discountValue, expiryDate, active } = req.body;
  
      if (!code || !discountType || !discountValue || !expiryDate) {
        return res.redirect('/coupons');
      }
  
      const existingCoupon = await Coupon.findOne({ code });
      if (existingCoupon) {
        return res.redirect('/coupons');
      }
  
      const coupon = new Coupon({
        code,
        discountType,
        discountValue: Number(discountValue),
        expiryDate: new Date(expiryDate),
        active: active === 'on'
      });
  
      await coupon.save();
      res.redirect('/coupons');
    } catch (err) {
      console.error('Error creating coupon:', err);
      res.redirect('/coupons');
    }
  });
  
  // POST: Update existing coupon
  app.post('/update/:id', async (req, res) => {
    try {
      const { code, discountType, discountValue, expiryDate, active } = req.body;
      const couponId = req.params.id;
  
      if (!code || !discountType || !discountValue || !expiryDate) {
        return res.redirect(`/edit/${couponId}`);
      }
  
      const existingCoupon = await Coupon.findOne({ code, _id: { $ne: couponId } });
      if (existingCoupon) {
        return res.redirect(`/edit/${couponId}`);
      }
  
      await Coupon.findByIdAndUpdate(couponId, {
        code,
        discountType,
        discountValue: Number(discountValue),
        expiryDate: new Date(expiryDate),
        active: active === 'on'
      }, { new: true });
  
      res.redirect('/coupons');
    } catch (err) {
      console.error('Error updating coupon:', err);
      res.redirect(`/edit/${req.params.id}`);
    }
  });
  
  /////////////////////////////////////////////////////////////////////////////////////////////////////////

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
        res.redirect('/');

    } catch (error) {
        console.error('Error signing up user:', error);
        res.status(500).send('Error signing up user: ' + error.message);
    }
});

// Login Route
app.post('/user/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Validate input
        if (!email || !password) {
            req.session.loginError = 'Please provide both email and password';
            return res.redirect('/signup');
        }

        const user = await User.findOne({ email });

        if (!user) {
            req.session.loginError = 'Invalid email or password';
            return res.redirect('/signup');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            req.session.loginError = 'Invalid email or password';
            return res.redirect('/signup');
        }

        // Create JWT token
        const SECRET_KEY = process.env.JWT_SECRET || 'Preaveen@8233';
        const token = jwt.sign({ userId: user._id }, SECRET_KEY, { expiresIn: '1h' });

        // Set session and cookies
        req.session.userId = user._id.toString();
        res.cookie('token', token, { 
            httpOnly: true, 
            maxAge: 3600000, // 1 hour
            secure: process.env.NODE_ENV === 'production'
        });

        // Successful login redirect
        return res.redirect('/');

    } catch (error) {
        console.error('Error logging in user:', error);
        req.session.loginError = 'Error logging in. Please try again.';
        res.redirect('/signup');
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




//apply coupon
// In your routes/cart.js
// Enhanced Coupon Application Route
// Apply Coupon Route - Now using redirects
app.post('/cart/apply-coupon', async (req, res) => {
    try {
        const { couponCode } = req.body;
        
        // Validate input
        if (!couponCode || typeof couponCode !== 'string' || couponCode.trim() === '') {
            req.session.couponMessage = 'Please enter a valid coupon code';
            return res.redirect('/cart');
        }

        // Get user ID
        const userId = req.user?._id || req.session.userId;
        if (!userId) {
            req.session.couponMessage = 'Please login to apply coupons';
            return res.redirect('/login'); // Redirect to login page
        }

        // Find coupon (case insensitive search)
        const coupon = await Coupon.findOne({ 
            code: { $regex: new RegExp(`^${couponCode.trim()}$`, 'i') },
            active: true,
            expiryDate: { $gte: new Date() }
        });

        if (!coupon) {
            // More specific error messages
            const expiredCoupon = await Coupon.findOne({ 
                code: { $regex: new RegExp(`^${couponCode.trim()}$`, 'i') },
                expiryDate: { $lt: new Date() }
            });

            if (expiredCoupon) {
                req.session.couponMessage = 'This coupon has expired';
                return res.redirect('/cart');
            }

            const inactiveCoupon = await Coupon.findOne({ 
                code: { $regex: new RegExp(`^${couponCode.trim()}$`, 'i') },
                active: false
            });

            if (inactiveCoupon) {
                req.session.couponMessage = 'This coupon is no longer active';
                return res.redirect('/cart');
            }

            req.session.couponMessage = 'Invalid coupon code';
            return res.redirect('/cart');
        }

        // Get user's cart
        const cart = await Cart.findOne({ user: userId })
            .populate('items.product')
            .populate('appliedCoupon');

        if (!cart || cart.items.length === 0) {
            req.session.couponMessage = 'Your cart is empty';
            return res.redirect('/cart');
        }

        // Check if coupon is already applied
        if (cart.appliedCoupon && cart.appliedCoupon._id.equals(coupon._id)) {
            req.session.couponMessage = 'This coupon is already applied';
            return res.redirect('/cart');
        }

        // Calculate discount
        const subtotal = cart.items.reduce((total, item) => 
            total + (item.product.price * item.quantity), 0);
        
        let discountAmount = 0;
        if (coupon.discountType === 'percentage') {
            discountAmount = subtotal * (coupon.discountValue / 100);
            discountAmount = Math.min(discountAmount, subtotal);
        } else {
            discountAmount = Math.min(coupon.discountValue, subtotal);
        }

        // Update cart
        cart.appliedCoupon = coupon._id;
        cart.discountAmount = discountAmount;
        await cart.save();

        req.session.couponMessage = `Coupon "${coupon.code}" applied successfully!`;
        res.redirect('/cart');

    } catch (error) {
        console.error('Coupon application error:', error);
        req.session.couponMessage = 'Failed to apply coupon';
        res.redirect('/cart');
    }
});

// Remove Coupon Route - Now using redirects
// Change from POST to GET
app.get('/cart/remove-coupon', async (req, res) => {
    try {
        const userId = req.user?._id || req.session.userId;
        if (!userId) {
            req.session.couponMessage = 'Not authorized';
            return res.redirect('/login');
        }

        const cart = await Cart.findOne({ user: userId });
        if (!cart) {
            req.session.couponMessage = 'Cart not found';
            return res.redirect('/cart');
        }

        if (!cart.appliedCoupon) {
            req.session.couponMessage = 'No coupon applied to remove';
            return res.redirect('/cart');
        }

        // Remove coupon from cart
        cart.appliedCoupon = undefined;
        cart.discountAmount = 0;
        await cart.save();

        req.session.couponMessage = 'Coupon removed successfully';
        res.redirect('/cart');

    } catch (error) {
        console.error('Error removing coupon:', error);
        req.session.couponMessage = 'Failed to remove coupon';
        res.redirect('/cart');
    }
});
// Cart Route - Updated to use session messages
app.get('/cart', async (req, res) => {
    try {
        let user = { name: "Guest" };
        let userId = null;
        
        // Authentication check
        if (req.user) {
            user = req.user;
            userId = req.user._id;
        } else {
            userId = req.session.userId;
            if (userId) {
                user = await User.findById(userId, "name");
            }
        }

        // Get cart with populated data
        let cart = await Cart.findOne({ user: userId })
            .populate('items.product')
            .populate('appliedCoupon');

        let discountAmount = 0;
        const couponMessage = req.session.couponMessage;
        delete req.session.couponMessage; // Clear the message after displaying

        // Validate cart and coupon
        if (cart) {
            if (!cart.items) cart.items = [];
            
            // Check applied coupon validity
            if (cart.appliedCoupon) {
                const now = new Date();
                if (!cart.appliedCoupon.active || cart.appliedCoupon.expiryDate < now) {
                    // Coupon is no longer valid
                    req.session.couponMessage = 'The applied coupon is no longer valid';
                    cart.appliedCoupon = undefined;
                    cart.discountAmount = 0;
                    await cart.save();
                } else {
                    discountAmount = cart.discountAmount || 0;
                }
            }
        } else {
            cart = { items: [] };
        }

        res.render('cart', {
            user,
            cart,
            discountAmount,
            message: couponMessage,
            error: null
        });

    } catch (error) {
        console.error('Error loading cart:', error);
        res.status(500).render('cart', {
            user: { name: "Guest" },
            cart: { items: [] },
            error: 'Failed to load cart'
        });
    }
});

// Add these routes to your Express app

// Update item quantity
app.post('/cart/update-quantity', async (req, res) => {
    try {
        const { productId, size, quantity } = req.body;
        let userId = req.user?._id || req.session.userId;

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Not authenticated' });
        }

        const cart = await Cart.findOne({ user: userId });
        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }

        // Find the item to update
        const itemIndex = cart.items.findIndex(
            item => item.product.toString() === productId && item.size === size
        );

        if (itemIndex === -1) {
            return res.status(404).json({ success: false, message: 'Item not found in cart' });
        }

        // Update quantity
        if (quantity > 0) {
            cart.items[itemIndex].quantity = quantity;
        } else {
            // Remove item if quantity is 0 or less
            cart.items.splice(itemIndex, 1);
        }

        await cart.save();
        res.json({ success: true, cart });
    } catch (error) {
        console.error('Error updating cart quantity:', error);
        res.status(500).json({ success: false, message: 'Error updating cart' });
    }
});

// Remove item from cart
app.post('/cart/remove-item', async (req, res) => {
    try {
        const { productId, size } = req.body;
        let userId = req.user?._id || req.session.userId;

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Not authenticated' });
        }

        const cart = await Cart.findOne({ user: userId });
        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }

        // Remove the item
        cart.items = cart.items.filter(
            item => !(item.product.toString() === productId && item.size === size)
        );

        await cart.save();
        res.json({ success: true, cart });
    } catch (error) {
        console.error('Error removing item from cart:', error);
        res.status(500).json({ success: false, message: 'Error removing item from cart' });
    }
});


app.post('/place-order', async (req, res) => {  // Changed route name
    try {
        const userId = req.user?._id || req.session.userId;
        
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Not authenticated' });
        }

        const cart = await Cart.findOne({ user: userId })
            .populate('items.product')
            .populate('appliedCoupon');

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ success: false, message: 'Cart is empty' });
        }

        const orderItems = cart.items.map(item => ({
            product: item.product._id,
            quantity: item.quantity,
            size: item.size,
            priceAtPurchase: item.product.price
        }));

        const subtotal = cart.items.reduce((total, item) => 
            total + (item.product.price * item.quantity), 0);
        
        const shippingFee = 5.00;
        const discountAmount = cart.discountAmount || 0;
        const totalAmount = subtotal - discountAmount + shippingFee;

        const newOrder = new Order({
            user: userId,
            cart: cart._id,
            items: orderItems,
            subtotal,
            discountAmount,
            shippingFee,
            totalAmount,
            paymentMethod: req.body.paymentMethod || 'COD',
            paymentStatus: 'Pending',
            shippingAddress: req.body.shippingAddress,
            couponUsed: cart.appliedCoupon?._id
        });

        await newOrder.save();
        
        // Clear the cart
        cart.items = [];
        cart.appliedCoupon = null;
        cart.discountAmount = 0;
        await cart.save();

        res.json({ 
            success: true, 
            orderId: newOrder._id,
            message: 'Order created successfully' 
        });

    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to create order' 
        });
    }
});

// Order confirmation page
app.get('/confirmation/:id', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('user', 'name email')
            .populate('items.product', 'name price');
            
        if (!order) {
            return res.status(404).send('Order not found');
        }
        
        res.render('order-confirmation', { 
            user: req.user || { name: 'Guest' },
            order 
        });
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).send('Error loading order details');
    }
});
// Custom tshirt routes


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

// View all orders (EJS)
// Get all orders for the current user
// Get all orders (without user filtering)
app.get('/orders', async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('items.product', 'name images price')
            .sort({ createdAt: -1 });

        res.render('order', { orders });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).render('error', { message: 'Server error fetching orders' });
    }
});

// GET: All Orders for a Logged-In User
app.get('/all-orders', async (req, res) => {
    try {
        const userId = req.session.userId || req.cookies.userId;

        if (!userId) {
            return res.redirect('/signup');
        }

        const orders = await Order.find({ user: userId })
            .populate({
                path: 'items.product',
                select: 'name images price'
            })
            .sort({ createdAt: -1 });

        res.render('allOrders', {
            orders
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});


// Get specific order details (without user checking)
app.get('/orders/:id', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('items.product', 'name images price description');

        if (!order) {
            return res.status(404).render('error', { message: 'Order not found' });
        }

        res.render('order_detail', { order });
    } catch (error) {
        console.error('Error fetching order details:', error);
        res.status(500).render('error', { message: 'Server error fetching order details' });
    }
});


app.post('/contact', async (req, res) => {
    try {
        const { name, email, message } = req.body;

        // Basic validation
        if (!name || !email || !message) {
            return res.status(400).send('All fields are required.');
        }

        // Save to DB
        const contact = new Contact({ name, email, message });
        await contact.save();
    } catch (error) {
        console.error('Error saving contact info:', error);
        res.status(500).send('An error occurred while submitting your message.');
    }
});

app.get('/admin/contacts', async (req, res) => {
    try {
        const contacts = await Contact.find().sort({ submittedAt: -1 });
        res.render('contact_request', { contacts });
    } catch (err) {
        console.error('Error fetching contacts:', err);
        res.status(500).send('Internal Server Error');
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
app.get('/terms-and-condition', (req,res)=>{
    res.render('termsandcondition');
})
app.get('/privacy_policy', (req,res)=>{
    res.render('./privacypolicy');
})



// Start the server on the specified port
// ... [all your existing middleware and routes] ...

// Create HTTP server
// const server = app.listen(PORT, '0.0.0.0', () => {
//     console.log(`Server is running on http://localhost:${PORT}`);
// });

// // Connection timeout handler
// // Enhanced connection timeout handler
// server.on('connection', (socket) => {
//     const clientId = `${socket.remoteAddress}:${socket.remotePort}`;
//     console.log(`New connection from ${clientId}`);

//     // Set timeout to 30 seconds (30000ms)
//     socket.setTimeout(30000);

//     socket.on('timeout', () => {
//         console.log(`[TIMEOUT] Closing idle connection ${clientId}`);
//         socket.destroy();
//     });

//     socket.on('close', (hadError) => {
//         console.log(`[CLOSE] Connection ${clientId} closed`, 
//                    hadError ? 'with error' : 'cleanly');
//     });

//     socket.on('error', (err) => {
//         console.error(`[ERROR] ${clientId}:`, err.message);
//     });
// });
// // Handle process termination
// process.on('SIGTERM', shutdown);
// process.on('SIGINT', shutdown);

// function shutdown() {
//     console.log('Shutting down gracefully...');
//     server.close(() => {
//         mongoose.connection.close(false, () => {
//             console.log('All connections closed');
//             process.exit(0);
//         });
//     });
    
//     // Force shutdown after 5 seconds
//     setTimeout(() => {
//         console.error('Forcing shutdown after timeout');
//         process.exit(1);
//     }, 5000);
// }
// Start the server on the specified port
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});