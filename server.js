require('dotenv').config();
const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limit : 1 site par IP toutes les 24h
const limiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 1,
  message: "🎯 Un seul site peut être créé par jour depuis votre IP."
});
app.use(limiter);

// MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connecté"))
  .catch(err => console.error("❌ Erreur MongoDB :", err));

// Schéma MongoDB
const Site = mongoose.model('Site', new mongoose.Schema({
  htmlContent: String,
  uid: Number,
  ownerIP: String,
  createdAt: { type: Date, default: Date.now }
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(express.static('views'));

// Multer config
const storage = multer.diskStorage({
  destination: 'public/uploads/',
  filename: (_, file, cb) =>
    cb(null, uuidv4() + path.extname(file.originalname))
});
const upload = multer({ storage });

// 🏠 Route d’accueil (optionnelle, personnalisable)
app.get('/', (req, res) => {
  res.send('<h1>Bienvenue sur le générateur de site</h1><a href="/create">Créer mon site</a>');
});

// 🆕 Route pour afficher le formulaire de création
app.get('/', (req, res) => res.render('index'));

// 🚀 POST /generate — Génération du site
app.post('/generate', upload.fields([
  { name: 'profileImage' },
  { name: 'audioFile' },
  { name: 'videoFile' },
  { name: 'discordLogo' }
]), async (req, res) => {
  const { username, emoji, bio, uid, tiktok, shop, discordUrl } = req.body;
  const files = req.files;
  const tmpl = fs.readFileSync('template/index.html', 'utf-8');

  const html = tmpl
    .replace(/a remplir photo de profil jpg etc\.\.\./g, '/uploads/' + files.profileImage[0].filename)
    .replace(/a replir la meme pdp que en haut/g, '/uploads/' + files.profileImage[0].filename)
    .replace(/a remplir audio mp3/g, '/uploads/' + files.audioFile[0].filename)
    .replace(/a remplir video mp4 ou mov/g, '/uploads/' + files.videoFile[0].filename)
    .replace(/a remplir logo url/g, '/uploads/' + files.discordLogo[0].filename)
    .replace(/a remplir nom d'utilisateur/g, username)
    .replace(/a remplir emoji 1 seul autorisé et que des emoji/g, emoji)
    .replace(/a remplir bio/g, bio)
    .replace(/UID: 000,001/g, 'UID: ' + uid)
    .replace(/a remplir surnom/g, tiktok)
    .replace(/a remplir description surnom/g, shop)
    .replace(/a replir url https/g, discordUrl);

  const site = await Site.create({
    htmlContent: html,
    uid: parseInt(uid),
    ownerIP: req.ip
  });

  res.redirect(`/site/${site._id}`);
});

// 🌐 GET /site/:id — Afficher un site généré
app.get('/site/:id', async (req, res) => {
  try {
    const site = await Site.findById(req.params.id);
    if (!site) return res.status(404).send("🚫 Site introuvable.");
    res.send(site.htmlContent);
  } catch (err) {
    res.status(500).send("❌ Erreur serveur.");
  }
});

// ✅ Démarrer le serveur
app.listen(PORT, () => {
  console.log(`🚀 Serveur actif sur http://localhost:${PORT}`);
});
