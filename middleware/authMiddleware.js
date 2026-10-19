exports.requireAuth = (req, res, next) => {
	if (!req.session?.user) {
		return res.redirect(`/login?returnTo=${encodeURIComponent(req.originalUrl)}`);
	}

	return next();
};
