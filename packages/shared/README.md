# @eak/shared — Schema & DTO lintas-service

Sumber kebenaran untuk Zod schema & DTO yang dipakai `@eak/api`, `@eak/worker`, dan `@eak/web`.

## Target struktur

```
packages/shared/
  package.json
  tsconfig.json
  src/
    index.ts
    schemas/
      auth.ts
      tenant.ts
      account.ts
      group.ts
      campaign.ts
      broadcast.ts
      billing.ts
      pakasir.ts
    jobs/
      telegram.ts             # payload schema untuk queue telegram:*
      billing.ts
      reports.ts
    types/
      pagination.ts
      api-error.ts
    util/
      jitter.ts               # jitter(min,max) determinisik dengan seed opsional
      time.ts
```

## Aturan

* Schema diekspor sebagai Zod object + inferred type: `export type Foo = z.infer<typeof FooSchema>`.
* Tidak boleh import dari `@eak/api` / `@eak/worker` / `@eak/db`.
* Boleh import dari standard library + Zod + util murni.
