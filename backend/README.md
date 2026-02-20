## Dependencies

    -

## Implementation Details

1. `npm init -y`
2. install:

```js
  npm install \
  bcrypt \
  cookie-parser \
  cors \
  date-fns-tz \
  dotenv \
  express \
  jsonwebtoken \
  @prisma/client @prisma/adapter-pg pg \
  passport \
  passport-jwt \
  qrcode \
  resend \
  speakeasy \
  zod
```

```js
    npm install -D \
  @types/bcrypt \
  @types/cookie-parser \
  @types/cors \
  @types/dotenv \
  @types/express \
  @types/jsonwebtoken \
  @types/passport \
  @types/passport-jwt \
  @types/qrcode \
  @types/speakeasy \
  prisma \
  ts-node-dev \
  typescript \
  tsx
```

3. Initalize TS: `npx tsc --init`
   - create `tsconfig.json` file to control TS behaviours
   - add

   ```json
         "compilerOptions": {
        //..others
        // File Layout
        "rootDir": "./src",
        "outDir": "./dist",
         },
        // .. others
        "include": ["src/**/*.ts", "@types"],
        "exclude": ["node_modules", "test", "dist", "**/*spec.ts"]
   ```

   - update package.json file

     ```json

     "scripts": {
         "dev": "tsx watch src/index.ts",
         "build": "tsc && cp ./package.json ./dist",
         "start": "node dist/index.js"
     },
     ```

## github

Before Adding to github make sure you have `gitignore` file.
If not then run: `npx gitignore node`, this will create the file.

## Db connection

1. init prisma: `npx prisma init`
   - creates prisma/schema.prisma, prisma.config.ts and .env with DATABASE_URL
   - replace the DATABASE_URL with your desired url: either cloud or local

2. create `/src/common/lib/prisma.ts` for prisma client
   - copy paste the code this create only one prisma client
   - to get prisma client you need to run `npx primsa generate`
     - this creates `/src/generated` files which contains all the prisma schemas TS and clients
     - use that or import for `/src/common/lib/prisma.ts` to get prismaClient

## Middleware `src/middleware`

- create errohandler middleware
- also create asyncHandler to drill down the error to the errorhandlerMiddleware if any error occurs in any route.
  - asynchandler warps the controller and if error occurs it passes error to next part
