async function getProfile(req, res, next) {
  try {
    // This endpoint is deliberately static as required. Environment variables
    // allow changing the student/user information without editing source code.
    res.status(200).json({
      userId: Number(process.env.DEFAULT_USER_ID || 1),
      fullName: process.env.PROFILE_FULL_NAME || 'IoT User',
      email: process.env.PROFILE_EMAIL || 'iot.user@example.com',
      studentId: process.env.PROFILE_STUDENT_ID || null,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { getProfile };
