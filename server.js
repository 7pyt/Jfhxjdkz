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

// Rate limit: max 1 site par IP / 24h
const limiter = rateLimit({
  windowMs: 24*60*60*1000,
  max: 1,
  message: "🎯 Un seul site créé par jour depuis votre IP."
});
app.use(limiter);

// MongoDB
mongoose.connect(process.env.MONGO_URI).then(() => console.log("✅ MongoDB connecté"));

// Schema
const Site = mongoose.model('Site', new mongoose.Schema({
  htmlContent: String,
  uid: Number,
  ownerIP: String,
  createdAt: { type: Date, default: Date.now }
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

// Multer
const storage = multer.diskStorage({
  destination: 'public/uploads/',
  filename: (_, file, cb) =>
    cb(null, uuidv4() + path.extname(file.originalname))
});
const upload = multer({ storage });

// GET Form
app.get('/', (req, res) => res.render('index'));

// POST Generate
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
    .replace(/a remplir photo de profil jpg etc\.\.\./, '/uploads/' + files.profileImage[0].filename)
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

  const site = await Site.create({
    htmlContent: html,
    uid: parseInt(uid),
    ownerIP: req.ip
  });
  res.redirect(`/site/${site._id}`);
});

// GET site/:id
app.get('/site/:id', async (req, res) => {
  const site = await Site.findById(req.params.id);
  if (!site) return res.status(404).send("🚫 Site introuvable.");
  res.send(site.htmlContent);
});

app.listen(PORT, () => console.log(`🚀 Serveur sur http://localhost:${PORT}`));
