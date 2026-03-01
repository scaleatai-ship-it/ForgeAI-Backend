
```
backend
├─ Dockerfile
├─ package-lock.json
├─ package.json
├─ prisma
│  ├─ migration_lock.toml
│  ├─ migrations
│  │  └─ 20260225000000_init
│  │     └─ migration.sql
│  └─ schema.prisma
├─ src
│  ├─ config
│  │  ├─ env.ts
│  │  ├─ prisma.ts
│  │  ├─ redis.ts
│  │  └─ socket.ts
│  ├─ controllers
│  │  ├─ admin.controller.ts
│  │  ├─ auth.controller.ts
│  │  ├─ billing.controller.ts
│  │  ├─ dashboard.controller.ts
│  │  ├─ deployment.controller.ts
│  │  ├─ deployments.controller.ts
│  │  ├─ generation.controller.ts
│  │  ├─ projects.controller.ts
│  │  └─ settings.controller.ts
│  ├─ middleware
│  │  ├─ auth.middleware.ts
│  │  ├─ error.middleware.ts
│  │  └─ validation.middleware.ts
│  ├─ queue
│  │  └─ generation.queue.ts
│  ├─ routes
│  │  ├─ auth.routes.ts
│  │  ├─ billing.routes.ts
│  │  ├─ dashboard.routes.ts
│  │  ├─ deployment.routes.ts
│  │  ├─ deployments.routes.ts
│  │  ├─ generation.routes.ts
│  │  ├─ index.ts
│  │  ├─ projects.routes.ts
│  │  └─ settings.routes.ts
│  ├─ server.ts
│  ├─ services
│  │  ├─ anthropic.service.ts
│  │  ├─ auth.service.ts
│  │  ├─ billing.service.ts
│  │  ├─ dashboard.service.ts
│  │  ├─ deployment.service.ts
│  │  ├─ email.service.ts
│  │  ├─ generation.service.ts
│  │  ├─ s3.service.ts
│  │  └─ settings.service.ts
│  ├─ types
│  │  ├─ api.ts
│  │  └─ express.d.ts
│  └─ utils
│     ├─ async-handler.ts
│     ├─ errors.ts
│     ├─ file-tree.ts
│     ├─ jwt.ts
│     └─ params.ts
└─ tsconfig.json

```