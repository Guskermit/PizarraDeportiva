# Pizarra Deportiva

Pizarra táctica de fútbol sala: registro de clubes, gestión de equipos (entrenadores y jugadores),
catálogo de jugadas y una pizarra interactiva para diseñar y reproducir jugadas paso a paso.

Construido con Next.js (App Router), [Once UI](https://once-ui.com), Supabase (Auth, Postgres, Storage)
y Konva/react-konva para el tablero táctico.

## Requisitos previos

- Node.js 20+
- Una cuenta y proyecto en [Supabase](https://supabase.com)

## 1. Instalar dependencias

```bash
npm install
```

## 2. Configurar Supabase

1. Crea un proyecto nuevo en Supabase.
2. Abre el editor SQL del proyecto y ejecuta el contenido de
   [supabase/migrations/0001_init.sql](supabase/migrations/0001_init.sql). Esto crea las tablas,
   los enums, las políticas de RLS, los triggers y el bucket de Storage `club-logos`.
3. En **Project Settings → API**, copia la `Project URL` y la `anon public` key.

## 3. Variables de entorno

Copia `.env.example` a `.env.local` y completa los valores:

```bash
cp .env.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=       # Project URL de Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # anon public key de Supabase
SUPABASE_SERVICE_ROLE_KEY=      # service_role key (solo servidor, no exponer al cliente)
NEXT_PUBLIC_SITE_URL=           # http://localhost:3000 en desarrollo
```

## 4. Ejecutar en desarrollo

```bash
npm run dev
```

La app estará disponible en `http://localhost:3000`.

## 5. Build de producción

```bash
npm run build
npm run start
```

## Despliegue en Vercel

1. Importa el repositorio en [Vercel](https://vercel.com/new).
2. Configura las mismas variables de entorno del paso 3 en el proyecto de Vercel
   (usa la URL pública de despliegue para `NEXT_PUBLIC_SITE_URL`).
3. Despliega. Vercel detecta automáticamente el framework Next.js.

## Solución de problemas

**Error `fetch failed` al registrar un club, iniciar sesión, etc.**

Si tu equipo está detrás de un proxy corporativo que inspecciona TLS (por ejemplo Zscaler,
Netskope), Node.js no confía en el certificado raíz de esa entidad por defecto y cualquier
llamada HTTPS (a Supabase, Google Fonts, etc.) falla con `fetch failed`. Los scripts `dev`,
`build` y `start` ya cargan un certificado extra desde `.certs/corporate-root-ca.pem` mediante
`NODE_EXTRA_CA_CERTS`. En macOS puedes generarlo (o regenerarlo) con:

```bash
npm run cert:export
```

Este comando exporta el certificado raíz de Zscaler desde el llavero del sistema. El archivo
`.certs/corporate-root-ca.pem` no se versiona (está en `.gitignore`); cada desarrollador lo genera
localmente. Si usas otro proxy corporativo, ajusta el nombre del certificado en el script
`cert:export` de `package.json`.

## Estructura funcional

- **Registro de club** (`/register-club`): crea el usuario administrador, el club y sube el logo.
- **Panel** (`/dashboard`): resumen según el rol (administrador de club, entrenador o jugador).
- **Club** (`/club`): alta de equipos y gestión de plantilla (entrenadores/jugadores por email).
- **Pizarra libre** (`/board`): tablero a pantalla completa para explicar jugadas en directo.
- **Situaciones** (`/situations`): creación y carga de posiciones preconfiguradas sin movimientos.
- **Jugadas** (`/plays`): catálogo propio, jugadas compartidas, compartir y copiar al catálogo.
- **Editor táctico** (`/plays/[id]/edit`): posicionamiento inicial y grabación de secuencias de
  movimiento (líneas discontinuas si el jugador no tiene el balón, sólidas si lo tiene).
- **Visor de jugadas** (`/plays/[id]/view`): reproducción animada con controles de
  reiniciar/anterior/reproducir-pausa/siguiente.

## Notas técnicas

- El tablero táctico usa Konva/react-konva, que requiere ejecutarse solo en cliente
  (`dynamic(..., { ssr: false })`) — ver `src/components/board/*Loader.tsx`.
- Row Level Security (RLS) está habilitado en todas las tablas; el acceso a jugadas compartidas
  se controla mediante la función `can_view_play` definida en la migración SQL.


**Design Engineers Club**: [Site](https://designengineers.club)

## Contribute

Please use the Once UI Core [GitHub repository](https://github.com/once-ui-system/core) for design system contributions.

## Sponsors

Once UI is an indie project. [Sponsor us](https://github.com/sponsors/once-ui-system) and get featured on our site!

## License

Distributed under the MIT License. See `LICENSE.txt` for more information.

## Deploy to Vercel
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fonce-ui-system%2Fnextjs-starter&project-name=nextjs-starter&repository-name=nextjs-starter&redirect-url=https%3A%2F%2Fgithub.com%2Fonce-ui-system%2Fnextjs-starter&demo-title=Next.js%20Starter&demo-description=Showcase%20your%20designers%20or%20developer%20portfolio&demo-url=https%3A%2F%2Fdemo.nextjs-starter.com&demo-image=%2F%2Fraw.githubusercontent.com%2Fonce-ui-system%2Fnextjs-starter%2Fmain%2Fpublic%2Fimages%2Fog%2Fhome.jpg)