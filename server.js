const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const rateLimit = require('express-rate-limit');

const app = express();
app.set('trust proxy', 1);

// Assure les dossiers existent
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
if (!fs.existsSync('sites')) fs.mkdirSync('sites');

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${file.fieldname}${ext}`);
  }
});
const upload = multer({ storage });
const cpUpload = upload.fields([
  { name: 'profileImage', maxCount: 1 },
  { name: 'audioFile', maxCount: 1 },
  { name: 'videoFile', maxCount: 1 },
  { name: 'discordLogo', maxCount: 1 }
]);

// Limite à 50 sites/jour
const createLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 50,
  message: '❌ Limite atteinte : vous ne pouvez créer que 50 sites par jour.'
});

// Middleware
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/sites', express.static(path.join(__dirname, 'sites')));
app.use(express.urlencoded({ extended: true })); // pour parser les champs texte

// GET form
app.get('/create', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// POST pour création de site
app.post('/create', createLimiter, cpUpload, (req, res) => {
  try {
    const files = req.files;
    const {
      username,
      emoji,
      bio,
      tiktok,
      shop,
      discordUrl
    } = req.body;

    const uid = Math.floor(100000 + Math.random() * 900000); // UID random 6 chiffres

    // Remplace tous les champs
    const html = fs.readFileSync('template.html', 'utf8')
      .replace(/%%PROFILE_IMAGE%%/g, '/uploads/' + files.profileImage[0].filename)
      .replace(/%%AUDIO_FILE%%/g, '/uploads/' + files.audioFile[0].filename)
      .replace(/%%VIDEO_FILE%%/g, '/uploads/' + files.videoFile[0].filename)
      .replace(/%%DISCORD_LOGO%%/g, '/uploads/' + files.discordLogo[0].filename)
      .replace(/%%USERNAME%%/g, username)
      .replace(/%%EMOJI%%/g, emoji)
      .replace(/%%BIO%%/g, bio)
      .replace(/%%UID%%/g, uid)
      .replace(/%%TIKTOK%%/g, tiktok)
      .replace(/%%SHOP%%/g, shop)
      .replace(/%%DISCORD_URL%%/g, discordUrl);

    const filePath = path.join(__dirname, 'sites', `site-${uid}.html`);
    fs.writeFileSync(filePath, html);

    res.redirect(`/sites/site-${uid}.html`);
  } catch (err) {
    console.error('❌ Erreur serveur :', err);
    res.status(500).send('Erreur serveur.');
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Serveur démarré sur http://localhost:${PORT}`);
});
