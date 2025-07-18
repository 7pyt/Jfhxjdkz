const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const rateLimit = require('express-rate-limit');

const app = express();
app.set('trust proxy', 1); // Pour Render ou tout reverse proxy

// 📂 Assure les dossiers existent
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
if (!fs.existsSync('sites')) fs.mkdirSync('sites');

// 📤 Configuration Multer
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

// 🔒 Limite à 50 sites par jour (par IP)
const createLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24h
  max: 50,
  message: '❌ Limite atteinte : vous ne pouvez créer que 50 sites par jour.'
});

// 🗂 Middleware statique
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/sites', express.static(path.join(__dirname, 'sites')));

// 📄 Chargement de la template
const baseTemplate = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');

// 🛠 Route POST de création avec limite
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

    const uid = Math.floor(Math.random() * 100000);

    const html = baseTemplate
      .replace(/a remplir photo de profil jpg etc\.+/, '/uploads/' + files.profileImage[0].filename)
      .replace(/a replir la meme pdp que en haut/, '/uploads/' + files.profileImage[0].filename)
      .replace(/a remplir audio mp3/, '/uploads/' + files.audioFile[0].filename)
      .replace(/a remplir video mp4 ou mov/, '/uploads/' + files.videoFile[0].filename)
      .replace(/a remplir logo url/, '/uploads/' + files.discordLogo[0].filename)
      .replace(/a remplir nom d'utilisateur/, username)
      .replace(/a remplir emoji 1 seul autorisé et que des emoji/, emoji)
      .replace(/a remplir bio/, bio)
      .replace(/UID: 000,001/, 'UID: ' + uid)
      .replace(/a remplir surnom/, tiktok)
      .replace(/a remplir description surnom/, shop)
      .replace(/a replir url https/, discordUrl);

    const outputPath = path.join(__dirname, 'sites', `site-${uid}.html`);
    fs.writeFileSync(outputPath, html);

    res.redirect(`/sites/site-${uid}.html`);
  } catch (err) {
    console.error('Erreur lors de la création du site :', err);
    res.status(500).send('Erreur serveur.');
  }
});

// 🚀 Lancement du serveur
app.listen(process.env.PORT || 3000, () => {
  console.log('✅ Serveur démarré sur le port 3000');
});
