// Depois do `expo export -p web`: copia index.html para 404.html (rotas diretas no GitHub Pages)
// e cria .nojekyll (o Expo gera pastas com "_").
const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, '..', 'dist');
fs.copyFileSync(path.join(dist, 'index.html'), path.join(dist, '404.html'));
fs.writeFileSync(path.join(dist, '.nojekyll'), '');
console.log('dist/404.html e dist/.nojekyll criados');
