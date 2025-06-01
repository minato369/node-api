import database from "../main/database.js";

const db = {};

db.insert_user = (email, password, username) => {
	return new Promise((resolve, reject) => {
		const query = 'INSERT INTO users(email, password, username) VALUES (?, ?, ?)';
		database.query(query, [email, password, username], (err, result) => {
			if (err) {
				return reject(err);
			}
			resolve({
				id: result.insertId,
				email,
				username,
			});
		});
	});
};

db.insert_book = (name, author, genre) => {
	return new Promise((resolve, reject) => {
		const query = 'INSERT INTO books (name, author, genre) VALUES (?,?,?)';
		database.query(query, [name, author, genre], (err, result) => {
			if (err) {
				return reject(err);
			}
			resolve({
				id: result.insertId,
				name,
				author,
			});
		})
	})
}

db.get_user = (email) => {
	return new Promise((resolve, reject) => {
		const query = 'SELECT * FROM users where email = ?';
		database.query(query, [email], (err, result) => {
			if (err) {
				return reject(err);
			}
			return resolve(result[0]);
		})
	})
}
// db.get_books = () => {
// 	return new Promise((resolve, reject) => {
// 		const query = 'SELECT * FROM books';
// 		database.query(query, (err, result) => {
// 			if (err) {
// 				return reject(err);
// 			}
// 			return resolve(result);
// 		})
// 	})
// }

db.is_book_review_exsits = (book_id, user_id) => {
	return new Promise((resolve, reject) => {
		const query = 'SELECT * FROM review WHERE book_id = :book_id AND user_id = :user_id';
		database.query(query, {book_id, user_id}, (err, result) => {
			if (err) {
				return reject(err);
			}
			resolve(Object.keys(result).length > 0);
		});
	});
};

db.is_review_exsits = (review_id, user_id) => {
	return new Promise((resolve, reject) => {
		const query = 'SELECT * FROM review WHERE id = :review_id AND user_id = :user_id';
		database.query(query, {review_id, user_id}, (err, result) => {
			if (err) {
				return reject(err);
			}
			resolve(Object.keys(result).length > 0);
		});
	});
};

db.add_review = (book_id, user_id, rating, review) => {
	return new Promise((resolve, reject) => {

		var review_date = new Date();
		const query = "INSERT INTO review (book_id, user_id, rating, review, review_date) VALUES(?,?,?,?,?)";
		database.query(query, [book_id, user_id, rating, review, review_date], (err, result) => {
			if (err) {
				return reject(err)
			}
			resolve(result);
		})
	})
}

db.update_review = (review_id, user_id, review) => {
	return new Promise((resolve, reject) => {

		var update_datetime = new Date();

		const updateQuery = "UPDATE review SET review = :review, review_date = :update_datetime WHERE id = :review_id AND user_id = :user_id";

		database.query(updateQuery, {review, review_id, user_id, update_datetime}, (err, result) => {

			console.log(updateQuery);
			if (err) {
				return reject(err);
			}

			resolve(result);
		});

	});
};

db.delete_review = (review_id, user_id) => {
	return new Promise((resolve, reject) => {
		const query = "DELETE FROM review where id = :review_id AND user_id = :user_id";

		database.query(query, {review_id, user_id}, (err, result) => {
			if (err) {
				return reject(err);
			}
			resolve(result);
		});
	})
}

db.get_books = (options = {}) => {
	return new Promise((resolve, reject) => {

		const title = options.title ? options.title : null;
		const author = options.author ? options.author : null;
		const genre = options.genre ? options.genre : null;
		const sort = options.sort ? options.sort : null;
		const is_search = options.is_search ? options.is_search : null;
		const order = options.order && ['asc', 'desc'].includes(options.order.toLowerCase()) ? options.order.toUpperCase() : 'ASC';
		
		// Pagination
		const page = options.page ? options.page : 1;

		const limit = 10;
		const safePage = Math.max(1, Number(page) || 1);
		const offset = (safePage - 1) * limit;

		let query = `SELECT * FROM books`;

		const conditions = [];
		const params = {};

		if (title) {

			if(!is_search) {
				conditions.push('name = :name');
				params.name = title;
			} else {
				conditions.push('BINARY name LIKE :name');
				params.name = title+'%';
			}

		}

		if (author) {
			if(!is_search) {
				conditions.push('author = :author');
				params.author = author;
			} else {
				conditions.push('BINARY author LIKE :author');
				params.author = author+'%';
			}
		}

		if (genre) {
			conditions.push('genre = :genre');
			params.genre = genre;
		}

		if (conditions.length > 0) {
			query += ' WHERE ' + conditions.join(' AND ');
		}

		query += ' LIMIT :limit OFFSET :offset';
		params.limit = limit;
		params.offset = offset;


		// const allowedSortFields = ['author', 'genre', 'title', 'created_at'];
		// if (sort && allowedSortFields.includes(sort)) {
		// 	query += ` ORDER BY ${sort} ${order}`;
		// }


		database.query(query, params, (err, results) => {
			
			if (err) {
				return reject(err);
			}

			const bookMap = new Map();

			results.forEach(row => {
				const bookId = row.id;

				if (!bookMap.has(bookId)) {
					bookMap.set(bookId, {
						id: bookId,
						title: row.name,
						author: row.author,
						genre: row.genre,
						created_at: row.created_at,
						reviews: []
					});
				}

				if (row.review_id) {
					bookMap.get(bookId).reviews.push({
						review: row.review
					});
				}
			});

			console.log(Array.from(bookMap.values()));

			resolve(Array.from(bookMap.values()));
		});
	});
};


db.get_book = (id = 0) => {

	if(!id) return false;

	return new Promise((resolve, reject) => {
		const query = `SELECT b.*, ROUND(AVG(r.rating), 1) AS rating FROM books b 
					   LEFT JOIN review r ON b.id = r.book_id
					   WHERE b.id = :id`;

		database.query(query, {id}, (err, result) => {
			if (err) return reject(err);
			resolve(result);
		});
	})
};

db.get_book_reviews = (id = 0, page = 1) => {
	
	if(!id) return false;

	// Pagination
	const limit = 10;
	const safePage = Math.max(1, Number(page) || 1);
	const offset = (safePage - 1) * limit;

	return new Promise((resolve, reject) => {
		
		const query = `SELECT r.id, r.review, u.username FROM review r
					LEFT JOIN users u ON u.id = r.user_id
					WHERE book_id = :id
					LIMIT :limit OFFSET :offset`;

		database.query(query, {id, limit,offset}, (err, results) => {
			
			if (err) return reject(err);

			if(results.length < 1) return reject(false);

			const bookReviews = new Map();

			results.forEach(row => {
				
				const review_id = row.id;

				if (!bookReviews.has(review_id)) {
					bookReviews.set(review_id, {
						id: review_id,
						review: row.review,
						username: row.username
					});
				}
			});

			resolve(Array.from(bookReviews.values()));

		});
	})
}

export default db;
