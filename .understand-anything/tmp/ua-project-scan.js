const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectRoot = process.argv[2];
const outputFile = process.argv[3];

if (!projectRoot || !outputFile) {
  console.error('Usage: node scan.js <project-root> <output-file>');
  process.exit(1);
}

// Exclusion patterns
const EXCLUDE_DIRS = ['node_modules/', '.git/', 'vendor/', 'venv/', '.venv/', '__pycache__/', 'dist/', 'build/', 'out/', 'coverage/', '.next/', '.cache/', '.turbo/', 'target/'];
const EXCLUDE_EXTENSIONS = ['.lock', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.mp3', '.mp4', '.pdf', '.zip', '.tar', '.gz', '.min.js', '.min.css', '.map'];
const EXCLUDE_FILES = ['LICENSE', '.gitignore', '.editorconfig', '.prettierrc', '.eslintrc', '.log'];
const EXCLUDE_PATHS = ['.idea/', '.vscode/', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'];

// Language mapping
const EXT_TO_LANG = {
  '.ts': 'typescript', '.tsx': 'typescript', '.js': 'javascript', '.jsx': 'javascript',
  '.py': 'python', '.go': 'go', '.rs': 'rust', '.java': 'java', '.rb': 'ruby',
  '.cpp': 'cpp', '.cc': 'cpp', '.cxx': 'cpp', '.h': 'cpp', '.hpp': 'cpp', '.c': 'c',
  '.cs': 'csharp', '.swift': 'swift', '.kt': 'kotlin', '.php': 'php',
  '.vue': 'vue', '.svelte': 'svelte', '.sh': 'shell', '.bash': 'shell',
  '.md': 'markdown', '.rst': 'markdown', '.yaml': 'yaml', '.yml': 'yaml',
  '.json': 'json', '.toml': 'toml', '.sql': 'sql',
  '.graphql': 'graphql', '.gql': 'graphql', '.proto': 'protobuf',
  '.tf': 'terraform', '.tfvars': 'terraform',
  '.html': 'html', '.htm': 'html', '.css': 'css', '.scss': 'css', '.sass': 'css', '.less': 'css',
  '.xml': 'xml', '.cfg': 'config', '.ini': 'config', '.env': 'config',
  '.ps1': 'shell', '.bat': 'shell'
};

const KNOWN_FRAMEWORKS = {
  react: 'React', 'react-dom': 'React', '@angular/core': 'Angular', '@angular/common': 'Angular',
  vue: 'Vue', 'nuxt': 'Nuxt', '@nuxt/': 'Nuxt',
  svelte: 'Svelte', '@sveltejs/': 'Svelte',
  express: 'Express', fastify: 'Fastify', koa: 'Koa',
  next: 'Next.js', '@next/': 'Next.js',
  vite: 'Vite', '@vitejs/': 'Vite',
  vitest: 'Vitest', jest: 'Jest', '@jest/': 'Jest', 'mocha': 'Mocha',
  tailwindcss: 'Tailwind CSS',
  prisma: 'Prisma', typeorm: 'TypeORM', sequelize: 'Sequelize', mongoose: 'Mongoose',
  redux: 'Redux', zustand: 'Zustand', mobx: 'MobX',
  '@reduxjs/toolkit': 'Redux Toolkit',
  // Python
  django: 'Django', djangorestframework: 'Django REST Framework', fastapi: 'FastAPI',
  flask: 'Flask', sqlalchemy: 'SQLAlchemy', alembic: 'Alembic', celery: 'Celery',
  pydantic: 'Pydantic', uvicorn: 'Uvicorn', gunicorn: 'Gunicorn', aiohttp: 'Aiohttp',
  tornado: 'Tornado', starlette: 'Starlette', pytest: 'Pytest', hypothesis: 'Hypothesis',
  channels: 'Django Channels',
  // Go
  'github.com/gin-gonic/gin': 'Gin', 'github.com/labstack/echo': 'Echo',
  'github.com/gofiber/fiber': 'Fiber', 'github.com/go-chi/chi': 'Chi', 'gorm.io/gorm': 'GORM',
  // Rust
  'actix-web': 'Actix Web', axum: 'Axum', rocket: 'Rocket', diesel: 'Diesel', tokio: 'Tokio',
  serde: 'Serde', warp: 'Warp',
  // Java/Kotlin
  'spring-boot': 'Spring Boot', 'spring-web': 'Spring', 'spring-data': 'Spring Data',
  quarkus: 'Quarkus', micronaut: 'Micronaut', hibernate: 'Hibernate', junit: 'JUnit', ktor: 'Ktor'
};

function shouldExclude(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  for (const pattern of EXCLUDE_DIRS) {
    if (normalized.includes(pattern)) return true;
  }
  const ext = path.extname(filePath).toLowerCase();
  if (EXCLUDE_EXTENSIONS.includes(ext)) return true;
  const baseName = path.basename(filePath);
  if (EXCLUDE_FILES.includes(baseName)) return true;
  for (const pattern of EXCLUDE_PATHS) {
    if (normalized.includes(pattern)) return true;
  }
  if (normalized.includes('.generated.')) return true;
  if (baseName.startsWith('.eslintrc') || baseName.startsWith('.prettierrc')) return true;
  return false;
}

function getFileCategory(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  const ext = path.extname(filePath).toLowerCase();
  const baseName = path.basename(filePath);
  
  // Docs
  if (['.md', '.rst'].includes(ext) || (ext === '.txt' && baseName !== 'LICENSE')) return 'docs';
  
  // Infra
  if (baseName === 'Dockerfile' || baseName.match(/^docker-compose\./) || 
      normalized.includes('.github/workflows/') || normalized.includes('.gitlab-ci.yml') ||
      normalized.includes('.circleci/') || baseName === 'Jenkinsfile' ||
      baseName.match(/^.*\.k8s\.ya?ml$/) || normalized.includes('/k8s/') || normalized.includes('/kubernetes/') ||
      (ext === '.tf') || baseName === 'Makefile' || baseName === 'Vagrantfile' || baseName === 'Procfile') return 'infra';
  
  // Config
  if (['.yaml', '.yml', '.json', '.toml', '.xml', '.cfg', '.ini', '.env'].includes(ext) ||
      ['tsconfig.json', 'package.json', 'pyproject.toml', 'Cargo.toml', 'go.mod', 'Gemfile', 'Pipfile'].includes(baseName)) return 'config';
  
  // Data
  if (['.sql', '.graphql', '.gql', '.proto', '.prisma'].includes(ext) || baseName.includes('.schema.json') || ext === '.csv') return 'data';
  
  // Script
  if (['.sh', '.bash', '.ps1', '.bat'].includes(ext)) return 'script';
  
  // Markup
  if (['.html', '.htm', '.css', '.scss', '.sass', '.less'].includes(ext)) return 'markup';
  
  // Code (default)
  return 'code';
}

function getLanguage(filePath) {
  const baseName = path.basename(filePath);
  if (baseName === 'Dockerfile') return 'dockerfile';
  if (baseName === 'Makefile') return 'makefile';
  if (baseName === 'Jenkinsfile') return 'jenkinsfile';
  const ext = path.extname(filePath).toLowerCase();
  return EXT_TO_LANG[ext] || 'text';
}

function countLines(filePath) {
  try {
    const content = fs.readFileSync(path.join(projectRoot, filePath), 'utf8');
    return content.split('\n').length;
  } catch {
    return 0;
  }
}

function discoverFiles() {
  let files = [];
  try {
    const output = execSync('git ls-files', { cwd: projectRoot, encoding: 'utf8' });
    files = output.split('\n').filter(f => f.trim());
  } catch {
    console.error('git ls-files failed, falling back to directory scan');
    const walk = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relPath = path.relative(projectRoot, fullPath);
        if (shouldExclude(relPath)) continue;
        if (entry.isDirectory()) {
          walk(fullPath);
        } else {
          files.push(relPath.replace(/\\/g, '/'));
        }
      }
    };
    walk(projectRoot);
  }
  return files.filter(f => !shouldExclude(f) && f.trim());
}

// Parse package.json
function parsePackageJson() {
  const pkgPath = path.join(projectRoot, 'package.json');
  try {
    return JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  } catch {
    return null;
  }
}

// Parse go.mod
function parseGoMod() {
  const goModPath = path.join(projectRoot, 'go.mod');
  try {
    const content = fs.readFileSync(goModPath, 'utf8');
    const match = content.match(/^module\s+(.+)$/m);
    return { moduleName: match ? match[1] : '', content };
  } catch {
    return null;
  }
}

// Parse Cargo.toml
function parseCargoToml() {
  const cargoPath = path.join(projectRoot, 'Cargo.toml');
  try {
    const content = fs.readFileSync(cargoPath, 'utf8');
    const match = content.match(/^\[package\]\s*\n\s*name\s*=\s*"([^"]+)"/m);
    return { name: match ? match[1] : '', content };
  } catch {
    return null;
  }
}

// Parse requirements.txt
function parseRequirements() {
  const reqPath = path.join(projectRoot, 'requirements.txt');
  try {
    const content = fs.readFileSync(reqPath, 'utf8');
    return content.split('\n').map(l => l.split(/[=<>!]/)[0].trim()).filter(l => l);
  } catch {
    return [];
  }
}

// Parse pyproject.toml
function parsePyproject() {
  const pyprojPath = path.join(projectRoot, 'pyproject.toml');
  try {
    return fs.readFileSync(pyprojPath, 'utf8');
  } catch {
    return null;
  }
}

function detectFrameworks() {
  const frameworks = new Set();
  const files = fs.readdirSync(projectRoot);
  
  // Docker
  if (files.includes('Dockerfile')) frameworks.add('Docker');
  if (files.some(f => f.startsWith('docker-compose'))) frameworks.add('Docker Compose');
  
  // Terraform
  if (fs.existsSync(projectRoot) && fs.readdirSync(projectRoot, { recursive: true }).some(f => String(f).endsWith('.tf'))) {
    frameworks.add('Terraform');
  }
  
  // GitHub Actions
  if (fs.existsSync(path.join(projectRoot, '.github/workflows'))) frameworks.add('GitHub Actions');
  if (fs.existsSync(path.join(projectRoot, '.gitlab-ci.yml'))) frameworks.add('GitLab CI');
  if (files.includes('Jenkinsfile')) frameworks.add('Jenkins');
  
  // Package.json
  const pkg = parsePackageJson();
  if (pkg) {
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    for (const [name, version] of Object.entries(allDeps)) {
      if (KNOWN_FRAMEWORKS[name]) frameworks.add(KNOWN_FRAMEWORKS[name]);
      for (const [pattern, fw] of Object.entries(KNOWN_FRAMEWORKS)) {
        if (name.includes(pattern) && !name.startsWith('*')) frameworks.add(fw);
      }
    }
  }
  
  // Go.mod
  const goMod = parseGoMod();
  if (goMod) {
    for (const [pattern, fw] of Object.entries(KNOWN_FRAMEWORKS)) {
      if (goMod.content.includes(pattern)) frameworks.add(fw);
    }
  }
  
  // Cargo.toml
  const cargo = parseCargoToml();
  if (cargo) {
    for (const [pattern, fw] of Object.entries(KNOWN_FRAMEWORKS)) {
      if (cargo.content.includes(pattern)) frameworks.add(fw);
    }
  }
  
  // Requirements.txt
  const reqs = parseRequirements();
  for (const req of reqs) {
    if (KNOWN_FRAMEWORKS[req]) frameworks.add(KNOWN_FRAMEWORKS[req]);
  }
  
  // Pyproject.toml
  const pyproj = parsePyproject();
  if (pyproj) {
    for (const [pattern, fw] of Object.entries(KNOWN_FRAMEWORKS)) {
      if (pyproj.includes(pattern)) frameworks.add(fw);
    }
  }
  
  return Array.from(frameworks).sort();
}

function getProjectName() {
  const pkg = parsePackageJson();
  if (pkg && pkg.name) return pkg.name;
  
  const cargo = parseCargoToml();
  if (cargo && cargo.name) return cargo.name;
  
  const goMod = parseGoMod();
  if (goMod && goMod.moduleName) {
    return goMod.moduleName.split('/').pop();
  }
  
  // Try pyproject.toml
  try {
    const pyproj = fs.readFileSync(path.join(projectRoot, 'pyproject.toml'), 'utf8');
    const match = pyproj.match(/^\[project\]\s*\n\s*name\s*=\s*"([^"]+)"/m) || 
                  pyproj.match(/^\[tool\.poetry\]\s*\n\s*name\s*=\s*"([^"]+)"/m);
    if (match) return match[1];
  } catch {}
  
  return path.basename(projectRoot);
}

function extractImports(filePath) {
  const content = fs.readFileSync(path.join(projectRoot, filePath), 'utf8');
  const ext = path.extname(filePath).toLowerCase();
  const imports = [];
  const fileDir = path.dirname(filePath).replace(/\\/g, '/');
  
  if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
    // ES imports
    const esImports = content.match(/import\s+.*?\s+from\s+['"]([./].*?)['"]/g) || [];
    const requireCalls = content.match(/require\s*\(\s*['"]([./].*?)['"]\s*\)/g) || [];
    
    for (const imp of [...esImports, ...requireCalls]) {
      const match = imp.match(/['"]([./].*?)['"]$/);
      if (match) imports.push(match[1]);
    }
  } else if (ext === '.py') {
    // Python imports
    const pyImports = content.match(/^from\s+\.[^;]+|^import\s+\.[^;]+/gm) || [];
    for (const imp of pyImports) {
      const match = imp.match(/from\s+(\.[*]*)\s+import|^import\s+(\.[*]*)/);
      if (match) imports.push(match[1] || match[2]);
    }
  } else if (ext === '.go') {
    // Go imports
    const goMod = parseGoMod();
    const modulePath = goMod ? goMod.moduleName : '';
    const goImports = content.match(/import\s+(?:\([\s\S]*?\)|["'][^"']+["'])\s*[\s\S]*?["']([^"']+)["']/g) || [];
    for (const imp of goImports) {
      const match = imp.match(/["']([^"']+)["']/g);
      if (match) {
        for (const m of match) {
          const path = m.replace(/["']/g, '');
          if (path.startsWith(modulePath) || path.startsWith('./') || path.startsWith('../')) {
            imports.push(path);
          }
        }
      }
    }
  } else if (ext === '.rs') {
    // Rust imports
    const rustImports = content.match(/use\s+(crate|super)::[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
    for (const imp of rustImports) {
      const match = imp.match(/use\s+(crate|super)::(.+)/);
      if (match) imports.push(match[2]);
    }
    const modDecls = content.match(/mod\s+[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
    for (const mod of modDecls) {
      imports.push(mod.replace('mod ', ''));
    }
  }
  
  return imports;
}

function resolveImport(importPath, fromFile) {
  const fromDir = path.dirname(fromFile).replace(/\\/g, '/');
  let resolved;
  
  if (importPath.startsWith('./') || importPath.startsWith('../')) {
    resolved = path.posix.join(fromDir, importPath);
  } else if (importPath.startsWith('crate::') || importPath.startsWith('super::')) {
    resolved = importPath;
  } else {
    return null;
  }
  
  // Normalize
  const parts = resolved.split('/').filter(p => p !== '.' && p !== '');
  const normalized = [];
  for (const part of parts) {
    if (part === '..') normalized.pop();
    else normalized.push(part);
  }
  resolved = normalized.join('/');
  
  // Try various extensions
  const extVariants = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.js', '/index.tsx', '/index.jsx', '.py', '.go', '.rs', '.rb'];
  
  for (const variant of extVariants) {
    const candidate = resolved + variant;
    if (discoveredFiles.has(candidate)) return candidate;
  }
  
  return null;
}

// Main execution
let discoveredFiles = new Set();

try {
  const files = discoverFiles();
  discoveredFiles = new Set(files);
  
  const fileList = files.map(f => ({
    path: f,
    language: getLanguage(f),
    sizeLines: countLines(f),
    fileCategory: getFileCategory(f)
  })).sort((a, b) => a.path.localeCompare(b.path));
  
  // Languages
  const languages = [...new Set(fileList.map(f => f.language))].sort();
  
  // Frameworks
  const frameworks = detectFrameworks();
  
  // Project name
  const name = getProjectName();
  
  // Description from package.json
  const pkg = parsePackageJson();
  const rawDescription = pkg?.description || '';
  
  // README
  let readmeHead = '';
  const readmePath = path.join(projectRoot, 'README.md');
  if (fs.existsSync(readmePath)) {
    const readmeContent = fs.readFileSync(readmePath, 'utf8');
    readmeHead = readmeContent.split('\n').slice(0, 10).join('\n');
  }
  
  // Complexity
  const totalFiles = fileList.length;
  let estimatedComplexity = 'small';
  if (totalFiles > 500) estimatedComplexity = 'very-large';
  else if (totalFiles > 150) estimatedComplexity = 'large';
  else if (totalFiles > 30) estimatedComplexity = 'moderate';
  
  // Import map
  const importMap = {};
  for (const file of fileList) {
    if (file.fileCategory !== 'code') {
      importMap[file.path] = [];
      continue;
    }
    
    try {
      const imports = extractImports(file.path);
      const resolved = [];
      for (const imp of imports) {
        const resolvedPath = resolveImport(imp, file.path);
        if (resolvedPath) resolved.push(resolvedPath);
      }
      importMap[file.path] = resolved;
    } catch {
      importMap[file.path] = [];
    }
  }
  
  const result = {
    scriptCompleted: true,
    name,
    rawDescription,
    readmeHead,
    languages,
    frameworks,
    files: fileList,
    totalFiles,
    estimatedComplexity,
    importMap
  };
  
  fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
  console.error('Scan complete: ' + totalFiles + ' files');
  process.exit(0);
  
} catch (err) {
  console.error('Fatal error:', err.message);
  process.exit(1);
}
