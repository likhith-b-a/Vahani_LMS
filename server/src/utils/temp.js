router.get("/profile", verifyJWT, (req, res) => {
  res.json({
    message: "Protected route",
    user: req.user,
  });
});

router.post(
  "/create-course",
  verifyJWT,
  authorizeRoles("admin"),
  authorizeRoles("admin", "instructor"),
  (req, res) => {
    res.json({ message: "Course created" });
  },
);



/*
Frontend → API request with access token
        ↓
Backend verifies token
        ↓
If expired → 401 error
        ↓
Frontend catches 401
        ↓
Frontend calls /refresh-token
        ↓
Backend returns new access token
        ↓
Frontend retries original request
*/