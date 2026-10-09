# AGENTS.md

Guidance for AI coding agents (Claude Code, Cursor, and others) working in this repository. This is the single source of agent rules. `CLAUDE.md` imports it. Tool-specific command files must not repeat it.

This is the Talvio media service: a Serverless Framework app on AWS. It issues S3 presigned upload URLs, stores media records in DynamoDB, and marks a record uploaded when the object lands in S3.

`README.md` has the API, stage, and SSM detail. `docs/openapi.yml` is the HTTP contract.

## Commands

```bash
yarn install
yarn start                         # serverless-offline
yarn lint
yarn typecheck
yarn test:integration              # Jest; yarn test:coverage runs the same suite
yarn test:integration src/functions/presign/handler.spec.ts
```

Node.js 22+ and Yarn 4. There is no separate format check.

## Deploy

`development` deploys stage `dev`. `main` deploys stage `prod`. GitHub Actions does that on push. Do not deploy prod unless asked.

Local `yarn sls deploy --stage dev` needs a Serverless Framework 4 access key or license key (`SERVERLESS_ACCESS_KEY` or `SERVERLESS_LICENSE_KEY`).

The media bucket already exists (`talvio-media-dev` / `talvio-media-prod`). The S3 notification stays on this service (`existing: true`). Do not add a bucket notification elsewhere.

Lambda environment comes from stage config and SSM. See the Stage / SSM table in `README.md`. `SUPABASE_URL` is the issuer base for the public JWT authorizer.

## Layout

`serverless.ts` is the service config. Functions are exported from `src/functions/index.ts`. A function that is not exported there is not deployed.

```
src/functions/<name>/
  index.ts          # handler path and events
  handler.ts        # Middy handler
  schema.ts         # request JSON schema, when the route validates a body
  handler.spec.ts
src/lib/
  repositories/     # DynamoDB
  services/
  middlewares/
  clients/          # CloudFront
  types.ts
```

Path alias `@lib/*` maps to `src/lib/*`.

## HTTP

Public routes use the TOKEN authorizer in `src/functions/authorizer/`:

- `POST /public/{userId}/presign`
- `GET /{userId}/records`

Attach `supabaseJwtHttpAuthorizer` from `src/functions/authorizer/index.ts`. The authorizer verifies the Supabase access token against `${SUPABASE_URL}/auth/v1/.well-known/jwks.json` (`iss` is `${SUPABASE_URL}/auth/v1`, `aud` is `authenticated`) and sets `context.sub`. API Gateway caches that result by the `Authorization` header for 30 seconds, so the allow policy covers the whole stage (`apiId/stage/*/*`), not the inbound `methodArn`. `authorization.middleware.ts` then requires `pathParameters.userId === requestContext.authorizer.sub`. Public handlers use `publicValidationMiddleware` with that middleware.

Private routes use an API key (`private: true`, header `X-API-KEY`):

- `POST /presign/{userId}`
- `POST /private/{userId}/presign`

Private handlers use `privateValidationMiddleware` and do not run `authorizationMiddleware`.

The S3 handler (`s3:ObjectCreated:*` on the existing media bucket) has no API Gateway authorizer. It loads the media row by object key and calls `validate` when the status is `pending`.

## Tests

Jest, co-located `src/**/*.spec.ts`. Mocks live in `src/tests/mocks/`. New repository, service, authorizer, or middleware behavior ships with a spec.

## Workflow

Feature branches come from `origin/development` and merge back there. Unless told otherwise, diff and review against `origin/development` (`git diff origin/development...HEAD`). `main` is production and lags behind.

## Reusable workflows

`agents/commands/*.md` hold the workflows the team runs by name:

| Workflow | File |
|---|---|
| Start a Linear issue | `agents/commands/start-issue.md` |
| Plan work | `agents/commands/plan.md` |
| Review a plan | `agents/commands/review-plan.md` |
| Review changes | `agents/commands/review.md` |
| Write a commit message | `agents/commands/commit-message.md` |

`.claude/commands/` and `.cursor/commands/` are thin wrappers that point at these files, so the slash commands behave the same in both tools. Edit the file in `agents/commands/`, never the wrapper.

## Commit messages

Conventional Commits. Follow `agents/commands/start-issue.md` for Linear traceability.

```
<type>(<scope>): <imperative description>

[optional body]

Refs: MDI-123
```

- **Types:** `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `build`, `ci`, `chore`, `style`, `revert`.
- **Scope:** short, lowercase, the affected area. Omit it when the change spans the whole project.
- **Description:** imperative, starts lowercase, no trailing period, first line at most 72 characters. Describe the code change. No secrets.
- **Breaking change:** `!` after the type or scope, or a `BREAKING CHANGE:` footer.
- **Footer:** `Refs: MDI-123` only when that identifier was given or is reliably known. Do not put the identifier in the subject.

Before creating a commit:

1. Review the complete diff.
2. Keep one logical change per commit where practical.
3. Run the relevant tests, lint, and typecheck.
4. Do not commit if validation fails, unless explicitly authorized.

## Linear

Tickets use `MDI-*` identifiers. Do not create or modify issues unless the user explicitly asks or the active command says to. The exception is status: update it when the work changes it.

Do not invent a Linear project id. When `.cursor/rules/linear.mdc` is present, follow it.
