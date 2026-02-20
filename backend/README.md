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
  @prisma/client \
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
  typescript
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

## github

Before Adding to github make sure you have `gitignore` file.
If not then run: `npx gitignore node`, this will create the file.
