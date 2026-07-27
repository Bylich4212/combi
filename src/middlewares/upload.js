const multer = require('multer');

// Los comprobantes se reciben en memoria (nunca tocan el disco)
// con un máximo de 5 MB para evitar abusos
const upload = multer({ 
  storage: multer.memoryStorage(), 
  limits: { fileSize: 5 * 1024 * 1024 } 
});

module.exports = upload;
