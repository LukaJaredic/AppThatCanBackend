const multer = require("multer");
const sharp = require("sharp");
const multerStorage = multer.memoryStorage();
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb("Please upload only images.", false);
  }
};
const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter
});
const uploadFiles = upload.array("attachments[]", 10);
const uploadImages = (req, res, next) => {
  uploadFiles(req, res, err => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_UNEXPECTED_FILE") {
        return res.send("Too many files to upload.");
      }
    } else if (err) {
      return res.send(err);
    }
    next();
  });
};
const resizeImages = async (req, res, next) => {
  if (!req.files) return next();
  req.body.attachments = [];
  await Promise.all(
    req.files.map(async file => {
      const filename = file.originalname.replace(/\..+$/, "");
      const newFilename = `${filename}-${Date.now()}.png`;
      await sharp(file.buffer)
        .resize({
          width: 400,
          height: 400,
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 },
          position: sharp.strategy.entropy
        })
        .toFormat("jpeg")
        .jpeg({ quality: 90 })
        .toFile(`assets/attachments/${newFilename}`);
      req.body.attachments.push(newFilename);
    })
  );
  next();
};

module.exports = {
  uploadImages: uploadImages,
  resizeImages: resizeImages
};