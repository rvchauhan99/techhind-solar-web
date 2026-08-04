const fs = require('fs');

const path = '/Users/ravatrajsinhchauhan/Documents/Programs/techHind/techhind-solar-web/src/app/company-profile/page.js';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/<ThemeButton/g, '<Button');
content = content.replace(/<\/ThemeButton>/g, '</Button>');

fs.writeFileSync(path, content);
console.log('Replaced ThemeButton');
