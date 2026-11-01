import User from "../models/User.js";

export async function requireAuth(req, res, next) {
  res.set("Cache-Control", "no-store");

  if (!req.session?.userId) {
    return res.status(401).json({
      message: "Please log in to continue.",
    });
  }

  try {
    const user = await User.findById(req.session.userId).select("_id");

    if (!user) {
      return res.status(401).json({
        message: "Your account is unavailable. Please log in again.",
      });
    }

    req.userId = user._id;
    next();
  } catch (error) {
    next(error);
  }
}
