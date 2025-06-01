import express from 'express';
const router = express.Router();

import jsonwebtoken from 'jsonwebtoken';
import db from './funtions.js';
import { hashSync, genSaltSync, compareSync } from 'bcrypt';
import cookieParser from 'cookie-parser';
import { authenticate } from '../main/auth.js';

router.use(cookieParser());

router.get('/', (req, res) => {
	res.send('node-api app');
});


// POST /signup – register a new user
router.post('/signup', async (req, res) => {
	try {

		let { username, email, password } = req.body;

		const errors = [];

		if (!username || username.trim().length < 3) {
			errors.push({ field: 'username', message: 'Username must be at least 3 characters long' });
		}

		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!email || !emailRegex.test(email)) {
			errors.push({ field: 'email', message: 'Invalid email address' });
		}

		if (!password || password.length < 6) {
			errors.push({ field: 'password', message: 'Password must be at least 6 characters long' });
		}

		if (errors.length > 0) {
			return res.status(400).json({ "message": "Failed to Sign up", "errors": errors });
		}

		const user = await db.get_user(email);

		if (user) {
			return res.status(409).json({
				message: "User Already exsits"
			})
		}

		const salt = genSaltSync(10);
		const hashedPassword = hashSync(password, salt);
		const createdUser = await db.insert_user(email, hashedPassword, username);
		
		if (!createdUser) {
			return res.status(500).json({
				message: "There has been error creating new account please try again."
			});
		}

		return res.status(201).json({
			message: "Account created succefully please login!"
		});


	} catch (e) {
		console.error(e);
		res.status(400).json({ error: 'Signup failed' });
	}
});

// POST /login – authenticate and return a token
router.post('/login', async (req, res) => {
	try {

		let { email, password } = req.body;

		const errors = [];
		
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!email || !emailRegex.test(email)) {
			errors.push({ field: 'email', message: 'Invalid email address' });
		}

		if (!password || password.length < 1) {
			errors.push({ field: 'password', message: 'Please provide password' });
		}

		if (errors.length > 0) {
			return res.status(400).json({ "message": "Failed to Log In", "errors": errors });
		}

		const user = await db.get_user(email);

		if (!user) {
			return res.json({
				message: "Invalid email or password!"
			})
		}

		const isValid = compareSync(password, user.password);

		if (isValid) {

			user.password = undefined;
			user.username = undefined;
			user.name = undefined;
			const jsontoken = jsonwebtoken.sign({ user }, process.env.SECRET_KEY, { expiresIn: '30m' });
			res.cookie('token', jsontoken, { httpOnly: true, secure: true, sameSite: 'strict', expires: new Date(Date.now() + 30 * 60 * 1000) });
			
			return res.json({ message: 'Login successfull', token: jsontoken });

		}

		return res.json({
			message: "Invalid email or password"
		});
	}
	catch (e) {
		console.error(e);
		res.status(400).json({ error: 'login failed' });
	}
})

// POST /books – Add a new book 
router.post('/books', authenticate, async (req, res) => {
	try {

		let { name, author, genre } = req.body;

		const errors = [];

		if (!name || name.length < 1) {
			errors.push({ field: 'password', message: 'Please provide Book Name' });
		}

		if (!author || author.length < 1) {
			errors.push({ field: 'password', message: 'Please provide Author Name' });
		}
		
		if (!genre || genre.length < 1) {
			errors.push({ field: 'password', message: 'Please provide genre' });
		}

		if (errors.length > 0) {
			return res.status(400).json({ "message": "Failed to add book", "errors": errors });
		}

		const book = await db.insert_book(name, author, genre);
		if (book) {
			return res.json({
				message: "Book added successfully!"
			});
		} else {
			return res.json({
				message: "There has been error adding new book please try again."
			});
		}
	}
	catch (e) {
		console.error(e);
		res.status(400).json({ error: 'Failed to add book' });
	}
})

// GET /books – Get all books
router.get('/books', authenticate, async (req, res) => {
	try {

		const options = {
			author: req.query.author,
			genre: req.query.genre,
			sort: req.query.sort,
			order: req.query.order,
			page: req.query.page
		};

		const all_books = await db.get_books(options);

		if (all_books && all_books.length > 0) {
			return res.status(404).json({
				message: "No books found"
			});
		}

		return res.status(200).json({
			message: "Books fetched successfully",
			result: all_books
		});

	} catch (e) {
		console.error(e);
		return res.status(500).json({
			message: "Unable to get books",
			error: e.message
		});
	}
});

// GET /books/:id – Get book details by ID, includes Average rating & Reviews 
router.get('/books/:id', authenticate, async (req, res) => {

	try {

		const id = req.params.id;

		if (!id) {
			return res.status(400).json({ message: "Please provide Book ID" });
		}
		
		const book = await db.get_book(id);

		console.log(book);

		if (!book) {
			return res.status(400).json({ message: "No Book found with the given ID!" });
		}

		const page = req.query.page;
		const book_reviews = await db.get_book_reviews(id, page);
		console.log(book);
		book[0].reviews = book_reviews;
		
		return res.status(200).json({book});

	}
	catch (e) {
		console.log(e);
		return res.json({
			message: "Failed to get Book!"
		});
	}


});

// POST /books/:id/reviews – Submit a review
router.post('/books/:id/reviews', authenticate, async (req, res) => {
	try {

		const book_id = parseInt(req.params.id);
		const user_id = parseInt(req.user.user.id);
		const { rating, review } = req.body

		const hasReview = await db.is_book_review_exsits(book_id, user_id);

		if (hasReview) {
			return res.json({
				message: "You already has given review to this book"
			});
		}

		const addReview = await db.add_review(book_id, user_id, rating, review);

		if (!addReview) {
			return res.json({
				message: "There has been error adding review."
			});
		}

		return res.json({
			message: "Successfully added review",
		});

	}
	catch (e) {
		console.log(e);
		return res.json({
			message: "Failed to add reveiew"
		});
	}
})

// PUT /reviews/:id – Update your own review
router.put('/reviews/:id', authenticate, async (req, res) => {
	try {

		const user_id = parseInt(req.user.user.id);
		const review_id = parseInt(req.params.id);
		const { review } = req.body

		const check_review = await db.is_review_exsits(review_id, user_id);

		console.log(check_review);
		

		if (!check_review) {
			return res.json({
				message: "Review not found"
			});
		}

		const updateReview = await db.update_review(review_id, user_id, review);

		if (!updateReview) {
			return res.status(500).json({
				message: "There has been error updating review."
			});
		}

		return res.json({
			message: "Successfully updated review",
		});


	} catch (e) {
		console.log(e);
		return res.json({
			message: "Failed to update reveiew"
		});
	}
})

// DELETE /reviews/:id – Delete your own review
router.delete('/reviews/:id', authenticate, async (req, res) => {
	try {
		const review_id = parseInt(req.params.id);
		const user_id = parseInt(req.user.user.id);

		if (!user_id) {
			return res.status(401).json({ message: "User not logged in" });
		}

		const check_review = await db.check_review(review_id, user_id);

		if (!check_review) {
			return res.json({
				message: "Review not found"
			});
		}

		const delete_review = await db.delete_review(review_id, user_id);

		if(!delete_review) {
			return res.json({
				message: "There was an error deleting the review."
			});
		}

		return res.json({
			message: "Successfully deleted review"
		});

	} catch (e) {
		console.log(e);
		return res.json({
			message: "Failed to delete reveiew"
		});
	}
})

// GET /books – Get all books
router.get('/search', authenticate, async (req, res) => {
	
	try {

		const options = {
			title: req.query.title,
			author : req.query.author,
			sort: req.query.sort,
			order: req.query.order,
			page: req.query.page,
			is_search: 1
		};

		const all_books = await db.get_books(options);

		if (!all_books) {
			return res.status(404).json({
				message: "No books found"
			});
		}

		return res.status(200).json({
			message: "Books fetched successfully",
			result: all_books
		});

	} catch (e) {
		console.error(e);
		return res.status(500).json({
			message: "Unable to get books",
			error: e.message
		});
	}
});

export default router;
