const crypto = require('crypto'); 
const salt = crypto.randomBytes(8).toString('hex'); 
const hash = crypto.createHash('sha256').update(salt + '123456').digest('hex'); 
console.log(`INSERT INTO app_passwords_v2 (id, label, salt, hash) VALUES ('clipboard_secret_67539ee2-a1b0-405d-bbc1-c33d', 'Secret Clipboard', '${salt}', '${hash}');`);
