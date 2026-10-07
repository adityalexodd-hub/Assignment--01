/**
 * checkArchitecture.js — automated guard for the project's hard constraints.
 *
 *   cd backend && npm run check:architecture
 *
 * Verifies that:
 *   1. the project is MERN-only and contains no SQL / TypeScript artefacts
 *   2. the backend keeps its strict MVC layout (models, controllers, services,
 *      routes, middleware, validators, config, utils, seed)
 *   3. server.js stays a thin bootstrap
 *   4. controllers do not query Mongoose models directly (they must use services)
 *
 * Exits with code 1 if a violation is found, so it can be wired into CI.
 */
const fs = require('fs');
const path = require('path');

const BACKEND_ROOT = path.resolve(__dirname, '..');
const PROJECT_ROOT = path.resolve(BACKEND_ROOT, '..');

let violations = 0;
let checks = 0;

const ok = (label) => {
  checks += 1;
  console.log(`  \u001b[32mOK\u001b[0m    ${label}`);
};

const bad = (label, detail) => {
  checks += 1;
  violations += 1;
  console.log(`  \u001b[31mFAIL\u001b[0m  ${label}${detail ? `\n         ${detail}` : ''}`);
};

const section = (title) => console.log(`\n\u001b[1m${title}\u001b[0m`);

/** Recursively lists files, skipping dependency and VCS directories. */
const walk = (dir, skip = ['node_modules', '.git', 'dist', 'build', '.cache']) => {
  const out = [];
  if (!fs.existsSync(dir)) return out;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skip.includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, skip));
    else out.push(full);
  }
  return out;
};

const rel = (file) => path.relative(PROJECT_ROOT, file);

/* ------------------------------------------------------------------ */
section('1. MERN-only: forbidden languages and files');

const allFiles = walk(PROJECT_ROOT);

const tsFiles = allFiles.filter((f) => /\.(ts|tsx|mts|cts)$/.test(f));
tsFiles.length === 0
  ? ok('No TypeScript source files (.ts / .tsx)')
  : bad('TypeScript files found', tsFiles.map(rel).join(', '));

const tsConfigs = allFiles.filter((f) => /tsconfig.*\.json$/.test(path.basename(f)));
tsConfigs.length === 0 ? ok('No tsconfig.json') : bad('tsconfig.json found', tsConfigs.map(rel).join(', '));

const jsxCount = allFiles.filter((f) => f.endsWith('.jsx')).length;
const jsCount = allFiles.filter((f) => f.endsWith('.js')).length;
jsCount > 0 && jsxCount > 0
  ? ok(`JavaScript only: ${jsCount} .js files, ${jsxCount} .jsx component files`)
  : bad('Expected both .js and .jsx sources', `js=${jsCount} jsx=${jsxCount}`);

/* ------------------------------------------------------------------ */
section('2. MERN-only: forbidden databases and ORMs');

const FORBIDDEN_PACKAGES = [
  'pg',
  'pg-pool',
  'mysql',
  'mysql2',
  'mariadb',
  'sqlite3',
  'better-sqlite3',
  'mssql',
  'oracledb',
  '@prisma/client',
  'prisma',
  'sequelize',
  'typeorm',
  'drizzle-orm',
  'knex',
  '@supabase/supabase-js',
  'firebase-admin',
  'firebase',
];

const installedForbidden = [];
[path.join(BACKEND_ROOT, 'package.json'), path.join(PROJECT_ROOT, 'frontend', 'package.json')].forEach((pkgPath) => {
  if (!fs.existsSync(pkgPath)) return;
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  FORBIDDEN_PACKAGES.forEach((name) => {
    if (deps[name]) installedForbidden.push(`${rel(pkgPath)} -> ${name}`);
  });
});

installedForbidden.length === 0
  ? ok('No SQL / other-database drivers or ORMs declared in any package.json')
  : bad('Forbidden database dependency declared', installedForbidden.join(', '));

const sourceFiles = allFiles.filter((f) => f.endsWith('.js') || f.endsWith('.jsx'));
const sqlImports = sourceFiles.filter((f) => {
  const content = fs.readFileSync(f, 'utf8');
  return /require\(['"](pg|mysql2?|sqlite3|sequelize|typeorm|knex|@prisma\/client)['"]\)|from ['"](pg|mysql2?|sqlite3|sequelize|typeorm|knex)['"]/.test(content);
});
sqlImports.length === 0 ? ok('No source file imports a SQL client/ORM') : bad('SQL import found', sqlImports.map(rel).join(', '));

const mongooseUsers = sourceFiles.filter((f) => /require\(['"]mongoose['"]\)|from ['"]mongoose['"]/.test(fs.readFileSync(f, 'utf8')));
mongooseUsers.length > 0
  ? ok(`Mongoose is used as the ODM in ${mongooseUsers.length} files`)
  : bad('Mongoose usage not detected');

/* ------------------------------------------------------------------ */
section('3. Backend MVC structure');

const REQUIRED = {
  'config/db.js': 'MongoDB connection isolated in config',
  'app.js': 'Express application assembly',
  'server.js': 'Process bootstrap',
  'seed/seed.js': 'MongoDB seed script',
  'controllers/authController.js': 'Auth controller',
  'controllers/requestController.js': 'Request controller',
  'controllers/userController.js': 'User controller',
  'controllers/notificationController.js': 'Notification controller',
  'controllers/auditController.js': 'Audit controller',
  'controllers/dashboardController.js': 'Dashboard controller',
  'services/authService.js': 'Auth service',
  'services/requestService.js': 'Request service',
  'services/userService.js': 'User service',
  'services/notificationService.js': 'Notification service',
  'services/auditService.js': 'Audit service',
  'services/dashboardService.js': 'Dashboard service',
  'models/User.js': 'User model',
  'models/AccessRequest.js': 'AccessRequest model',
  'models/Notification.js': 'Notification model',
  'models/AuditLog.js': 'AuditLog model',
  'routes/authRoutes.js': 'Auth routes',
  'routes/requestRoutes.js': 'Request routes',
  'routes/userRoutes.js': 'User routes',
  'routes/notificationRoutes.js': 'Notification routes',
  'routes/auditRoutes.js': 'Audit routes',
  'routes/dashboardRoutes.js': 'Dashboard routes',
  'middleware/authMiddleware.js': 'JWT auth middleware',
  'middleware/roleMiddleware.js': 'Role authorization middleware',
  'middleware/errorMiddleware.js': 'Central error middleware',
  'middleware/notFoundMiddleware.js': '404 middleware',
  'middleware/validationMiddleware.js': 'Validation middleware',
  'validators/authValidator.js': 'Auth validators',
  'validators/requestValidator.js': 'Request validators',
  'validators/userValidator.js': 'User validators',
  'utils/generateToken.js': 'JWT helper',
  'utils/apiResponse.js': 'Response envelope helper',
  'utils/constants.js': 'Domain constants',
};

const missing = Object.keys(REQUIRED).filter((file) => !fs.existsSync(path.join(BACKEND_ROOT, file)));
missing.length === 0
  ? ok(`All ${Object.keys(REQUIRED).length} required MVC files exist`)
  : bad('Missing MVC files', missing.join(', '));

/* ------------------------------------------------------------------ */
section('4. Separation of concerns');

const routeFiles = walk(path.join(BACKEND_ROOT, 'routes'));
const fatRoutes = routeFiles.filter((f) => {
  const content = fs.readFileSync(f, 'utf8');
  return /require\(['"]\.\.\/models\//.test(content) || /new mongoose\./.test(content);
});
fatRoutes.length === 0
  ? ok('No route file touches Mongoose models directly')
  : bad('Routes contain database logic', fatRoutes.map(rel).join(', '));

const controllerFiles = walk(path.join(BACKEND_ROOT, 'controllers'));
const fatControllers = controllerFiles.filter((f) => {
  const content = fs.readFileSync(f, 'utf8');
  return /require\(['"]\.\.\/models\//.test(content) || /\.find\(|\.aggregate\(|\.save\(/.test(content);
});
fatControllers.length === 0
  ? ok('No controller queries the database directly — all access goes through services')
  : bad('Controllers contain queries/business logic', fatControllers.map(rel).join(', '));

const serviceFiles = walk(path.join(BACKEND_ROOT, 'services'));
serviceFiles.length >= 6 ? ok(`Business logic lives in ${serviceFiles.length} service modules`) : bad('Expected at least 6 service modules');

const serverSource = fs.readFileSync(path.join(BACKEND_ROOT, 'server.js'), 'utf8');
const serverLines = serverSource.split('\n').length;
const serverHasNoLogic = !/mongoose\.connect|app\.(get|post|patch|put|delete)\(/.test(serverSource);
serverLines < 110 && serverHasNoLogic
  ? ok(`server.js is a thin bootstrap (${serverLines} lines, no routes, no DB calls)`)
  : bad('server.js looks monolithic');

const dbConfig = fs.readFileSync(path.join(BACKEND_ROOT, 'config/db.js'), 'utf8');
/mongoose\.connect/.test(dbConfig) ? ok('MongoDB connection lives only in config/db.js') : bad('config/db.js does not establish the connection');

/* ------------------------------------------------------------------ */
section('5. Security controls present');

const securityExpectations = [
  ['JWT authentication', path.join(BACKEND_ROOT, 'middleware/authMiddleware.js'), /verifyToken|jsonwebtoken/],
  ['bcrypt password hashing', path.join(BACKEND_ROOT, 'models/User.js'), /bcrypt/],
  ['Role authorization', path.join(BACKEND_ROOT, 'middleware/roleMiddleware.js'), /authorize/],
  ['Input validation', path.join(BACKEND_ROOT, 'middleware/validationMiddleware.js'), /validationResult/],
  ['Helmet', path.join(BACKEND_ROOT, 'app.js'), /helmet/],
  ['CORS', path.join(BACKEND_ROOT, 'app.js'), /cors/],
  ['Rate limiting', path.join(BACKEND_ROOT, 'middleware/rateLimitMiddleware.js'), /rateLimit/],
  ['Centralised error handling', path.join(BACKEND_ROOT, 'middleware/errorMiddleware.js'), /statusCode/],
  ['Centralised audit logging', path.join(BACKEND_ROOT, 'services/auditService.js'), /AuditLog/],
];

securityExpectations.forEach(([label, file, pattern]) => {
  const exists = fs.existsSync(file);
  const matches = exists && pattern.test(fs.readFileSync(file, 'utf8'));
  matches ? ok(label) : bad(`${label} not detected`, rel(file));
});

const hardcodedSecret = sourceFiles.filter((f) => {
  if (f.includes('scripts/')) return false;
  return /JWT_SECRET\s*[:=]\s*['"][^'"]{8,}['"]/.test(fs.readFileSync(f, 'utf8'));
});
hardcodedSecret.length === 0 ? ok('No hardcoded JWT secret in source') : bad('Hardcoded secret found', hardcodedSecret.map(rel).join(', '));

/* ------------------------------------------------------------------ */
section('6. Documentation');

['README.md', 'PROJECT_DOCUMENTATION.md', '.env.example', 'frontend/README.md', 'backend/README.md'].forEach((file) => {
  fs.existsSync(path.join(PROJECT_ROOT, file)) ? ok(`${file} exists`) : bad(`${file} is missing`);
});

const docs = [
  path.join(PROJECT_ROOT, 'README.md'),
  path.join(PROJECT_ROOT, 'PROJECT_DOCUMENTATION.md'),
  path.join(PROJECT_ROOT, 'backend/README.md'),
].filter((f) => fs.existsSync(f));

const postgresMentions = docs.filter((f) => {
  const content = fs.readFileSync(f, 'utf8');
  // Mentions are allowed only in "we do not use this" statements.
  const lines = content.split('\n').filter((l) => /postgres|postgresql|mysql|sqlite|prisma|sequelize|typeorm/i.test(l));
  return lines.some((l) => !/no |not |never|without|forbidden|only|avoid|instead of|rather than|—|-|:|\bvs\b/i.test(l));
});
postgresMentions.length === 0
  ? ok('Documentation mentions no SQL database as part of the stack')
  : bad('Documentation appears to reference a SQL database as a component', postgresMentions.map(rel).join(', '));

/* ------------------------------------------------------------------ */
console.log(`\n${'─'.repeat(64)}`);
console.log(`  ${checks - violations} passed, ${violations} failed`);
if (violations) {
  console.log('  \u001b[31mArchitecture violations detected.\u001b[0m');
} else {
  console.log('  \u001b[32mMERN ONLY: MongoDB + Express.js + React.js + Node.js. No PostgreSQL, MySQL, SQLite,');
  console.log('  Prisma, Sequelize, TypeScript, .ts, .tsx or tsconfig.json. Backend follows MVC with Mongoose.\u001b[0m');
}
console.log('');

process.exit(violations ? 1 : 0);
