# Kora

Aplicación de gestión para asociaciones construida con Next.js, React, Prisma y Zustand.

## Stack

- Next.js 16
- React 19
- TypeScript
- Prisma
- Zustand
- Tailwind CSS

## Requisitos

- Node.js 20 o superior
- npm
- Una base de datos PostgreSQL accesible desde local

## Puesta en marcha

1. Instala dependencias:

```bash
npm install
```

2. Crea tu archivo de entorno a partir del ejemplo:

```powershell
Copy-Item .env.example .env
```

o en bash:

```bash
cp .env.example .env
```

3. Rellena al menos `LOCAL_DATABASE_URL` en `.env`.

4. Genera el cliente de Prisma y arranca la app:

```bash
npm run dev
```

La aplicación queda disponible en `http://localhost:3000`.

## Variables de entorno

- `LOCAL_DATABASE_URL`: conexión principal para desarrollo local.
- `DATABASE_URL`: conexión a la base publicada o al entorno de hosting.
- `KORA_LOG_DATABASE_TARGET`: activa logs del destino de Prisma cuando vale `1`.

La lógica de resolución de la conexión está en `lib/database-url.ts`.

## Scripts útiles

```bash
npm run dev
npm run lint
npm run build
npm run migrate:deploy
```

## Estado del repositorio

- `.env`, `.next`, `node_modules`, `generated` y otros artefactos locales están ignorados por git.
- `npm run lint` debe quedar sin errores antes de publicar cambios.
- `npm run build` verifica la compilación de producción.

## Notas

- El proyecto no incluye una suite de tests automatizados todavía.
- Si vas a publicar el repositorio, revisa que tu `.env` local no salga del equipo y rota credenciales si alguna vez se expusieron fuera de git.
