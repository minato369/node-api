import jwt from 'jsonwebtoken'

export const authenticate =(req, res, next) => {
	const token = req.cookies.token || req.headers['authorization']?.split(' ')[1];

	if (!token) {
		return res.status(401).json({ message: 'User can not verified' });
	}

	jwt.verify(token, process.env.SECRET_KEY, (err, result) => {
		if (err) {
			return res.status(403).json({ message: 'User cannot be verified' });
		}

		req.user = result;
		next();
	});
}