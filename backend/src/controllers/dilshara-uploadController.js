async function uploadProfilePicture(req, res) {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "No file uploaded." });
  }

  // multer-storage-cloudinary puts the public URL on req.file.path
  return res.status(200).json({
    success: true,
    url: req.file.path,
  });
}

module.exports = { uploadProfilePicture };